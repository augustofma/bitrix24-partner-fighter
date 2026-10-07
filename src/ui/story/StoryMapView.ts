import type Phaser from 'phaser';
import {
  isInside,
  projectOutline,
  projectToMap,
  type MapPoint,
  type MapRect,
} from '../../story/brazilMap';
import type { MapView } from '../../story/mapViews';
import { COLORS } from '../theme';

/** Size of one map "pixel". */
const CELL = 5;
/** Land colors (light dither picked per cell). */
const LAND = [0x18237a, 0x1c2a8c, 0x15206b] as const;
/** Brazil on the world map: brighter, so the campaign's home stands out. */
const HOME_LAND = [0x2738b0, 0x2d40c2, 0x22329e] as const;
const COAST = COLORS.neon;
/** Coast of foreign land on the world map: the same neon, dimmed. */
const FOREIGN_COAST = 0x1a8fb0;
const HOME_BORDER = COLORS.gold;
const OCEAN_DOT = 0x1d2a74;
const GRID_EVERY = 6;
const GLOW_ALPHA = 0.07;
const DASH_CELLS = 2;

type Cell = 0 | 1 | 2; // ocean, land, home (Brazil)

/**
 * Pixel-art travel map for a view: the projected outlines rasterized into chunky cells (navy
 * land with a light dither, neon coastlines) over a dotted dark ocean, with faint magenta
 * reference parallels. Brazil view: Brazil alone, as before. World view: every landmass, with
 * Brazil brighter and outlined in gold. Generated once per view into a texture.
 */
export function createStoryMap(
  scene: Phaser.Scene,
  view: MapView,
  rect: MapRect,
): Phaser.GameObjects.Image {
  const key = `story:map:${view.id}:${rect.width}x${rect.height}`;
  if (!scene.textures.exists(key)) {
    const g = scene.add.graphics();
    paint(g, view, rect);
    g.generateTexture(key, rect.width, rect.height);
    g.destroy();
  }
  scene.add.ellipse(
    rect.x + rect.width * (view.id === 'brazil' ? 0.62 : 0.5),
    rect.y + rect.height * 0.45,
    rect.width,
    rect.height * 0.9,
    COLORS.neon,
    GLOW_ALPHA,
  );
  return scene.add.image(rect.x, rect.y, key).setOrigin(0);
}

function paint(g: Phaser.GameObjects.Graphics, view: MapView, rect: MapRect): void {
  const local = { x: 0, y: 0, width: rect.width, height: rect.height };
  const cols = Math.ceil(rect.width / CELL);
  const rows = Math.ceil(rect.height / CELL);
  const grid = rasterize(view, local, cols, rows);
  const at = (col: number, row: number): Cell =>
    col >= 0 && row >= 0 && col < cols && row < rows ? (grid[row * cols + col] ?? 0) : 0;
  const worldMap = view.landmasses.length > 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = at(col, row);
      if (cell === 0) {
        if (col % GRID_EVERY === 0 && row % GRID_EVERY === 0) {
          g.fillStyle(OCEAN_DOT, 1);
          g.fillRect(col * CELL + 1, row * CELL + 1, CELL - 2, CELL - 2);
        }
        continue;
      }
      const neighbors = [at(col + 1, row), at(col - 1, row), at(col, row + 1), at(col, row - 1)];
      const coast = neighbors.some((n) => n === 0);
      const border = cell === 2 && neighbors.some((n) => n !== 2);
      const dither = Math.floor(hash(col, row) * LAND.length);
      let color: number;
      if (cell === 2 && worldMap)
        color = border ? HOME_BORDER : (HOME_LAND[dither] ?? HOME_LAND[0]);
      else if (coast) color = worldMap ? FOREIGN_COAST : COAST;
      else color = LAND[dither] ?? LAND[0];
      g.fillStyle(color, 1);
      g.fillRect(col * CELL, row * CELL, CELL, CELL);
    }
  }
  g.fillStyle(COLORS.magenta, 0.45);
  for (const latitude of view.referenceLatitudes) {
    const { y } = projectToMap(latitude, 0, local, view.bounds);
    for (let col = 0; col < cols; col += DASH_CELLS * 2) {
      g.fillRect(col * CELL, Math.round(y), CELL * DASH_CELLS, 2);
    }
  }
}

/** Which cells are ocean, land or home, testing each polygon only inside its bounding box. */
function rasterize(view: MapView, rect: MapRect, cols: number, rows: number): Cell[] {
  const grid: Cell[] = new Array<Cell>(cols * rows).fill(0);
  const fill = (outline: readonly MapPoint[], value: Cell) => {
    const xs = outline.map((p) => p.x);
    const ys = outline.map((p) => p.y);
    const [c0, c1] = [Math.floor(Math.min(...xs) / CELL), Math.ceil(Math.max(...xs) / CELL)];
    const [r0, r1] = [Math.floor(Math.min(...ys) / CELL), Math.ceil(Math.max(...ys) / CELL)];
    for (let row = Math.max(0, r0); row <= Math.min(rows - 1, r1); row++) {
      for (let col = Math.max(0, c0); col <= Math.min(cols - 1, c1); col++) {
        if (isInside(center(col, row), outline)) grid[row * cols + col] = value;
      }
    }
  };
  for (const landmass of view.landmasses) fill(projectOutline(landmass, rect, view.bounds), 1);
  fill(projectOutline(view.home, rect, view.bounds), 2);
  return grid;
}

/** Deterministic 0..1 noise for the land dither (no visible stripes or patterns). */
function hash(x: number, y: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function center(col: number, row: number): MapPoint {
  return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
}
