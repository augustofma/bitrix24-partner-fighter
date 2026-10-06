import { KO_KNOCKBACK_MULTIPLIER, KO_LAUNCH_SPEED } from '../../config/simulation';
import { AttackInputBuffer } from './AttackInputBuffer';
import { integrateFighterPhysics } from './fighterPhysics';
import { SPECIAL_METER } from '../../config/special';
import type {
  AttackConfig,
  FighterConfig,
  FighterStateId,
  SpecialMoveConfig,
} from '../../types/fighter';
import type { Direction, Rect, Vec2 } from '../../types/geometry';
import type { InputFrame, InputState } from '../../types/input';
import { toWorldRect } from '../geometry';
import { horizontalAxis } from '../input';
import { attackPhaseAt, totalAttackFrames, type AttackPhase } from './attackFrames';
import {
  ATTACK_SLOTS,
  ATTACK_STATE_SET,
  BLOCK_STATES,
  FREE_GROUND_STATES,
  groundStance,
  LANDING_STATES,
  hurtboxFor,
  pushboxFor,
} from './fighterStates';
import type { ReadonlyFighter } from './ReadonlyFighter';

/**
 * One fighter in a match: state machine + physics + boxes.
 *
 * Generic on purpose: everything character-specific comes from `FighterConfig`.
 * It knows nothing about who controls it (player, CPU, network) nor how it is drawn.
 * Advance it with `update(input)` exactly once per simulation frame.
 */
export class Fighter implements ReadonlyFighter {
  readonly config: FighterConfig;
  health: number;
  private meter = 0;
  readonly position: Vec2;
  readonly velocity: Vec2 = { x: 0, y: 0 };
  direction: Direction;

  private currentState: FighterStateId = 'idle';
  private framesInState = 0;
  private attack: AttackConfig | null = null;
  private attackConnected = false;
  /** Remaining hitstun (state 'hurt') or blockstun (block states). */
  private stunFrames = 0;
  private readonly inputBuffer = new AttackInputBuffer();
  /** One air attack per jump: no mid-air spam. Reset on landing. */
  private airAttackUsed = false;
  private lastX: number;
  private readonly groundY: number;

  constructor(config: FighterConfig, spawn: Readonly<Vec2>, direction: Direction, groundY: number) {
    this.config = config;
    this.health = config.stats.maxHealth;
    this.position = { x: spawn.x, y: spawn.y };
    this.direction = direction;
    this.groundY = groundY;
    this.lastX = spawn.x;
  }

  // ---------------------------------------------------------------- read model

  get state(): FighterStateId {
    return this.currentState;
  }

  get specialMeter(): number {
    return this.meter;
  }

  changeSpecialMeter(amount: number): void {
    this.meter = Math.max(0, Math.min(SPECIAL_METER.max, this.meter + amount));
  }

  private get activeSpecial(): SpecialMoveConfig | undefined {
    return this.config.specials.find((move) => move === this.attack);
  }

  get stateFrame(): number {
    return this.framesInState;
  }

  get activeAttack(): AttackConfig | null {
    return this.attack;
  }

  get attackPhase(): AttackPhase | null {
    return this.attack ? attackPhaseAt(this.attack, this.framesInState) : null;
  }

  get maxHealth(): number {
    return this.config.stats.maxHealth;
  }

  get movementSpeed(): number {
    return this.config.stats.walkSpeed;
  }

  get jumpForce(): number {
    return this.config.stats.jumpForce;
  }

  /** X position before the last update (used by the arena to know who moved). */
  get previousX(): number {
    return this.lastX;
  }

  get isAirborne(): boolean {
    return this.position.y < this.groundY;
  }

  get isBlocking(): boolean {
    return BLOCK_STATES.has(this.currentState);
  }

  get isKnockedOut(): boolean {
    return this.currentState === 'knockout';
  }

  /**
   * Whether the fighter may turn to face the opponent this frame. Never in the air nor during
   * an attack, so a cross-up never flips a jump or an attack (and its hitbox) halfway.
   */
  get canTurn(): boolean {
    if (this.isAirborne) return false;
    return FREE_GROUND_STATES.has(this.currentState) || this.isBlocking;
  }

  // ---------------------------------------------------------------- simulation

