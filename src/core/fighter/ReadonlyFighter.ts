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
  readonly maxHealth: number;
  readonly position: Readonly<Vec2>;
  readonly velocity: Readonly<Vec2>;
  readonly direction: Direction;
  readonly state: FighterStateId;
  readonly stateFrame: number;
  readonly activeAttack: AttackConfig | null;
  readonly attackPhase: AttackPhase | null;
  readonly isAirborne: boolean;
  readonly isBlocking: boolean;
  readonly isKnockedOut: boolean;
  getHurtbox(): Rect | null;
  getHitbox(): Rect | null;
  getPushbox(): Rect | null;
}
