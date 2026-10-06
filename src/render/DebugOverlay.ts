import type Phaser from 'phaser';
import type { ReadonlyFighter } from '../core/fighter/ReadonlyFighter';
import type { Rect } from '../types/geometry';
import { DEPTH } from '../ui/theme';

const HURTBOX_COLOR = 0x3ddc84;
const HITBOX_COLOR = 0xff3b3b;
const PUSHBOX_COLOR = 0x4da3ff;

/** Draws hurtboxes (green), hitboxes (red) and pushboxes (blue). Toggle with F2 or ?debug=1. */
export class DebugOverlay {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private enabled: boolean;

  constructor(scene: Phaser.Scene, enabled: boolean) {
    this.graphics = scene.add.graphics().setDepth(DEPTH.debug);
    this.enabled = enabled;
  }

  toggle(): void {
    this.enabled = !this.enabled;
    if (!this.enabled) this.graphics.clear();
  }

  draw(fighters: readonly ReadonlyFighter[]): void {
    if (!this.enabled) return;
    const g = this.graphics;
    g.clear();
    for (const fighter of fighters) {
      this.box(fighter.getPushbox(), PUSHBOX_COLOR, 0);
      this.box(fighter.getHurtbox(), HURTBOX_COLOR, 0.15);
      this.box(fighter.getHitbox(), HITBOX_COLOR, 0.4);
      g.fillStyle(0xffffff, 1).fillCircle(fighter.position.x, fighter.position.y, 3);
    }
  }

  private box(rect: Rect | null, color: number, fillAlpha: number): void {
    if (!rect) return;
    this.graphics.fillStyle(color, fillAlpha).fillRect(rect.x, rect.y, rect.width, rect.height);
    this.graphics.lineStyle(2, color, 1).strokeRect(rect.x, rect.y, rect.width, rect.height);
  }
}