  update(input: InputFrame): void {
    this.lastX = this.position.x;
    this.framesInState++;
    this.inputBuffer.update(input.pressed);
    this.runStateLogic(input.held);
    this.integratePhysics();
  }

  faceTowards(targetX: number): void {
    const dx = targetX - this.position.x;
    if (Math.abs(dx) > 1) this.direction = dx > 0 ? 1 : -1;
  }

  /** Vulnerable area in world space, or null when invulnerable. */
  getHurtbox(): Rect | null {
    if (this.currentState === 'knockout') return null;
    const box = hurtboxFor(this.config.boxes, this.currentState, this.isAirborne);
    return toWorldRect(box, this.position, this.direction);
  }

  /** Damage area in world space while an attack is active and has not connected yet. */
  getHitbox(): Rect | null {
    if (!this.attack || this.attackConnected || this.attackPhase !== 'active') return null;
    return toWorldRect(this.attack.hitbox, this.position, this.direction);
  }

  /** Body used to keep fighters apart (see pushboxFor for the cross-up rule). */
  getPushbox(): Rect | null {
    if (this.currentState === 'knockout') return null;
    const box = pushboxFor(this.config.boxes, this.currentState, this.isAirborne);
    return toWorldRect(box, this.position, this.direction);
  }

  /** Each attack can hit only once. */
  markAttackConnected(): void {
    this.attackConnected = true;
  }

  applyHit(attack: AttackConfig, pushDirection: Direction): void {
    this.health = Math.max(0, this.health - attack.damage);
    this.inputBuffer.clear();
    if (this.health === 0) {
      this.setState('knockout', true);
      this.velocity.x = pushDirection * attack.knockback * KO_KNOCKBACK_MULTIPLIER;
      this.velocity.y = -KO_LAUNCH_SPEED;
      return;
    }
    this.setState('hurt', true);
    this.stunFrames = attack.hitstunFrames;
    this.velocity.x = pushDirection * attack.knockback;
  }

  applyBlock(attack: AttackConfig, pushDirection: Direction): void {
    // Chip damage can never knock out.
    this.health = Math.max(1, this.health - attack.chipDamage);
    // Keep the guard posture (standing or crouching) during blockstun.
    this.setState(this.currentState === 'crouchBlock' ? 'crouchBlock' : 'block', true);
    this.stunFrames = attack.blockstunFrames;
    this.velocity.x = pushDirection * attack.blockPushback;
  }

  /** Strikes the victory pose. Returns false if not possible yet (e.g. still airborne). */
  trySetVictory(): boolean {
    if (this.isKnockedOut || this.isAirborne) return false;
    this.setState('victory');
    this.velocity.x = 0;
    return true;
  }

  /**
   * Back to a fresh round: full health at the spawn point, idle, no velocity, stun, attack or
   * buffered input. The special meter is deliberately kept (it carries across rounds).
   */
  resetForRound(spawn: Readonly<Vec2>, direction: Direction): void {
    this.health = this.config.stats.maxHealth;
    this.position.x = spawn.x;
    this.position.y = spawn.y;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.direction = direction;
    this.lastX = spawn.x;
    this.setState('idle', true);
    this.attack = null;
    this.attackConnected = false;
    this.stunFrames = 0;
    this.inputBuffer.clear();
    this.airAttackUsed = false;
  }

  // ---------------------------------------------------------------- internals

  private setState(next: FighterStateId, restart = false): void {
    if (next === this.currentState && !restart) return;
    this.currentState = next;
    this.framesInState = 0;
    if (!ATTACK_STATE_SET.has(next)) this.attack = null;
  }

