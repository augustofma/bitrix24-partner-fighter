import type Phaser from 'phaser';
import { COLORS } from '../theme';

export interface ArcadeFrameStyle {
  fill: number;
  fillAlpha?: number;
  border: number;
  /** Thin line inside the border (the "double outline"). */
  inner?: number;
  /** Drop shadow offset in px (0 = none). */
  shadow?: number;
}

/** Size of the cut corners: square steps sell the pixel-art look. */
const CORNER = 4;
const OUTLINE = 3;
const BORDER = 3;

/**
 * Pixel-art panel: dark outline, colored border, inner line, fill and a top highlight, all with
 * stepped corners. Drawn only with axis-aligned rectangles so it stays crisp when scaled.
 * (x, y) is the top-left corner in the graphics' local space.
 */
export function drawArcadeFrame(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  style: ArcadeFrameStyle,
): void {
  const { fill, fillAlpha = 1, border, inner, shadow = 4 } = style;
  if (shadow > 0) {
    g.fillStyle(0x000000, 0.45);
    steppedRect(g, x + shadow, y + shadow, width, height, CORNER);
  }
  g.fillStyle(COLORS.ink, 1);
  steppedRect(g, x, y, width, height, CORNER);
  g.fillStyle(border, 1);
  steppedRect(g, x + OUTLINE, y + OUTLINE, width - OUTLINE * 2, height - OUTLINE * 2, CORNER - 1);
  const edge = OUTLINE + BORDER;
  if (inner !== undefined) {
    g.fillStyle(inner, 1);
    g.fillRect(x + edge, y + edge, width - edge * 2, height - edge * 2);
  }
  const fillEdge = edge + (inner !== undefined ? 1 : 0);
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(x + fillEdge, y + fillEdge, width - fillEdge * 2, height - fillEdge * 2);
  g.fillStyle(fill, fillAlpha);
  g.fillRect(x + fillEdge, y + fillEdge, width - fillEdge * 2, height - fillEdge * 2);
  // Bevel: a lighter strip along the top of the fill.
  g.fillStyle(COLORS.white, 0.12);
  g.fillRect(x + fillEdge, y + fillEdge, width - fillEdge * 2, 3);
}

/** Rectangle with one-step notched corners. */
function steppedRect(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  corner: number,
): void {
  g.fillRect(x + corner, y, width - corner * 2, height);
  g.fillRect(x, y + corner, width, height - corner * 2);
}
