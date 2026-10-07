import type Phaser from 'phaser';
import {
  brazilOutline,
  isInside,
  projectToMap,
  type MapPoint,
  type MapRect,
} from '../../story/brazilMap';
import { COLORS } from '../theme';

/** Size of one map "pixel". */
const CELL = 5;
const LAND = [0x18237a, 0x1c2a8c, 0x15206b] as const;
const COAST = COLORS.neon;
const OCEAN_DOT = 0x1d2a74;
const GRID_EVERY = 6;
const GLOW_ALPHA = 0.07;
/** Equator and Tropic of Capricorn, drawn as faint magenta dashes (arcade map flavor). */
const REFERENCE_LATITUDES = [0, -23.44] as const;
const DASH_CELLS = 2;

/**
 * Stylized pixel-art Brazil for the travel map: the projected outline rasterized into chunky
 * cells (navy land with a light dither, a neon cyan coastline) over a dotted dark ocean, like
 * the travel maps of classic arcade fighters. Generated once into a texture.
 */
export function createBrazilMap(scene: Phaser.Scene, rect: MapRect): Phaser.GameObjects.Image {
  const key = `story:brazil-map:${rect.width}x${rect.height}`;
  if (!scene.textures.exists(key)) {
    const g = scene.add.graphics();
    paint(g, rect);
    g.generateTexture(key, rect.width, rect.height);
    g.destroy();
  }
  scene.add.ellipse(
    rect.x + rect.width * 0.62,
    rect.y + rect.height * 0.45,
    rect.width,
    rect.height * 0.9,
    COLORS.neon,
    GLOW_ALPHA,
  );
  return scene.add.image(rect.x, rect.y, key).setOrigin(0);
}

function paint(g: Phaser.GameObjects.Graphics, rect: MapRect): void {
  const outline = brazilOutline({ x: 0, y: 0, width: rect.width, height: rect.height });
  const cols = Math.ceil(rect.width / CELL);
  const rows = Math.ceil(rect.height / CELL);
  const land = (col: number, row: number): boolean =>
    col >= 0 && row >= 0 && col < cols && row < rows && isInside(center(col, row), outline);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (land(col, row)) {
        const coast =
          !land(col + 1, row) || !land(col - 1, row) || !land(col, row + 1) || !land(col, row - 1);
        g.fillStyle(coast ? COAST : (LAND[Math.floor(hash(col, row) * LAND.length)] ?? LAND[0]), 1);
        g.fillRect(col * CELL, row * CELL, CELL, CELL);
      } else if (col % GRID_EVERY === 0 && row % GRID_EVERY === 0) {
        g.fillStyle(OCEAN_DOT, 1);
        g.fillRect(col * CELL + 1, row * CELL + 1, CELL - 2, CELL - 2);
      }
    }
  }
  g.fillStyle(COLORS.magenta, 0.45);
  for (const latitude of REFERENCE_LATITUDES) {
    const { y } = projectToMap(latitude, 0, { x: 0, y: 0, width: rect.width, height: rect.height });
    for (let col = 0; col < cols; col += DASH_CELLS * 2) {
      g.fillRect(col * CELL, Math.round(y), CELL * DASH_CELLS, 2);
    }
  }
}

/** Deterministic 0..1 noise for the land dither (no visible stripes or patterns). */
function hash(x: number, y: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function center(col: number, row: number): MapPoint {
  return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
}
