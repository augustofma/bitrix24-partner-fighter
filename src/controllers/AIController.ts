import { attackReach, totalAttackFrames } from '../core/fighter/attackFrames';
import { attackWouldConnect } from '../core/fighter/attackGeometry';
import { specialForPress, specialReach, specialWouldConnect } from '../core/fighter/specialMoves';
import {
  GUARD_COVERAGE,
  correctGuardFor,
  groundInputFor,
  isLowPosture,
  type GuardPosture,
} from '../core/fighter/fighterStates';
import type { ReadonlyFighter } from '../core/fighter/ReadonlyFighter';
import { createInputState } from '../core/input';
import { randomInt, type Rng } from '../core/random';
import {
  CROUCH_ATTACK_STATES,
  GROUND_ATTACK_STATES,
  type AttackLevel,
  type FighterStateId,
  type SpecialMoveConfig,
} from '../types/fighter';
import type { Direction } from '../types/geometry';
import type { InputState } from '../types/input';
import { NORMAL_AI, type AIProfile, type GroundAttackSlot } from './aiProfiles';
import type { ControllerContext, FighterController } from './FighterController';

export type AIMode = 'wait' | 'approach' | 'retreat' | 'guard' | 'attack' | 'jump' | 'special';

/** Extra distance (px) at which an incoming attack is considered a threat. */
const THREAT_MARGIN = 24;
/** Approaching stops this many px inside punch range, so the punch can land. */
const APPROACH_STOP_MARGIN = 8;
/** Jump-ins are only tried when the opponent is at most this far beyond kick range. */
const JUMP_IN_WINDOW = 160;
/** Extra frames held in guard after the opponent's attack should have ended. */
const GUARD_SAFETY_FRAMES = 4;
/** Without a spacing check the CPU eyeballs the reach and may throw a special this far short. */
const SPECIAL_EYEBALL_SLACK = 24;
/** A special is never a sure thing: some chance is always left for movement and normals. */
const MAX_SPECIAL_CHANCE = 0.95;
/** States from which a special press starts the move (same as a human's: free on the ground). */
const SPECIAL_READY_STATES: ReadonlySet<FighterStateId> = new Set(['idle', 'walk', 'crouch']);

/**
 * Simple CPU opponent: a finite state machine over AIMode.
 *
 * Every few frames it picks a mode based on distance and situation (weighted by its
 * AIProfile), then "expresses" that mode as button presses - exactly what a human
 * would send. It also reacts (with a delay and a chance) to attacks it sees coming.
 * Randomness is injected so it can be seeded in tests.
 */
export class AIController implements FighterController {
  private mode: AIMode = 'wait';
  private modeFrames = 0;
  /** The ground attack to perform in 'attack' mode; expressed as button (+ ↓), like a human. */
  private attackSlot: GroundAttackSlot = 'punch';
  private attackCooldown = 0;
  private reactedToCurrentAttack = false;
  /** Decided at jump time: kick on the way down if the opponent comes into range. */
  private plannedAirAttack = false;
  /** Guard posture to hold in 'guard' mode: ↓ + D when true. */
  private guardLow = false;
  /** Frames before a special can be considered again (after using or declining one). */
  private specialCooldown = 0;
  /** Hesitation left once the meter pays for a special (null: no special available). */
  private specialReadyIn: number | null = null;

  constructor(
    private readonly profile: AIProfile = NORMAL_AI,
    private readonly rng: Rng = Math.random,
  ) {}

  /** New round: drop every decision in progress (the RNG keeps going, so it stays deterministic). */
  reset(): void {
    this.mode = 'wait';
    this.modeFrames = 0;
    this.attackCooldown = 0;
    this.reactedToCurrentAttack = false;
    this.plannedAirAttack = false;
    this.guardLow = false;
    this.specialCooldown = 0;
    this.specialReadyIn = null;
  }

  get currentMode(): AIMode {
    return this.mode;
  }

  getInput({ self, opponent }: ControllerContext): InputState {
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.specialCooldown > 0) this.specialCooldown--;
    this.trackSpecialReadiness(self);

