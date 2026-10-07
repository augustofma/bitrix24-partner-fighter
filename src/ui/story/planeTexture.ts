import type Phaser from 'phaser';
import { COLORS } from '../theme';

const KEY = 'story:plane';
/** Screen pixels per art pixel. */
const PIXEL = 2;

/**
 * Original top-down pixel plane, facing right (rotation 0 = flying right): white fuselage
 * with cyan windows, gold swept wings, magenta tail and an orange nose, outlined in ink.
 */
const ART = [
  '.....gg.........',
  '......gg........',
  '......ggg.......',
  '.......ggg......',
  '.t......ggg.....',
  'ttwwwwwwwwwwwwn.',
  'twwcwwcwwcwwwwnn',
  'ttwwwwwwwwwwwwn.',
  '.t......ggg.....',
  '.......ggg......',
  '......ggg.......',
  '......gg........',
  '.....gg.........',
] as const;

const COLORS_BY_CHAR: Readonly<Record<string, number>> = {
  w: 0xf4f1e8,
  c: COLORS.neon,
  g: COLORS.gold,
  t: COLORS.magenta,
  n: COLORS.orange,
};

/** Texture key of the plane (generated on first use). */
export function planeTexture(scene: Phaser.Scene): string {
  if (scene.textures.exists(KEY)) return KEY;
  const width = (ART[0].length + 2) * PIXEL;
  const height = (ART.length + 2) * PIXEL;
  const g = scene.add.graphics();
  const each = (paint: (x: number, y: number, char: string) => void) =>
    ART.forEach((row, y) =>
      [...row].forEach((char, x) => char !== '.' && paint(x + 1, y + 1, char)),
    );
  // Ink outline: every filled pixel's neighbours first, then the colors on top.
  g.fillStyle(COLORS.ink, 1);
  each((x, y) => g.fillRect((x - 1) * PIXEL, (y - 1) * PIXEL, PIXEL * 3, PIXEL * 3));
  each((x, y, char) => {
    g.fillStyle(COLORS_BY_CHAR[char] ?? COLORS.white, 1);
    g.fillRect(x * PIXEL, y * PIXEL, PIXEL, PIXEL);
  });
  g.generateTexture(KEY, width, height);
  g.destroy();
  return KEY;
}
