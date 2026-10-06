import type Phaser from 'phaser';
import type { Vec2 } from '../types/geometry';
import { COLORS, DEPTH } from '../ui/theme';

export type HitEffectKind = 'hit' | 'block' | 'ko';

const EFFECTS: Record<HitEffectKind, { color: number; radius: number; rays: number; ms: number }> =
  {
    hit: { color: COLORS.hitSpark, radius: 22, rays: 8, ms: 180 },
    block: { color: COLORS.blockSpark, radius: 18, rays: 6, ms: 150 },
    ko: { color: COLORS.koSpark, radius: 40, rays: 12, ms: 420 },
  };

/** Short-lived impact sparks. Purely cosmetic. */
export class HitEffects {
  private readonly live = new Set<Phaser.GameObjects.Graphics>();

  constructor(private readonly scene: Phaser.Scene) {}

  /** Removes every spark still on screen (e.g. when a new round starts). */
  clear(): void {
    for (const g of this.live) {
      this.scene.tweens.killTweensOf(g);
      g.destroy();
    }
    this.live.clear();
  }

  spawn(point: Vec2, kind: HitEffectKind): void {
    const { color, radius, rays, ms } = EFFECTS[kind];
    const g = this.scene.add.graphics().setPosition(point.x, point.y).setDepth(DEPTH.effects);
    g.fillStyle(COLORS.white, 0.9).fillCircle(0, 0, radius * 0.45);
    g.lineStyle(4, color, 1).strokeCircle(0, 0, radius * 0.7);
    for (let i = 0; i < rays; i++) {
      const angle = (i / rays) * Math.PI * 2;
      g.lineBetween(
        Math.cos(angle) * radius * 0.8,
        Math.sin(angle) * radius * 0.8,
        Math.cos(angle) * radius * 1.5,
        Math.sin(angle) * radius * 1.5,
      );
    }
    g.setScale(0.4);
    this.live.add(g);
    this.scene.tweens.add({
      targets: g,
      scale: 1.3,
      alpha: 0,
      duration: ms,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.live.delete(g);
        g.destroy();
      },
    });
  }
}
