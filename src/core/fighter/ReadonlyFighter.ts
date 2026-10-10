import type { AttackConfig, FighterConfig, FighterStateId } from '../../types/fighter';
import type { Direction, Rect, Vec2 } from '../../types/geometry';
import type { AttackPhase } from './attackFrames';

/**
 * What controllers (AI) and renderers are allowed to see of a fighter.
 * They must never mutate a fighter directly: only the simulation does.
 */
export interface ReadonlyFighter {
  readonly config: FighterConfig;
  readonly health: number;
  readonly specialMeter: number;
  /** Specials started so far: whose turn it is when the fighter has several (specialForPress). */
  readonly specialTurn: number;
  readonly maxHealth: number;
  readonly position: Readonly<Vec2>;
  readonly velocity: Readonly<Vec2>;
  readonly direction: Direction;
  readonly state: FighterStateId;
  readonly stateFrame: number;
  readonly activeAttack: AttackConfig | null;
  readonly attackPhase: AttackPhase | null;
  /** Step of a multi-hit attack open right now (-1: none; single-hit attacks: 0). */
  readonly attackStep: number;
  readonly isAirborne: boolean;
  readonly isBlocking: boolean;
  readonly isKnockedOut: boolean;
  getHurtbox(): Rect | null;
  getHitbox(): Rect | null;
  getPushbox(): Rect | null;
}
