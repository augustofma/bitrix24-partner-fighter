import type { Graphics } from './vfxShapes';

/*
 * The energy dragon of CÓLERA DOS 100 DRAGÕES, drawn from rectangles only (pixel art, no path
 * triangulation): a long head with a glowing eye, swept-back horns, a mane and an open energy
 * jaw, and a serpentine body of overlapping, tapering segments that waves behind it. Every part
 * gets a dark outline first, so the silhouette reads in motion over any stage. Original design:
 * no frames, poses or shapes taken from any work. The theme calls it for the lead dragon, the
 * flood and the final dragon, at different scales and alphas (depth).
 */

export interface DragonLook {
  /** Head position (center of the skull) and the side it faces. */
  x: number;
  y: number;
  direction: 1 | -1;
  scale: number;
  alpha: number;
  /** Body color, the lighter belly / crest / horns color and the eye / mouth glow color. */
  body: number;
  crest: number;
  core: number;
  /** Outline color (dark: the silhouette). */
  outline: number;
  /** Phase of the body's wave (advance it per frame to make it slither). */
  wave: number;
  /** Body segments (far, small dragons use fewer). */
  segments: number;
  /** 0..1: how open the jaw is. */
  jaw: number;
}

const SEGMENT_SPACING = 9;
const SEGMENT_SIZE = 18;
const WAVE_AMPLITUDE = 14;
const OUTLINE = 2;
/** Below this scale the head's small details (fangs, brow, nostril) are not drawn. */
const DETAIL_SCALE = 0.75;

type Tone = 'body' | 'crest' | 'core' | 'shade' | 'ink' | 'white';
/**
 * A head-space rectangle: forward = +x toward `direction`; outlined parts form the silhouette.
 * `jaw`: 1 moves the part down by the jaw opening, 2 makes it that much taller.
 */
type Part = readonly [
  lx: number,
  ly: number,
  w: number,
  h: number,
  tone: Tone,
  outlined: boolean,
  jaw?: 1 | 2,
];

/** The head at scale 1 (center of the skull at 0, 0), facing right. Original design. */
const HEAD: readonly Part[] = [
  // Mane and horns, swept back.
  [-28, -12, 12, 5, 'crest', true],
  [-30, -2, 14, 5, 'crest', true],
  [-26, 8, 10, 4, 'crest', true],
  [-22, -22, 16, 4, 'crest', true],
  [-32, -27, 12, 4, 'crest', true],
  [-20, -17, 12, 3, 'crest', true],
  // Skull with a forehead bump, a long snout and the nose.
  [-16, -14, 24, 22, 'body', true],
  [-10, -18, 14, 5, 'body', true],
  [8, -10, 28, 10, 'body', true],
  [34, -12, 7, 7, 'shade', true],
  // Lower jaw, dropped open.
  [8, 2, 24, 6, 'shade', true, 1],
  [28, 1, 6, 5, 'shade', true, 1],
  // Inside: dark mouth with an energy tongue, fangs, ridge, brow, cheek frill, eye.
  [10, 0, 24, 2, 'ink', false, 2],
  [12, -1, 18, 3, 'core', false, 1],
  [14, 0, 3, 4, 'white', false],
  [22, 0, 3, 4, 'white', false],
  [30, 0, 3, 3, 'white', false],
  [18, -1, 3, 3, 'white', false, 1],
  [26, -1, 3, 3, 'white', false, 1],
  [8, -12, 24, 3, 'crest', false],
  [-6, -13, 12, 3, 'crest', false],
  [4, -11, 6, 2, 'crest', false],
  [-8, 4, 10, 6, 'crest', false],
  [-1, -9, 10, 6, 'ink', false],
  [0, -8, 8, 4, 'core', false],
  [5, -8, 2, 4, 'ink', false],
  [37, -10, 2, 2, 'ink', false],
];

/** `color` darkened toward `toward` by `amount` (0..1). */
function mixColor(color: number, toward: number, amount: number): number {
  const channel = (shift: number) => {
    const a = (color >> shift) & 0xff;
    const b = (toward >> shift) & 0xff;
    return Math.round(a + (b - a) * amount) << shift;
  };
  return channel(16) | channel(8) | channel(0);
}

function toneColor(d: DragonLook, tone: Tone): number {
  switch (tone) {
    case 'body':
      return d.body;
    case 'crest':
      return d.crest;
    case 'core':
      return d.core;
    case 'shade':
      return mixColor(d.body, d.outline, 0.35);
    case 'ink':
      return d.outline;
    default:
      return 0xffffff;
  }
}

function placePart(d: DragonLook, [lx, ly, w, h, , , jaw]: Part, open: number, grow: number) {
  const s = d.scale;
  if (jaw === 1) ly += open;
  else if (jaw === 2) h += open;
  const x = d.direction > 0 ? d.x + lx * s : d.x - (lx + w) * s;
  return { x: x - grow, y: d.y + ly * s - grow, w: w * s + grow * 2, h: h * s + grow * 2 };
}