    const busy = self.state === 'knockout' || self.state === 'victory';
    if (busy || opponent.isKnockedOut) return createInputState();
    if (self.isAirborne) return this.airInput(self, opponent);
    if (self.state === 'hurt') {
      // Re-think as soon as hitstun ends.
      this.modeFrames = 0;
      return createInputState();
    }

    this.watchIncomingAttack(self, opponent);
    if (this.modeFrames <= 0) this.decide(self, opponent);
    this.modeFrames--;
    return this.express(self, opponent);
  }

  /** In the air the CPU only decides whether to throw its planned air kick (once). */
  private airInput(self: ReadonlyFighter, opponent: ReadonlyFighter): InputState {
    const descending = self.velocity.y > 0;
    if (!this.plannedAirAttack || self.state !== 'jump' || !descending) return createInputState();
    const reach = attackReach(self.config.attacks.airKick) + halfBodyWidth(opponent);
    if (distanceBetween(self, opponent) > reach) return createInputState();
    this.plannedAirAttack = false;
    return createInputState({ kick: true });
  }

  private setMode(mode: AIMode, frames: number): void {
    this.mode = mode;
    this.modeFrames = frames;
  }

  private watchIncomingAttack(self: ReadonlyFighter, opponent: ReadonlyFighter): void {
    const attack = opponent.activeAttack;
    if (!attack || opponent.attackPhase === 'recovery') {
      this.reactedToCurrentAttack = false;
      return;
    }
    if (this.reactedToCurrentAttack || opponent.stateFrame < this.profile.reactionFrames) return;
    this.reactedToCurrentAttack = true;

    const threatRange = attackReach(attack) + halfBodyWidth(self) + THREAT_MARGIN;
    if (distanceBetween(self, opponent) > threatRange) return;
    if (this.rng() >= this.profile.blockChance) return;

    this.guardLow = this.readGuardPosture(attack.level) === 'crouching';
    const remaining = totalAttackFrames(attack) - opponent.stateFrame;
    this.setMode('guard', remaining + GUARD_SAFETY_FRAMES);
  }

  /**
   * Posture against an attack already seen (its level is visible once it started). With
   * chance guardReadChance the CPU reads it right; otherwise it guesses wrong where only one
   * posture works (low / overhead) and stays standing for mid / high (both work anyway).
   */
  private readGuardPosture(level: AttackLevel): GuardPosture {
    const correct = correctGuardFor(level);
    if (this.rng() < this.profile.guardReadChance) return correct;
    const onlyOneWorks = GUARD_COVERAGE[level].length === 1;
    if (!onlyOneWorks) return 'standing';
    return correct === 'standing' ? 'crouching' : 'standing';
  }

  /**
   * Counts the hesitation since the meter first paid for a special. Rolls only for fighters
   * whose special is available, so CPUs without one keep their exact random sequence.
   */
  private trackSpecialReadiness(self: ReadonlyFighter): void {
    if (!specialForPress(self.config, self.specialMeter, false)) {
      this.specialReadyIn = null;
      return;
    }
    if (this.specialReadyIn === null) {
      this.specialReadyIn = randomInt(this.rng, ...this.profile.special.readyDelay);
    } else if (this.specialReadyIn > 0) {
      this.specialReadyIn--;
    }
  }

  /**
   * Special as one option of the decision tree. Only the move a press would really start is
   * considered (meter, posture: specialForPress), from a free ground state, once hesitation and
   * cooldown are over, and only if it would reach. Then a roll: base chance, plus a finisher
   * bias and a whiff-punish bonus (seen after reactionFrames, with recovery long enough for
   * the special's startup). Using or declining starts a cooldown: no per-frame retries.
   */
  private trySpecial(self: ReadonlyFighter, opponent: ReadonlyFighter): boolean {
    const tuning = this.profile.special;
    if (this.specialCooldown > 0 || this.specialReadyIn !== 0) return false;
    if (!SPECIAL_READY_STATES.has(self.state) || self.isAirborne) return false;
    const move = specialForPress(self.config, self.specialMeter, false);
    if (!move || !this.specialInRange(move, self, opponent)) return false;

    let chance = tuning.useChance;
    if (opponent.health <= move.damage) chance += tuning.finisherBias;
    if (this.canPunish(move, opponent)) chance += tuning.punishBonus;
    if (this.rng() < Math.min(MAX_SPECIAL_CHANCE, chance)) {
      this.specialCooldown =
        totalAttackFrames(move) + randomInt(this.rng, ...tuning.decisionCooldown);
      this.attackCooldown = Math.max(this.attackCooldown, totalAttackFrames(move));
      this.setMode('special', 1);
      return true;
    }
    this.specialCooldown = randomInt(this.rng, ...tuning.declineCooldown);
    return false;
  }

  private specialInRange(
    move: SpecialMoveConfig,
    self: ReadonlyFighter,
    opponent: ReadonlyFighter,
  ): boolean {
    if (this.rng() < this.profile.special.spacingAwareness) {
      if (opponent.isAirborne) return false;
      const facing = towardDirection(self, opponent);
      return specialWouldConnect(move, self.position, facing, opponent.getHurtbox());
    }
    const eyeballed = specialReach(move) + halfBodyWidth(opponent) + SPECIAL_EYEBALL_SLACK;
    return distanceBetween(self, opponent) <= eyeballed;
  }

  /**
   * The opponent is stuck in recovery (noticed only reactionFrames after it began, like any
   * reaction) with enough of it left for the special's startup to land.
   */
  private canPunish(move: SpecialMoveConfig, opponent: ReadonlyFighter): boolean {
    const attack = opponent.activeAttack;
    if (!attack || opponent.attackPhase !== 'recovery') return false;
    const recoveryStart = attack.startupFrames + attack.activeFrames;
    const seenFor = opponent.stateFrame - recoveryStart;
    const left = totalAttackFrames(attack) - opponent.stateFrame;
    return seenFor >= this.profile.reactionFrames && left >= move.startupFrames;
  }

  private decide(self: ReadonlyFighter, opponent: ReadonlyFighter): void {
    if (this.trySpecial(self, opponent)) return;
    const { profile, rng } = this;
    const distance = distanceBetween(self, opponent);
    const punchRange = this.rangeOf('punch', self, opponent);
    const kickRange = this.rangeOf('kick', self, opponent);
    this.plannedAirAttack = false;
    // Only rolled when the opponent is actually low, so play against a standing opponent is
    // exactly as before (same random sequence).
    const targetLow = isLowPosture(opponent.state) && rng() < profile.lowPostureAwareness;
    const attackRange = targetLow ? this.lowTargetRange(self, opponent) : kickRange;

    if (distance > attackRange) {
      const canJumpIn = distance < attackRange + JUMP_IN_WINDOW;
      if (canJumpIn && rng() < profile.jumpInChance) {
        this.setMode('jump', 1);
        this.plannedAirAttack = rng() < profile.jumpInAttackChance;
      } else {
        this.setMode('approach', randomInt(rng, ...profile.approachFrames));
      }
      return;
    }

    if (this.attackCooldown === 0 && rng() < profile.aggression) {
      const slot = targetLow
        ? this.pickLowTargetAttack(self, opponent)
        : this.pickStandingTargetAttack(distance <= punchRange);
      if (!slot) {
        // Nothing would connect from here: close the gap instead of whiffing.
        this.setMode('approach', randomInt(rng, ...profile.approachFrames));
        return;
      }
      this.attackSlot = slot;
      const attack = self.config.attacks[slot];
      this.attackCooldown = totalAttackFrames(attack) + randomInt(rng, ...profile.attackCooldown);
      this.setMode('attack', 1);
      return;
    }

    const roll = rng();
    if (roll < profile.retreatChance) {
      this.setMode('retreat', randomInt(rng, ...profile.retreatFrames));
    } else if (roll < profile.retreatChance + profile.guardChance) {
      // Pre-emptive guard: low against a low opponent (crouching attacks are likely).
      this.guardLow = isLowPosture(opponent.state);
      this.setMode('guard', randomInt(rng, ...profile.guardFrames));
    } else if (distance > punchRange) {
      this.setMode('approach', randomInt(rng, ...profile.approachFrames));
    } else {
      this.setMode('wait', randomInt(rng, ...profile.waitFrames));
    }
  }

  private express(self: ReadonlyFighter, opponent: ReadonlyFighter): InputState {
    const toward = Math.sign(opponent.position.x - self.position.x) || self.direction;
    const holdToward = toward > 0 ? { right: true } : { left: true };
    const holdAway = toward > 0 ? { left: true } : { right: true };

    switch (this.mode) {
      case 'approach': {
        // Against a low opponent, stop where the low jab connects (the standing punch whiffs).
        const closest = isLowPosture(opponent.state) ? 'crouchPunch' : 'punch';
        const stopAt = this.rangeOf(closest, self, opponent) - APPROACH_STOP_MARGIN;
        if (distanceBetween(self, opponent) <= stopAt) {
          this.modeFrames = 0;
          return createInputState();
        }
        return createInputState(holdToward);
      }
      case 'retreat':
        return createInputState(holdAway);
      case 'guard':
        return createInputState({ block: true, down: this.guardLow });
      case 'attack': {
        const input = groundInputFor(this.attackSlot);
        return input
          ? createInputState({ [input.button]: true, down: input.down })
          : createInputState();
      }
      case 'jump':
        return createInputState({ up: true, ...holdToward });
      case 'special':
        // The same button a human presses: the fighter applies the real rules again.
        return createInputState({ special: true });
      case 'wait':
        return createInputState();
    }
  }

  /** Standing opponent: punch up close, kick further away (sometimes a low sweep). */
  private pickStandingTargetAttack(inPunchRange: boolean): GroundAttackSlot {
    if (inPunchRange) return 'punch';
    return this.rng() < this.profile.lowKickChance ? 'crouchKick' : 'kick';
  }

  /**
   * Low opponent: weighted pick among the ground attacks whose hitbox would touch the
   * opponent's CURRENT hurtbox (reach and height), so high attacks that pass over are skipped.
   * Null when nothing connects from here.
   */
  private pickLowTargetAttack(
    self: ReadonlyFighter,
    opponent: ReadonlyFighter,
  ): GroundAttackSlot | null {
    const weights = this.profile.lowPostureAttackWeights;
    const target = opponent.getHurtbox();
    const facing = towardDirection(self, opponent);
    const candidates = GROUND_ATTACK_SLOTS.filter(
      (slot) =>
        weights[slot] > 0 &&
        attackWouldConnect(self.config.attacks[slot], self.position, facing, target),
    );
    const total = candidates.reduce((sum, slot) => sum + weights[slot], 0);
    if (total <= 0) return null;
    let roll = this.rng() * total;
    for (const slot of candidates) {
      roll -= weights[slot];
      if (roll < 0) return slot;
    }
    return candidates.at(-1) ?? null;
  }

  /** Farthest center distance at which any preferred attack can reach a low opponent. */
  private lowTargetRange(self: ReadonlyFighter, opponent: ReadonlyFighter): number {
    const weights = this.profile.lowPostureAttackWeights;
    const ranges = GROUND_ATTACK_SLOTS.filter((slot) => weights[slot] > 0).map((slot) =>
      this.rangeOf(slot, self, opponent),
    );
    return Math.max(0, ...ranges);
  }

  /** Center-to-center distance at which `slot` reaches the opponent horizontally. */
  private rangeOf(
    slot: GroundAttackSlot,
    self: ReadonlyFighter,
    opponent: ReadonlyFighter,
  ): number {
    return attackReach(self.config.attacks[slot]) + halfBodyWidth(opponent);
  }
}

const GROUND_ATTACK_SLOTS: readonly GroundAttackSlot[] = [
  ...GROUND_ATTACK_STATES,
  ...CROUCH_ATTACK_STATES,
];

function towardDirection(self: ReadonlyFighter, opponent: ReadonlyFighter): Direction {
  const dx = opponent.position.x - self.position.x;
  if (dx === 0) return self.direction;
  return dx > 0 ? 1 : -1;
}

function distanceBetween(a: ReadonlyFighter, b: ReadonlyFighter): number {
  return Math.abs(a.position.x - b.position.x);
}

function halfBodyWidth(fighter: ReadonlyFighter): number {
  return fighter.config.boxes.standing.width / 2;
}
