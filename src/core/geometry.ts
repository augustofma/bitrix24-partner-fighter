import type { Direction, LocalBox, Rect, Vec2 } from '../types/geometry';

/** Converts a facing-right local box into a world rectangle. */
export function toWorldRect(box: LocalBox, origin: Readonly<Vec2>, direction: Direction): Rect {
  const x = direction === 1 ? origin.x + box.x : origin.x - box.x - box.width;
  return { x, y: origin.y + box.y, width: box.width, height: box.height };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Horizontal overlap length (0 when not overlapping). */
export function horizontalOverlap(a: Rect, b: Rect): number {
  return Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
}

/** Center of the intersection of two rectangles (used to place hit effects). */
export function intersectionCenter(a: Rect, b: Rect): Vec2 {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  return { x: (left + right) / 2, y: (top + bottom) / 2 };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