/** Center of body segment k (1 = right behind the head) on the travelling wave. */
function segmentAt(d: DragonLook, k: number): { x: number; y: number; size: number } {
  const along = k / d.segments;
  return {
    x: d.x - d.direction * (8 + k * SEGMENT_SPACING) * d.scale,
    y: d.y + 3 * d.scale + Math.sin(d.wave - k * 0.55) * WAVE_AMPLITUDE * d.scale * along,
    size: SEGMENT_SIZE * d.scale * (1 - along * 0.7),
  };
}

/** The body: outlined segments (tail first), a light belly stripe and crest spikes. */
function body(g: Graphics, d: DragonLook): void {
  const o = OUTLINE * Math.max(0.6, d.scale);
  // Outline pass, then color pass: neighbours overlap into one continuous ribbon.
  g.fillStyle(d.outline, d.alpha);
  for (let k = d.segments; k >= 1; k--) {
    const p = segmentAt(d, k);
    g.fillRect(p.x - p.size / 2 - o, p.y - p.size / 2 - o, p.size + o * 2, p.size + o * 2);
  }
  for (let k = d.segments; k >= 1; k--) {
    const p = segmentAt(d, k);
    g.fillStyle(d.body, d.alpha).fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    if (d.scale < DETAIL_SCALE) continue;
    g.fillStyle(d.crest, d.alpha).fillRect(
      p.x - p.size / 2,
      p.y + p.size * 0.15,
      p.size,
      p.size * 0.25,
    );
    if (k % 2 === 1 && p.size > 6) {
      g.fillStyle(d.crest, d.alpha).fillRect(
        p.x - p.size * 0.15,
        p.y - p.size * 0.85,
        p.size * 0.3,
        p.size * 0.4,
      );
    }
  }
  // Tail flame: two small glowing squares off the last segment.
  const tail = segmentAt(d, d.segments);
  g.fillStyle(d.core, d.alpha * 0.8).fillRect(
    tail.x - d.direction * tail.size,
    tail.y - tail.size * 0.3,
    tail.size * 0.6,
    tail.size * 0.6,
  );
}

/** Long head: outline pass for the silhouette, then every part in order; a trailing whisker. */
function head(g: Graphics, d: DragonLook): void {
  const open = 3 + d.jaw * 8;
  const o = OUTLINE * Math.max(0.6, d.scale);
  g.fillStyle(d.outline, d.alpha);
  for (const part of HEAD) {
    if (!part[5]) continue;
    const r = placePart(d, part, open, o);
    g.fillRect(r.x, r.y, r.w, r.h);
  }
  // Small, far dragons skip the fine details (they would be a pixel or two anyway).
  const detailed = d.scale >= DETAIL_SCALE;
  for (const part of HEAD) {
    if (!detailed && !part[5] && part[4] !== 'core') continue;
    const r = placePart(d, part, open, 0);
    g.fillStyle(toneColor(d, part[4]), d.alpha).fillRect(r.x, r.y, r.w, r.h);
  }
  const s = d.scale;
  const back = -d.direction;
  const sway = Math.sin(d.wave) * 6 * s;
  g.lineStyle(Math.max(1, 2.5 * s), d.core, d.alpha * 0.9);
  g.lineBetween(d.x - back * 30 * s, d.y + 2 * s, d.x - back * 6 * s, d.y + 16 * s + sway);
  g.lineBetween(d.x - back * 6 * s, d.y + 16 * s + sway, d.x + back * 22 * s, d.y + 20 * s);
}

/** A full dragon: a soft glow under it, the body behind, the head on top. */
export function dragon(g: Graphics, glow: Graphics, d: DragonLook): void {
  if (d.alpha <= 0.02 || d.scale <= 0.05) return;
  const s = d.scale;
  if (s >= DETAIL_SCALE) {
    glow.fillStyle(d.body, 0.25 * d.alpha);
    glow.fillRect(d.x - 26 * s, d.y - 22 * s, 64 * s, 44 * s);
  }
  body(g, d);
  head(g, d);
}

/** Afterimage of a head a little behind it (glow layer only): reads as speed. */
export function dragonGhost(glow: Graphics, d: DragonLook, offset: number): void {
  if (d.alpha <= 0.02) return;
  const s = d.scale;
  const x = d.x - d.direction * offset * s;
  glow.fillStyle(d.body, 0.3 * d.alpha);
  glow.fillRect(x - 16 * s, d.y - 14 * s, 26 * s, 24 * s);
  glow.fillRect(d.direction > 0 ? x + 8 * s : x - 38 * s, d.y - 10 * s, 30 * s, 11 * s);
}

/** A far, tiny dragon silhouette (a head block and three fading segments): cheap depth filler. */
export function dragonSpeck(
  g: Graphics,
  x: number,
  y: number,
  direction: 1 | -1,
  size: number,
  color: number,
  alpha: number,
): void {
  if (alpha <= 0.02) return;
  g.fillStyle(color, alpha);
  g.fillRect(direction > 0 ? x : x - size * 1.8, y - size * 0.4, size * 1.8, size * 0.7);
  for (let k = 1; k <= 3; k++) {
    const sx = x - direction * k * size * 0.9;
    const sy = y + Math.sin(x * 0.05 + k) * size * 0.3;
    const side = size * (0.7 - k * 0.15);
    g.fillStyle(color, alpha * (1 - k * 0.22)).fillRect(sx - side / 2, sy - side / 2, side, side);
  }
}
