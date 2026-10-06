import type Phaser from 'phaser';
import { GAME_HEIGHT } from '../config/display';
import type { ReadonlyFighter } from '../core/fighter/ReadonlyFighter';
import { clamp } from '../core/geometry';
import type { StageConfig } from '../types/stage';

/** Fraction of the remaining distance the camera travels each frame. */
const FOLLOW_LERP = 0.12;

/** Keeps the midpoint between both fighters centered, never showing outside the arena. */
export class FightCamera {
  private readonly maxScrollX: number;

  constructor(
    private readonly camera: Phaser.Cameras.Scene2D.Camera,
    stage: StageConfig,
  ) {
    camera.setBounds(0, 0, stage.width, GAME_HEIGHT);
    this.maxScrollX = Math.max(0, stage.width - camera.width);
  }

  follow(fighters: readonly ReadonlyFighter[], immediate = false): void {
    if (fighters.length === 0) return;
    const midX = fighters.reduce((sum, f) => sum + f.position.x, 0) / fighters.length;
    const target = clamp(midX - this.camera.width / 2, 0, this.maxScrollX);
    const current = this.camera.scrollX;
    this.camera.scrollX = immediate ? target : current + (target - current) * FOLLOW_LERP;
  }

  shake(durationMs: number, intensity: number): void {
    this.camera.shake(durationMs, intensity);
  }
}
