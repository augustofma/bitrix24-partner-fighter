import type Phaser from 'phaser';
import type { PlaceholderPalette } from '../../types/fighter';
import type { Vec2 } from '../../types/geometry';
import type { Pose } from './poses';

const LIMB_WIDTH = 11;
const TORSO_WIDTH = 24;
const HEAD_RADIUS = 15;
const HAND_RADIUS = 7;
const FOOT_RADIUS = 7;
const OUTLINE = 3;
const BACK_LIMB_SHADE = 0.62;
const FLASH_COLOR = 0xffffff;

export interface FigureOptions {
  /** Paint everything white (hit flash). */
  flash?: boolean;
}

function shade(color: number, factor: number): number {
  const r = Math.round(((color >> 16) & 0xff) * factor);
  const g = Math.round(((color >> 8) & 0xff) * factor);
  const b = Math.round((color & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}

/** Thick segment with rounded ends, drawn with an outline. */
function segment(
  g: Phaser.GameObjects.Graphics,
  points: readonly Vec2[],
  width: number,
  color: number,
  outline: number,
): void {
  for (const [w, c] of [
    [width + OUTLINE * 2, outline],
    [width, color],
  ] as const) {
    g.lineStyle(w, c, 1);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      if (a && b) g.lineBetween(a.x, a.y, b.x, b.y);
    }
    g.fillStyle(c, 1);
    for (const point of points) g.fillCircle(point.x, point.y, w / 2);
  }
}

function ball(
  g: Phaser.GameObjects.Graphics,
  at: Vec2,
  radius: number,
  color: number,
  outline: number,
): void {
  g.fillStyle(outline, 1);
  g.fillCircle(at.x, at.y, radius + OUTLINE);
  g.fillStyle(color, 1);
  g.fillCircle(at.x, at.y, radius);
}

/**
 * Draws a placeholder fighter (facing right, feet at 0,0) into a Graphics object.
 * Mirror it with `graphics.scaleX = -1` to face left.
 */
export function drawFigure(
  g: Phaser.GameObjects.Graphics,
  pose: Pose,
  palette: PlaceholderPalette,
  options: FigureOptions = {},
): void {
  const flash = options.flash ?? false;
  const body = flash ? FLASH_COLOR : palette.body;
  const back = flash ? FLASH_COLOR : shade(palette.body, BACK_LIMB_SHADE);
  const accent = flash ? FLASH_COLOR : palette.accent;
  const backAccent = flash ? FLASH_COLOR : shade(palette.accent, BACK_LIMB_SHADE);
  const skin = flash ? FLASH_COLOR : palette.skin;
  const outline = palette.outline;

  // Back limbs first (darker), then torso and head, then front limbs.
  segment(g, [pose.neck, pose.backElbow, pose.backHand], LIMB_WIDTH, back, outline);
  ball(g, pose.backHand, HAND_RADIUS, backAccent, outline);
  segment(g, [pose.hip, pose.backKnee, pose.backFoot], LIMB_WIDTH + 2, back, outline);
  ball(g, pose.backFoot, FOOT_RADIUS, backAccent, outline);

  segment(g, [pose.neck, pose.hip], TORSO_WIDTH, body, outline);
  ball(g, pose.hip, TORSO_WIDTH / 2 - 2, accent, outline); // belt
  ball(g, pose.head, HEAD_RADIUS, skin, outline);
  // Headband, so the facing direction is readable.
  g.fillStyle(accent, 1);
  g.fillRect(pose.head.x - HEAD_RADIUS, pose.head.y - 6, HEAD_RADIUS * 2, 5);

  segment(g, [pose.hip, pose.frontKnee, pose.frontFoot], LIMB_WIDTH + 2, body, outline);
  ball(g, pose.frontFoot, FOOT_RADIUS, accent, outline);
  segment(g, [pose.neck, pose.frontElbow, pose.frontHand], LIMB_WIDTH, body, outline);
  ball(g, pose.frontHand, HAND_RADIUS + 1, accent, outline);
}
