import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config/display';
import { COLORS } from '../theme';

/** Size of one "pixel" of the illustrated map. */
const CELL = 6;
const COLS = Math.ceil(GAME_WIDTH / CELL);
const ROWS = Math.ceil(GAME_HEIGHT / CELL);
const TEXTURE_KEY = 'select-map-background';

const SEA_TOP = 0x0f5868;
const SEA_BOTTOM = 0x06303b;
const WAVE = 0x2a8f98;
const GRASS = [0x2f8f45, 0x29803d, 0x3a9c4c] as const;
const FOREST = 0x1b5e2e;
const HILL = 0x5f8a5a;
const RIVER = 0x2aa3b8;
const BEACH = COLORS.sand;
/** Darkening on top of the map so the UI panels always win the contrast. */
const SHADE_ALPHA = 0.24;
const CLOUD_DRIFT_PX = 60;
const CLOUD_DRIFT_MS = 26000;

/** Land masses as ellipses in normalized screen space: [cx, cy, rx, ry]. */
const LAND: readonly (readonly [number, number, number, number])[] = [
  [0.52, 0.64, 0.36, 0.32],
  [0.3, 0.5, 0.2, 0.2],
  [0.74, 0.74, 0.16, 0.2],
  [0.08, 0.86, 0.05, 0.07],
  [0.92, 0.26, 0.05, 0.07],
  [0.18, 0.16, 0.045, 0.06],
];
/** Beach width as a fraction of the normalized distance to the coast. */
const BEACH_BAND = 0.1;

/**
 * Illustrated pixel-art backdrop for the select screen: a stylized tropical coast at dusk
 * (sea, beaches, forests, hills, a river, a colorful hillside village, palms and a sailboat),
 * generated procedurally and deterministically (no image assets), then shaded so the UI stays
 * readable. A cloud layer drifts slowly on top for a light parallax.
 */
export function createSelectBackground(scene: Phaser.Scene): void {
  if (!scene.textures.exists(TEXTURE_KEY)) {
    const g = scene.add.graphics();
    paintMap(g);
    g.generateTexture(TEXTURE_KEY, GAME_WIDTH, GAME_HEIGHT);
    g.destroy();
  }
  scene.add.image(0, 0, TEXTURE_KEY).setOrigin(0);
  scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.ink, SHADE_ALPHA).setOrigin(0);

  const clouds = scene.add.graphics();
  paintClouds(clouds);
  scene.tweens.add({
    targets: clouds,
    x: CLOUD_DRIFT_PX,
    duration: CLOUD_DRIFT_MS,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  const scanlines = scene.add.graphics();
  scanlines.fillStyle(0x000000, 0.1);
  for (let y = 0; y < GAME_HEIGHT; y += 4) scanlines.fillRect(0, y, GAME_WIDTH, 1);
}

function paintMap(g: Phaser.GameObjects.Graphics): void {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      g.fillStyle(cellColor(col, row), 1);
      g.fillRect(col * CELL, row * CELL, CELL, CELL);
    }
  }
  paintHills(g);
  paintVillage(g, 0.62, 0.5);
  for (const [u, v] of [
    [0.38, 0.8],
    [0.45, 0.83],
    [0.86, 0.66],
    [0.12, 0.84],
    [0.2, 0.42],
  ] as const) {
    paintPalm(g, cellAt(u, GAME_WIDTH), cellAt(v, GAME_HEIGHT));
  }
  paintBoat(g, cellAt(0.88, GAME_WIDTH), cellAt(0.48, GAME_HEIGHT));
  paintBoat(g, cellAt(0.06, GAME_WIDTH), cellAt(0.3, GAME_HEIGHT));
}

function cellColor(col: number, row: number): number {
  const u = (col + 0.5) / COLS;
  const v = (row + 0.5) / ROWS;
  const coast = coastDistance(u, v) + (hash(col, row) - 0.5) * 0.08;
  if (coast > 1) {
    if (hash(col * 3, row * 7) < 0.025) return WAVE;
    // Two-tone dither between the sea bands reads as pixel-art shading.
    const band = v + ((col + row) % 2) * 0.04;
    return band < 0.55 ? SEA_TOP : SEA_BOTTOM;
  }
  if (coast > 1 - BEACH_BAND) return BEACH;
  if (Math.abs(v - (0.62 + Math.sin(u * 22) * 0.035)) < 0.009 && u > 0.22 && u < 0.78) {
    return RIVER;
  }
  if (smoothNoise(col / 7, row / 7) > 0.62) return FOREST;
  return GRASS[Math.floor(hash(col, row) * GRASS.length)] ?? GRASS[0];
}

