import { MAX_FIGHTER_SEPARATION } from '../../config/simulation';
import type { StageConfig } from '../../types/stage';
import type { Fighter } from '../fighter/Fighter';
import { clamp, horizontalOverlap, rectsOverlap } from '../geometry';

/**
 * Spatial rules of the arena:
 * 1. Fighters' bodies (pushboxes) never overlap.
 * 2. Fighters never leave the arena walls.
 * 3. Fighters never get further apart than the screen can show.
 */
export class ArenaSystem {
  readonly minX: number;
  readonly maxX: number;

  constructor(stage: StageConfig) {
    this.minX = stage.wallMargin;
    this.maxX = stage.width - stage.wallMargin;
  }

  resolve(fighters: readonly [Fighter, Fighter]): void {
    this.limitSeparation(fighters);
    this.separateBodies(fighters, false);
    for (const fighter of fighters) this.clampToWalls(fighter);
    // A fighter pinned to a wall cannot be pushed, so the other one takes the whole push.
    this.separateBodies(fighters, true);
  }

  private clampToWalls(fighter: Fighter): void {
    fighter.position.x = clamp(fighter.position.x, this.minX, this.maxX);
  }

  private separateBodies(fighters: readonly [Fighter, Fighter], afterWalls: boolean): void {
    const [a, b] = fighters;
    const boxA = a.getPushbox();
    const boxB = b.getPushbox();
    if (!boxA || !boxB || !rectsOverlap(boxA, boxB)) return;

    const overlap = horizontalOverlap(boxA, boxB);
    const dx = b.position.x - a.position.x;
    // Which side is B on? When perfectly stacked, use the facing of A.
    const side = dx !== 0 ? Math.sign(dx) : a.direction;

    if (!afterWalls) {
      a.position.x -= (side * overlap) / 2;
      b.position.x += (side * overlap) / 2;
      return;
    }
    const aPinned = a.position.x <= this.minX || a.position.x >= this.maxX;
    if (aPinned) b.position.x = clamp(b.position.x + side * overlap, this.minX, this.maxX);
    else a.position.x = clamp(a.position.x - side * overlap, this.minX, this.maxX);
  }

  /** Pulls back whoever moved away so the distance never exceeds the visible width. */
  private limitSeparation(fighters: readonly [Fighter, Fighter]): void {
    const [a, b] = fighters;
    let excess = Math.abs(b.position.x - a.position.x) - MAX_FIGHTER_SEPARATION;
    if (excess <= 0) return;

    const pairs: readonly (readonly [Fighter, Fighter])[] = [
      [a, b],
      [b, a],
    ];
    for (const [self, other] of pairs) {
      const away = Math.sign(self.position.x - other.position.x);
      const movedAway = (self.position.x - self.previousX) * away;
      if (movedAway <= 0) continue;
      const correction = Math.min(excess, movedAway);
      self.position.x -= away * correction;
      excess -= correction;
      if (excess <= 0) return;
    }
  }
}
