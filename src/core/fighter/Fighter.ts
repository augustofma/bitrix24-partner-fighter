import {
  GRAVITY,
  GROUND_FRICTION,
  INPUT_BUFFER_FRAMES,
  KO_KNOCKBACK_MULTIPLIER,
  KO_LAUNCH_SPEED,
  MIN_SLIDE_SPEED,
} from '../../config/simulation';
import type {
  AttackButton,
  AttackConfig,
  FighterConfig,
  FighterStateId,
} from '../../types/fighter';
import type { Direction, Rect, Vec2 } from '../../types/geometry';
import type { InputFrame, InputState } from '../../types/input';
import { toWorldRect } from '../geometry';
import { horizontalAxis } from '../input';
import { attackPhaseAt, totalAttackFrames, type AttackPhase } from './attackFrames';
import type { ReadonlyFighter } from './ReadonlyFighter';

const ATTACK_STATES: ReadonlySet<FighterStateId> = new Set<FighterStateId>(['punch', 'kick']);
const FREE_GROUND_STATES: ReadonlySet<FighterStateId> = new Set<FighterStateId>([
  'idle',
  'walk',
  'crouch',
]);

interface BufferedAttack {
  button: AttackButton;
  framesLeft: number;
}

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
  readonly position: Vec2;
  readonly velocity: Vec2 = { x: 0, y: 0 };
  direction: Direction;

  private currentState: FighterStateId = 'idle';
  private framesInState = 0;
  private attack: AttackConfig | null = null;
  private attackConnected = false;
  /** Remaining hitstun (state 'hurt') or blockstun (state 'block'). */
  private stunFrames = 0;
  private bufferedAttack: BufferedAttack | null = null;
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
    return this.currentState === 'block';
  }

  get isKnockedOut(): boolean {
    return this.currentState === 'knockout';
  }

  /** Whether the fighter may turn to face the opponent this frame. */
  get canTurn(): boolean {
    return !this.isAirborne && (FREE_GROUND_STATES.has(this.currentState) || this.isBlocking);
  }

  // ---------------------------------------------------------------- simulation

  update(input: InputFrame): void {
    this.lastX = this.position.x;
    this.framesInState++;
    this.bufferAttackInput(input.pressed);
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
    const { boxes } = this.config;
    let box = boxes.standing;
    if (this.isAirborne) box = boxes.airborne;
    else if (this.currentState === 'crouch') box = boxes.crouching;
    return toWorldRect(box, this.position, this.direction);
  }

  /** Damage area in world space while an attack is active and has not connected yet. */
  getHitbox(): Rect | null {
    if (!this.attack || this.attackConnected || this.attackPhase !== 'active') return null;
    return toWorldRect(this.attack.hitbox, this.position, this.direction);
  }

  /** Body used to keep fighters apart. */
  getPushbox(): Rect | null {
    const hurtbox = this.getHurtbox();
    if (!hurtbox) return null;
    const width = this.config.boxes.pushWidth;
    return { x: this.position.x - width / 2, y: hurtbox.y, width, height: hurtbox.height };
  }

  /** Each attack can hit only once. */
  markAttackConnected(): void {
    this.attackConnected = true;
  }

  applyHit(attack: AttackConfig, pushDirection: Direction): void {
    this.health = Math.max(0, this.health - attack.damage);
    this.bufferedAttack = null;
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
    this.setState('block', true);
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

  // ---------------------------------------------------------------- internals

  private setState(next: FighterStateId, restart = false): void {
    if (next === this.currentState && !restart) return;
    this.currentState = next;
    this.framesInState = 0;
    if (!ATTACK_STATES.has(next)) this.attack = null;
  }

  private bufferAttackInput(pressed: Readonly<InputState>): void {
    if (pressed.punch) this.bufferedAttack = { button: 'punch', framesLeft: INPUT_BUFFER_FRAMES };
    else if (pressed.kick)
      this.bufferedAttack = { button: 'kick', framesLeft: INPUT_BUFFER_FRAMES };
    else if (this.bufferedAttack && --this.bufferedAttack.framesLeft <= 0)
      this.bufferedAttack = null;
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
        if (this.attack && this.framesInState >= totalAttackFrames(this.attack)) {
          this.handleFreeGroundState(held);
        }
        return;
      case 'block':
        if (this.stunFrames > 0) this.stunFrames--;
        else this.handleFreeGroundState(held);
        return;
      case 'hurt':
        if (this.stunFrames > 0) this.stunFrames--;
        else if (!this.isAirborne) this.handleFreeGroundState(held);
        return;
      case 'jump':
      case 'knockout':
      case 'victory':
        // Driven by physics (landing) or terminal.
        return;
    }
  }

  /** Decision tree for a grounded fighter that is free to act. Order = priority. */
  private handleFreeGroundState(held: Readonly<InputState>): void {
    if (this.bufferedAttack) {
      const attack = this.config.attacks[this.bufferedAttack.button];
      this.bufferedAttack = null;
      this.startAttack(attack);
      return;
    }
    if (held.block) {
      this.setState('block');
      return;
    }
    const axis = horizontalAxis(held);
    if (held.up) {
      this.setState('jump');
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

  private startAttack(attack: AttackConfig): void {
    this.setState(attack.state, true);
    this.attack = attack;
    this.attackConnected = false;
    this.velocity.x = 0;
  }

  private integratePhysics(): void {
    if (this.isAirborne || this.velocity.y < 0) this.velocity.y += GRAVITY;

    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    if (this.position.y >= this.groundY) {
      this.position.y = this.groundY;
      this.velocity.y = 0;
      if (this.currentState === 'jump') {
        this.setState('idle');
        this.velocity.x = 0;
      }
    }

    const sliding = !this.isAirborne && this.currentState !== 'walk';
    if (sliding) {
      this.velocity.x *= GROUND_FRICTION;
      if (Math.abs(this.velocity.x) < MIN_SLIDE_SPEED) this.velocity.x = 0;
    }
  }
}
