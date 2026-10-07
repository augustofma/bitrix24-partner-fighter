import type Phaser from 'phaser';

/*
 * Small drawing helpers shared by the app-themed special VFX. Everything is drawn into a
 * Graphics that is cleared every frame, so nothing here allocates game objects.
 */

export type Graphics = Phaser.GameObjects.Graphics;

/** Deterministic 0..1 "noise" from integers (no Math.random: same frame, same picture). */
export function hash01(a: number, b = 0): number {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const easeOutCubic = (t: number): number => 1 - (1 - clamp01(t)) ** 3;
/**
 * Overshoots a little before settling: the arcade "pop". Never below 0 (the raw curve dips
 * slightly negative near t = 0, which turned sizes into negative, degenerate shapes).
 */
export function easeOutBack(t: number): number {
  const c = 1.9;
  const x = clamp01(t) - 1;
  return Math.max(0, 1 + (c + 1) * x ** 3 + c * x ** 2);
}

/** Shapes smaller than this are not drawn (nothing visible, and no degenerate geometry). */
const MIN_SHAPE = 3;

/**
 * Pixel-art rounded box from two rectangles (notched corners, like pixel art). Only rectangles:
 * no path triangulation (earcut), so it costs the same at any size, every frame. A rounded
 * path with a negative or tiny size made Phaser's triangulation explode (hundreds of ms).
 */
export function pixelBox(
  g: Graphics,
  left: number,
  top: number,
  width: number,
  height: number,
  color: number,
  alpha: number,
): void {
  if (width < MIN_SHAPE || height < MIN_SHAPE) return;
  const notch = Math.min(2, Math.floor(Math.min(width, height) / 4));
  g.fillStyle(color, alpha);
  g.fillRect(left + notch, top, width - notch * 2, height);
  g.fillRect(left, top + notch, width, height - notch * 2);
}

/**
 * Pixel-art disc (an octagon of three rectangles) in place of fillCircle: circles are filled as
 * triangulated paths, rectangles are not, so a burst of glows stays cheap on every frame.
 */
export function disc(
  g: Graphics,
  x: number,
  y: number,
  radius: number,
  color: number,
  alpha: number,
): void {
  if (radius < 1 || alpha <= 0) return;
  const inner = radius * 0.42;
  g.fillStyle(color, alpha);
  g.fillRect(x - inner, y - radius, inner * 2, radius * 2);
  g.fillRect(x - radius, y - inner, radius * 2, inner * 2);
  const corner = radius * 0.78;
  g.fillRect(x - corner, y - corner, corner * 2, corner * 2);
}

/**
 * Chat bubble (rounded box with a tail) centered on x, y. Content: text lines, typing dots or
 * nothing. `tail` is the side the tail points to (1 = right, -1 = left).
 */
export function chatBubble(
  g: Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    fill: number;
    alpha: number;
    tail: 1 | -1;
    content?: 'lines' | 'dots' | 'none';
    contentColor?: number;
    /** Typing dots shown (0..3), for the animated "..." */
    dots?: number;
  },
): void {
  const { fill, alpha, tail, content = 'lines', contentColor = 0xffffff, dots = 3 } = options;
  // Bubbles still popping in from scale 0 (or fully faded) are skipped.
  if (width < MIN_SHAPE * 3 || height < MIN_SHAPE * 2 || alpha <= 0) return;
  const left = x - width / 2;
  const top = y - height / 2;
  pixelBox(g, left - 1, top - 1, width + 2, height + 2, 0x061018, alpha * 0.85);
  pixelBox(g, left, top, width, height, fill, alpha);
  const tx = x + (tail * width) / 2 - tail * 4;
  g.fillStyle(fill, alpha);
  g.fillTriangle(
    tx,
    top + height - 1,
    tx - tail * 6,
    top + height - 1,
    tx + tail * 2,
    top + height + 5,
  );
  g.fillStyle(contentColor, alpha);
  if (content === 'lines') {
    g.fillRect(left + 4, top + 3, width - 8, 2);
    if (height >= 11) g.fillRect(left + 4, top + 7, width - 12, 2);
  } else if (content === 'dots') {
    for (let i = 0; i < Math.min(3, dots); i++) {
      g.fillRect(x - 6 + i * 5, y - 1, 3, 3);
    }
  }
}

/** Two check marks: the "delivered / read" receipt of a sent message. */
export function readReceipt(
  g: Graphics,
  x: number,
  y: number,
  size: number,
  color: number,
  alpha: number,
  double = true,
): void {
  g.lineStyle(Math.max(2, size / 5), color, alpha);
  const tick = (ox: number) => {
    g.beginPath();
    g.moveTo(x + ox - size * 0.5, y);
    g.lineTo(x + ox - size * 0.15, y + size * 0.35);
    g.lineTo(x + ox + size * 0.5, y - size * 0.4);
    g.strokePath();
  };
  tick(0);
  if (double) tick(size * 0.45);
}

/** Arc of a ring facing `direction` (a ")" sending wave), centered on x, y. */
export function waveArc(
  g: Graphics,
  x: number,
  y: number,
  radius: number,
  direction: 1 | -1,
  spread: number,
  width: number,
  color: number,
  alpha: number,
): void {
  const facing = direction > 0 ? 0 : Math.PI;
  g.lineStyle(width, color, alpha);
  g.beginPath();
  g.arc(x, y, radius, facing - spread, facing + spread);
  g.strokePath();
}

/** Ring of `count` short arc ticks rotating around x, y (a HUD reticle). */
export function tickRing(
  g: Graphics,
  x: number,
  y: number,
  radius: number,
  count: number,
  rotation: number,
  width: number,
  color: number,
  alpha: number,
): void {
  const span = (Math.PI * 2) / count;
  g.lineStyle(width, color, alpha);
  for (let i = 0; i < count; i++) {
    const start = rotation + i * span;
    g.beginPath();
    g.arc(x, y, radius, start, start + span * 0.55);
    g.strokePath();
  }
}

/** Polyline drawn up to `progress` (0..1) of its length; returns the tip point. */
export function partialPath(
  g: Graphics,
  points: readonly { x: number; y: number }[],
  progress: number,
  width: number,
  color: number,
  alpha: number,
): { x: number; y: number } | null {
  if (points.length < 2) return null;
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i]!.x, p.y - points[i]!.y));
  let remaining = lengths.reduce((a, b) => a + b, 0) * clamp01(progress);
  g.lineStyle(width, color, alpha);
  g.beginPath();
  g.moveTo(points[0]!.x, points[0]!.y);
  let tip = points[0]!;
  for (let i = 1; i < points.length && remaining > 0; i++) {
    const from = points[i - 1]!;
    const to = points[i]!;
    const segment = lengths[i - 1]!;
    const t = Math.min(1, remaining / segment);
    tip = { x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) };
    g.lineTo(tip.x, tip.y);
    remaining -= segment;
  }
  g.strokePath();
  return tip;
}

/** Point at fraction t (0..1) of a polyline's length. */
export function pointOnPath(
  points: readonly { x: number; y: number }[],
  t: number,
): { x: number; y: number } {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i]!.x, p.y - points[i]!.y));
  let remaining = lengths.reduce((a, b) => a + b, 0) * clamp01(t);
  for (let i = 1; i < points.length; i++) {
    const segment = lengths[i - 1]!;
    if (remaining <= segment) {
      const k = segment > 0 ? remaining / segment : 0;
      return {
        x: lerp(points[i - 1]!.x, points[i]!.x, k),
        y: lerp(points[i - 1]!.y, points[i]!.y, k),
      };
    }
    remaining -= segment;
  }
  return points[points.length - 1]!;
}
