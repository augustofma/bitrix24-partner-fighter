import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config/display';
import { COLORS } from '../theme';

const SPARK_KEY = 'victory:spark';
const SPARK_SIZE = 4;
const CONFETTI_COLORS = [COLORS.neon, COLORS.magenta, COLORS.gold, COLORS.white];
/** Fixed spots for the twinkles (game px), spread around the top half, away from the text. */
const TWINKLES: readonly (readonly [number, number])[] = [
  [140, 150],
  [228, 60],
  [300, 210],
  [700, 170],
  [760, 48],
  [842, 214],
  [96, 300],
  [880, 330],
];
const TWINKLE_MS = 700;

/**
 * Light decorations: pixel confetti falling from the top, neon squares drifting up from the
 * floor and a few twinkles. All behind the card and texts, never in the way of reading.
 */
export function createVictoryEffects(scene: Phaser.Scene): void {
  if (!scene.textures.exists(SPARK_KEY)) {
    const g = scene.add.graphics();
    g.fillStyle(COLORS.white, 1).fillRect(0, 0, SPARK_SIZE, SPARK_SIZE);
    g.generateTexture(SPARK_KEY, SPARK_SIZE, SPARK_SIZE);
    g.destroy();
  }

  scene.add.particles(0, -10, SPARK_KEY, {
    x: { min: 0, max: GAME_WIDTH },
    speedY: { min: 40, max: 95 },
    speedX: { min: -18, max: 18 },
    rotate: { min: 0, max: 360 },
    scale: { min: 0.8, max: 1.6 },
    alpha: { start: 0.95, end: 0.25 },
    lifespan: 6500,
    frequency: 130,
    tint: CONFETTI_COLORS,
  });
  scene.add.particles(0, GAME_HEIGHT + 6, SPARK_KEY, {
    x: { min: 0, max: GAME_WIDTH },
    speedY: { min: -55, max: -25 },
    scale: { min: 0.6, max: 1.2 },
    alpha: { start: 0.6, end: 0 },
    lifespan: 4200,
    frequency: 380,
    tint: [COLORS.neon, COLORS.magenta],
  });

  TWINKLES.forEach(([x, y], i) => {
    const twinkle = scene.add.image(x, y, SPARK_KEY).setScale(1.5).setAlpha(0.1);
    scene.tweens.add({
      targets: twinkle,
      alpha: 1,
      scale: 2.2,
      duration: TWINKLE_MS,
      delay: i * 260,
      yoyo: true,
      repeat: -1,
      repeatDelay: 900,
      ease: 'Sine.easeInOut',
    });
  });
}
