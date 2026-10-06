import type Phaser from 'phaser';
import { DEPTH } from '../ui/theme';

const SHADOW_WIDTH = 90;
const SHADOW_HEIGHT = 16;
const SHADOW_ALPHA = 0.35;
/** The shadow shrinks to this scale at SHADOW_FADE_HEIGHT px above the ground. */
const SHADOW_MIN_SCALE = 0.5;
const SHADOW_FADE_HEIGHT = 200;

/** Ground shadow shared by every fighter view; stays on the floor while the fighter jumps. */
export class FighterShadow {
  private readonly ellipse: Phaser.GameObjects.Ellipse;

  constructor(
    scene: Phaser.Scene,
    private readonly groundY: number,
  ) {
    this.ellipse = scene.add
      .ellipse(0, groundY, SHADOW_WIDTH, SHADOW_HEIGHT, 0x000000, SHADOW_ALPHA)
      .setDepth(DEPTH.shadows);
  }

  update(x: number, y: number): void {
    const height = this.groundY - y;
    const scale = Math.max(SHADOW_MIN_SCALE, 1 - height / SHADOW_FADE_HEIGHT);
    this.ellipse.setPosition(x, this.groundY).setScale(scale);
  }

  destroy(): void {
    this.ellipse.destroy();
  }
}
