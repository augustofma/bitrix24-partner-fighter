import type Phaser from 'phaser';
import { TITLE_FONT } from '../../render/assets/fontAssets';
import { FONT_FAMILY } from '../theme';

/*
 * "Fighting game" title lettering, generated from any text at runtime: a bundled brush-like
 * display font, slanted forward, filled with a hot gradient (red at the top through orange and
 * yellow to cream at the bottom), a thick dark outline with a deep red inner line, dry-brush
 * streaks and a hard drop shadow. Drawn once into a canvas texture, so it costs nothing per
 * frame and works for every fighter name, current or future.
 */

/** Font size of the drawn lettering, in game pixels. */
export const FIGHT_TITLE_FONT_SIZE = 88;
/** Canvas pixels per game pixel: the texture stays crisp on large screens. */
const RESOLUTION = 2;
/** Forward lean: horizontal shift per pixel of height. */
const SLANT = 0.16;
/** Space around the lettering for the outline, slant and shadow (fraction of the size). */
const PADDING = 0.35;

const SHADOW_COLOR = '#05030f';
const OUTLINE_COLOR = '#130309';
const INNER_LINE_COLOR = '#7a0d06';
/** Top to bottom: red, orange, yellow, cream (classic arcade fire lettering). */
const GRADIENT: readonly (readonly [number, string])[] = [
  [0, '#c8160f'],
  [0.32, '#ff3f12'],
  [0.58, '#ff9a1f'],
  [0.8, '#ffd23f'],
  [1, '#fff3c4'],
];
/** Widths relative to the font size. */
const SHADOW_OFFSET = { x: 0.07, y: 0.08 };
const OUTLINE_WIDTH = 0.2;
const INNER_LINE_WIDTH = 0.09;
/** Brush streaks per 100 px of lettering (dark cuts and light dry-brush highlights). */
const DARK_STREAKS_PER_100PX = 1.6;
const LIGHT_STREAKS_PER_100PX = 0.8;

const TEXTURE_PREFIX = 'fight-title:';

/** Scale that fits a title of `width` into `maxWidth` (never enlarges). */
export function fitTitleScale(width: number, maxWidth: number): number {
  return width > maxWidth ? maxWidth / width : 1;
}

/** Deterministic seed from the text: the same title always gets the same brush streaks. */
export function titleSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return hash >>> 0;
}

/**
 * Image of `text` in the fight title style, at game scale, centered on (x, y). The texture is
 * rebuilt when the text changes and reused otherwise.
 */
export function createFightTitle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
): Phaser.GameObjects.Image {
  const key = TEXTURE_PREFIX + text;
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, drawTitle(text));
  return scene.add.image(x, y, key).setScale(1 / RESOLUTION);
}

function drawTitle(text: string): HTMLCanvasElement {
  const size = FIGHT_TITLE_FONT_SIZE * RESOLUTION;
  const font = `${size}px "${TITLE_FONT.key}", ${FONT_FAMILY}`;
  const canvas = document.createElement('canvas');
  const measure = canvas.getContext('2d');
  if (!measure) return canvas;
  measure.font = font;
  const textWidth = measure.measureText(text).width;
  const pad = size * PADDING;
  canvas.width = Math.ceil(textWidth + size * SLANT + pad * 2);
  canvas.height = Math.ceil(size * 1.1 + pad * 2);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const baseline = pad + size * 0.92;

  /** Draws in the slanted space: x leans right as the letters go up. */
  const slanted = (paint: () => void) => {
    ctx.save();
    ctx.setTransform(1, 0, -SLANT, 1, pad + SLANT * baseline, 0);
    ctx.font = font;
    ctx.lineJoin = 'round';
    paint();
    ctx.restore();
  };

  slanted(() => {
    ctx.fillStyle = SHADOW_COLOR;
    ctx.strokeStyle = SHADOW_COLOR;
    ctx.lineWidth = size * OUTLINE_WIDTH;
    const sx = size * SHADOW_OFFSET.x;
    const sy = baseline + size * SHADOW_OFFSET.y;
    ctx.strokeText(text, sx, sy);
    ctx.fillText(text, sx, sy);
  });
  slanted(() => {
    ctx.strokeStyle = OUTLINE_COLOR;
    ctx.lineWidth = size * OUTLINE_WIDTH;
    ctx.strokeText(text, 0, baseline);
    ctx.strokeStyle = INNER_LINE_COLOR;
    ctx.lineWidth = size * INNER_LINE_WIDTH;
    ctx.strokeText(text, 0, baseline);
  });
  slanted(() => {
    const gradient = ctx.createLinearGradient(0, baseline - size * 0.78, 0, baseline);
    for (const [stop, color] of GRADIENT) gradient.addColorStop(stop, color);
    ctx.fillStyle = gradient;
    ctx.fillText(text, 0, baseline);
  });
  paintBrushStreaks(ctx, canvas.width, baseline, size, titleSeed(text));
  return canvas;
}

/** Thin slanted strokes painted only over the lettering, like a fast dry brush. */
function paintBrushStreaks(
  ctx: CanvasRenderingContext2D,
  width: number,
  baseline: number,
  size: number,
  seed: number,
): void {
  let state = seed || 1;
  const random = () => {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    return state / 4294967296;
  };
  const streaks = (perHundred: number, color: string, top: number, bottom: number) => {
    const count = Math.round((width / RESOLUTION / 100) * perHundred);
    ctx.strokeStyle = color;
    for (let i = 0; i < count; i++) {
      const y = baseline - size * (top - random() * (top - bottom));
      const x = random() * width;
      const length = size * (0.2 + random() * 0.45);
      ctx.lineWidth = RESOLUTION * (0.8 + random() * 1.2);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + length, y - length * 0.12);
      ctx.stroke();
    }
  };
  ctx.save();
  // Only where something is already drawn: the streaks never leave the letters.
  ctx.globalCompositeOperation = 'source-atop';
  streaks(DARK_STREAKS_PER_100PX, 'rgba(90, 9, 5, 0.55)', 0.75, 0.25);
  streaks(LIGHT_STREAKS_PER_100PX, 'rgba(255, 246, 214, 0.45)', 0.4, 0.05);
  ctx.restore();
}
