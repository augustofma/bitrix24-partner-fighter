import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import { COLORS } from './theme';

const STRIPE_SPACING = 48;
const STRIPE_SPEED_MS = 1800;
const SCANLINE_SPACING = 4;

/** Animated diagonal stripes + scanlines shared by the menu-type screens. */
export function createArcadeBackground(
  scene: Phaser.Scene,
  top: number = COLORS.ink,
  bottom: number = COLORS.panel,
): void {
  scene.add
    .graphics()
    .fillGradientStyle(top, top, bottom, bottom, 1)
    .fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  const stripes = scene.add.graphics();
  stripes.lineStyle(14, COLORS.white, 0.035);
  for (let x = -GAME_HEIGHT; x < GAME_WIDTH + STRIPE_SPACING; x += STRIPE_SPACING) {
    stripes.lineBetween(x, GAME_HEIGHT, x + GAME_HEIGHT, 0);
  }
  scene.tweens.add({ targets: stripes, x: STRIPE_SPACING, duration: STRIPE_SPEED_MS, repeat: -1 });

  const scanlines = scene.add.graphics();
  scanlines.fillStyle(0x000000, 0.12);
  for (let y = 0; y < GAME_HEIGHT; y += SCANLINE_SPACING) scanlines.fillRect(0, y, GAME_WIDTH, 1);
}
