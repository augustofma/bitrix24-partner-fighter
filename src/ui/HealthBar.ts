import type Phaser from 'phaser';
import { COLORS } from './theme';

/** Below this ratio the bar turns orange. */
const LOW_HEALTH_RATIO = 0.3;
/** Speed (ratio per frame) at which the white "damage trail" catches up. */
const TRAIL_SPEED = 0.01;
const BORDER = 3;

/**
 * Arcade health bar. `anchor` is the side the bar is attached to: it drains toward it.
 * Player 1 (left) is anchored on the right (center of screen), player 2 on the left.
 */
export class HealthBar {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private ratio = 1;
  private trailRatio = 1;

  constructor(
    scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly width: number,
    private readonly height: number,
    private readonly anchor: 'left' | 'right',
  ) {
    this.graphics = scene.add.graphics();
    this.redraw();
  }

  get gameObject(): Phaser.GameObjects.Graphics {
    return this.graphics;
  }

  setRatio(ratio: number): void {
    this.ratio = Math.max(0, Math.min(1, ratio));
    if (this.ratio > this.trailRatio) this.trailRatio = this.ratio;
  }

  /** Call once per rendered frame. */
  update(): void {
    if (this.trailRatio > this.ratio) {
      this.trailRatio = Math.max(this.ratio, this.trailRatio - TRAIL_SPEED);
    }
    this.redraw();
  }

  private fillRect(ratio: number, color: number): void {
    const w = this.width * ratio;
    const x = this.anchor === 'left' ? this.x : this.x + this.width - w;
    this.graphics.fillStyle(color, 1).fillRect(x, this.y, w, this.height);
  }

  private redraw(): void {
    const g = this.graphics;
    g.clear();
    g.fillStyle(COLORS.ink, 1).fillRect(
      this.x - BORDER,
      this.y - BORDER,
      this.width + BORDER * 2,
      this.height + BORDER * 2,
    );
    g.fillStyle(COLORS.healthBack, 1).fillRect(this.x, this.y, this.width, this.height);
    this.fillRect(this.trailRatio, COLORS.healthTrail);
    this.fillRect(
      this.ratio,
      this.ratio <= LOW_HEALTH_RATIO ? COLORS.healthLow : COLORS.healthFull,
    );
    // Glossy highlight.
    g.fillStyle(COLORS.white, 0.25).fillRect(this.x, this.y + 2, this.width, this.height / 4);
    g.lineStyle(2, COLORS.gold, 1).strokeRect(this.x, this.y, this.width, this.height);
  }
}
