import { attackReach, totalAttackFrames } from '../core/fighter/attackFrames';
import type { ReadonlyFighter } from '../core/fighter/ReadonlyFighter';
import { createInputState } from '../core/input';
import { randomInt, type Rng } from '../core/random';
import type { AttackButton } from '../types/fighter';
import type { InputState } from '../types/input';
import { NORMAL_AI, type AIProfile } from './aiProfiles';
import type { ControllerContext, FighterController } from './FighterController';

export type AIMode = 'wait' | 'approach' | 'retreat' | 'guard' | 'attack' | 'jump';

/** Extra distance (px) at which an incoming attack is considered a threat. */
const THREAT_MARGIN = 24;
/** Approaching stops this many px inside punch range, so the punch can land. */
const APPROACH_STOP_MARGIN = 8;
/** Jump-ins are only tried when the opponent is at most this far beyond kick range. */
const JUMP_IN_WINDOW = 160;
/** Extra frames held in guard after the opponent's attack should have ended. */
const GUARD_SAFETY_FRAMES = 4;

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
  private attackButton: AttackButton = 'punch';
  private attackCooldown = 0;
  private reactedToCurrentAttack = false;

  constructor(
    private readonly profile: AIProfile = NORMAL_AI,
    private readonly rng: Rng = Math.random,
  ) {}

  get currentMode(): AIMode {
    return this.mode;
  }

  getInput({ self, opponent }: ControllerContext): InputState {
    if (this.attackCooldown > 0) this.attackCooldown--;

    const busy = self.state === 'knockout' || self.state === 'victory' || self.isAirborne;
    if (busy || opponent.isKnockedOut) return createInputState();
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

    const remaining = totalAttackFrames(attack) - opponent.stateFrame;
    this.setMode('guard', remaining + GUARD_SAFETY_FRAMES);
  }

  private decide(self: ReadonlyFighter, opponent: ReadonlyFighter): void {
    const { profile, rng } = this;
    const distance = distanceBetween(self, opponent);
    const punchRange = this.rangeOf('punch', self, opponent);
    const kickRange = this.rangeOf('kick', self, opponent);

    if (distance > kickRange) {
      const canJumpIn = distance < kickRange + JUMP_IN_WINDOW;
      if (canJumpIn && rng() < profile.jumpInChance) this.setMode('jump', 1);
      else this.setMode('approach', randomInt(rng, ...profile.approachFrames));
      return;
    }

    if (this.attackCooldown === 0 && rng() < profile.aggression) {
      this.attackButton = distance <= punchRange ? 'punch' : 'kick';
      const attack = self.config.attacks[this.attackButton];
      this.attackCooldown = totalAttackFrames(attack) + randomInt(rng, ...profile.attackCooldown);
      this.setMode('attack', 1);
      return;
    }

    const roll = rng();
    if (roll < profile.retreatChance) {
      this.setMode('retreat', randomInt(rng, ...profile.retreatFrames));
    } else if (roll < profile.retreatChance + profile.guardChance) {
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
        const stopAt = this.rangeOf('punch', self, opponent) - APPROACH_STOP_MARGIN;
        if (distanceBetween(self, opponent) <= stopAt) {
          this.modeFrames = 0;
          return createInputState();
        }
        return createInputState(holdToward);
      }
      case 'retreat':
        return createInputState(holdAway);
      case 'guard':
        return createInputState({ block: true });
      case 'attack':
        return createInputState({ [this.attackButton]: true });
      case 'jump':
        return createInputState({ up: true, ...holdToward });
      case 'wait':
        return createInputState();
    }
  }

  /** Center-to-center distance at which `button` connects with the opponent. */
  private rangeOf(button: AttackButton, self: ReadonlyFighter, opponent: ReadonlyFighter): number {
    return attackReach(self.config.attacks[button]) + halfBodyWidth(opponent);
  }
}

function distanceBetween(a: ReadonlyFighter, b: ReadonlyFighter): number {
  return Math.abs(a.position.x - b.position.x);
}

function halfBodyWidth(fighter: ReadonlyFighter): number {
  return fighter.config.boxes.standing.width / 2;
}