/** < 1 inside some land mass (normalized ellipse distance), > 1 at sea. */
function coastDistance(u: number, v: number): number {
  let best = Infinity;
  for (const [cx, cy, rx, ry] of LAND) {
    best = Math.min(best, Math.hypot((u - cx) / rx, (v - cy) / ry));
  }
  return best;
}

/** Rounded granite hills by the bay (stepped pixel domes). */
function paintHills(g: Phaser.GameObjects.Graphics): void {
  const hills: readonly (readonly [number, number, number])[] = [
    [0.27, 0.36, 7],
    [0.33, 0.34, 10],
    [0.4, 0.38, 6],
  ];
  for (const [u, v, size] of hills) {
    const cx = cellAt(u, GAME_WIDTH);
    const base = cellAt(v, GAME_HEIGHT);
    for (let step = 0; step < size; step++) {
      const half = Math.max(1, Math.round(Math.sqrt(size * size - step * step) / 1.6));
      g.fillStyle(step < size - 2 ? HILL : 0x86a77c, 1);
      g.fillRect((cx - half) * CELL, (base - step) * CELL, half * 2 * CELL, CELL);
    }
  }
}

/** A cluster of colorful little houses climbing a hill. */
function paintVillage(g: Phaser.GameObjects.Graphics, u: number, v: number): void {
  const colors = [0xff8a1f, 0xffd23f, 0xff5d8f, 0x37c4b4, 0xf4f1e8, 0x5aa0ff] as const;
  const left = cellAt(u, GAME_WIDTH);
  const top = cellAt(v, GAME_HEIGHT);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5 - row; col++) {
      const x = (left + col * 2 + row) * CELL;
      const y = (top - row * 2) * CELL;
      g.fillStyle(colors[(col + row * 2) % colors.length] ?? COLORS.white, 1);
      g.fillRect(x, y, CELL * 2 - 2, CELL * 2 - 2);
      g.fillStyle(COLORS.ink, 0.8);
      g.fillRect(x + 3, y + 5, 3, 3);
    }
  }
}

function paintPalm(g: Phaser.GameObjects.Graphics, col: number, row: number): void {
  g.fillStyle(0x7a4a22, 1);
  g.fillRect(col * CELL, row * CELL, CELL, CELL * 3);
  g.fillStyle(0x3fbf4f, 1);
  for (const [dx, dy] of [
    [-2, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
    [2, 0],
    [-1, 0],
    [1, 0],
  ] as const) {
    g.fillRect((col + dx) * CELL, (row + dy) * CELL, CELL, CELL);
  }
}

function paintBoat(g: Phaser.GameObjects.Graphics, col: number, row: number): void {
  g.fillStyle(0x8a5a2b, 1);
  g.fillRect((col - 1) * CELL, row * CELL, CELL * 3, CELL);
  g.fillStyle(0xf4f1e8, 1);
  g.fillRect(col * CELL, (row - 2) * CELL, CELL, CELL * 2);
  g.fillRect((col + 1) * CELL, (row - 1) * CELL, CELL, CELL);
}

function paintClouds(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(COLORS.white, 0.14);
  for (const [u, v, length] of [
    [0.06, 0.2, 14],
    [0.58, 0.12, 18],
    [0.8, 0.9, 12],
    [0.3, 0.94, 16],
  ] as const) {
    const x = u * GAME_WIDTH;
    const y = v * GAME_HEIGHT;
    g.fillRect(x, y, length * CELL, CELL * 2);
    g.fillRect(x + CELL * 3, y - CELL, (length - 6) * CELL, CELL);
  }
}

function cellAt(fraction: number, size: number): number {
  return Math.round((fraction * size) / CELL);
}

/** Deterministic 0..1 hash, so the map is identical on every visit. */
function hash(x: number, y: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

/** Bilinear value noise for blobby forests. */
function smoothNoise(x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const top = hash(x0, y0) * (1 - fx) + hash(x0 + 1, y0) * fx;
  const bottom = hash(x0, y0 + 1) * (1 - fx) + hash(x0 + 1, y0 + 1) * fx;
  return top * (1 - fy) + bottom * fy;
}