  private runStateLogic(held: Readonly<InputState>): void {
    switch (this.currentState) {
      case 'idle':
      case 'walk':
      case 'crouch':
        this.handleFreeGroundState(held);
        return;
      case 'punch':
      case 'kick':
      case 'crouchPunch':
      case 'crouchKick':
        // Re-reads the input on the same frame: still holding ↓ goes straight back to crouch
        // (or a low guard / another crouching attack), never through a standing frame.
        if (this.attack && this.framesInState >= totalAttackFrames(this.attack)) {
          this.handleFreeGroundState(held);
        }
        return;
      case 'jump':
        this.handleJumpState();
        return;
      case 'special':
        if (this.attack && this.framesInState >= totalAttackFrames(this.attack)) {
          if (this.isAirborne) this.setState('jump');
          else this.handleFreeGroundState(held);
        } else if (!this.isAirborne) {
          this.velocity.x =
            this.attackPhase === 'recovery'
              ? 0
              : this.direction * (this.activeSpecial?.advanceSpeed ?? 0);
        }
        return;
      case 'airPunch':
      case 'airKick':
        // Finished in the air: keep falling. Landing (integratePhysics) ends it otherwise.
        if (this.attack && this.framesInState >= totalAttackFrames(this.attack)) {
          this.setState('jump');
        }
        return;
      case 'block':
      case 'crouchBlock':
        if (this.stunFrames > 0) this.stunFrames--;
        else this.handleFreeGroundState(held);
        return;
      case 'hurt':
        if (this.stunFrames > 0) this.stunFrames--;
        else if (!this.isAirborne) this.handleFreeGroundState(held);
        return;
      case 'knockout':
      case 'victory':
        // Terminal.
        return;
    }
  }

  /** Decision tree for a grounded fighter that is free to act. Order = priority. */
  private handleFreeGroundState(held: Readonly<InputState>): void {
    if (this.tryBufferedSpecial()) return;
    if (this.inputBuffer.current) {
      if (this.inputBuffer.current.button === 'special') return;
      const slot = ATTACK_SLOTS[groundStance(held.down)][this.inputBuffer.current.button];
      this.inputBuffer.clear();
      this.startAttack(this.config.attacks[slot]);
      this.velocity.x = 0;
      return;
    }
    if (held.block) {
      // Guarding never walks; holding down keeps the low guard.
      this.setState(held.down ? 'crouchBlock' : 'block');
      return;
    }
    const axis = horizontalAxis(held);
    if (held.up) {
      this.setState('jump');
      this.airAttackUsed = false;
      this.velocity.y = -this.config.stats.jumpForce;
      this.velocity.x = axis * this.config.stats.jumpHorizontalSpeed;
      return;
    }
    if (held.down) {
      this.setState('crouch');
      this.velocity.x = 0;
      return;
    }
    if (axis !== 0) {
      this.setState('walk');
      const { walkSpeed, backWalkSpeed } = this.config.stats;
      this.velocity.x = axis * (axis === this.direction ? walkSpeed : backWalkSpeed);
      return;
    }
    this.setState('idle');
    this.velocity.x = 0;
  }

  /** Airborne and free: an attack press (or buffered press) starts the air attack. */
  private handleJumpState(): void {
    if (!this.inputBuffer.current || this.airAttackUsed || !this.isAirborne) return;
    if (this.tryBufferedSpecial()) {
      this.airAttackUsed = true;
      return;
    }
    if (!this.inputBuffer.current || this.inputBuffer.current.button === 'special') return;
    const slot = ATTACK_SLOTS.air[this.inputBuffer.current.button];
    this.inputBuffer.clear();
    this.airAttackUsed = true;
    // Velocity is untouched: gravity and the jump's horizontal motion continue.
    this.startAttack(this.config.attacks[slot]);
  }

  private startAttack(attack: AttackConfig): void {
    this.setState(attack.state, true);
    this.attack = attack;
    this.attackConnected = false;
  }

  private tryBufferedSpecial(): boolean {
    if (this.inputBuffer.current?.button !== 'special') return false;
    this.inputBuffer.clear();
    const move = this.config.specials.find(
      (candidate) =>
        (!candidate.groundOnly || !this.isAirborne) && candidate.meterCost <= this.meter,
    );
    if (!move) return false;
    this.changeSpecialMeter(-move.meterCost);
    this.startAttack(move);
    if (!this.isAirborne) this.velocity.x = this.direction * move.advanceSpeed;
    return true;
  }

  /** Touching the ground ends jumps and air attacks (and therefore their hitboxes). */
  private land(): void {
    this.airAttackUsed = false;
    if (!LANDING_STATES.has(this.currentState) && this.currentState !== 'special') return;
    this.setState('idle');
    this.velocity.x = 0;
  }

  private integratePhysics(): void {
    integrateFighterPhysics(
      this.position,
      this.velocity,
      this.groundY,
      () => this.currentState,
      () => this.land(),
    );
  }
}
