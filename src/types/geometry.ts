export interface Vec2 {
  x: number;
  y: number;
}

/** Axis-aligned rectangle in world space (x/y = top-left corner, y grows downward). */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A box relative to a fighter's feet, authored as if the fighter faces RIGHT.
 * - `x`: offset of the left edge from the fighter's center (positive = in front).
 * - `y`: offset of the top edge from the feet (negative = above the ground).
 * The engine mirrors it automatically when the fighter faces left.
 */
export type LocalBox = Rect;

/** 1 = facing right, -1 = facing left. */
export type Direction = 1 | -1;
