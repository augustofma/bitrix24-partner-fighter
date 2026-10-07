import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config/display';

/** Arena lights of the art (game px): the light rigs, the trophy and the globe's rim. */
const LIGHTS: readonly { x: number; y: number; size: number; tint: number; ms: number }[] = [
  { x: 44, y: 10, size: 120, tint: 0x8fd8ff, ms: 2300 },
  { x: 150, y: 56, size: 110, tint: 0x8fd8ff, ms: 2700 },
  { x: 800, y: 56, size: 110, tint: 0xc9a8ff, ms: 2500 },
  { x: 910, y: 10, size: 120, tint: 0xc9a8ff, ms: 2100 },
  { x: 481, y: 300, size: 90, tint: 0xfff1b0, ms: 1900 },
  { x: 480, y: 26, size: 260, tint: 0x3f7bff, ms: 3400 },
];
const LIGHT_ALPHA = { min: 0.06, max: 0.22 } as const;

/** Sparks drifting up through the arena (a fixed pool, redrawn every frame). */
const PARTICLES = 34;
const PARTICLE_COLORS = [0x7fe3ff, 0xc28bff, 0xffd86b, 0xffffff] as const;

/** Deterministic 0..1 value from an integer (visual variety only). */
function hash01(n: number, salt: number): number {
  const x = Math.sin(n * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Life on the title background: the arena lights pulse softly (additive glows, one tween each,
 * created once) and small sparks drift up and twinkle (one Graphics, positions computed from
 * time, nothing created per frame).
 */
export class TitleAmbience {
  private readonly lights: Phaser.GameObjects.Image[] = [];
  private readonly sparks: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, glowKey: string, depth: number) {
    for (const light of LIGHTS) {
      const glow = scene.add
        .image(light.x, light.y, glowKey)
        .setDisplaySize(light.size, light.size)
        .setTint(light.tint)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(LIGHT_ALPHA.min)
        .setDepth(depth);
      scene.tweens.add({
        targets: glow,
        alpha: LIGHT_ALPHA.max,
        duration: light.ms,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.lights.push(glow);
    }
    this.sparks = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(depth);
  }

  update(timeSeconds: number): void {
    const g = this.sparks.clear();
    for (let i = 0; i < PARTICLES; i++) {
      const speed = 10 + 22 * hash01(i, 1); // px per second, upward
      const travel = GAME_HEIGHT + 40;
      const y = GAME_HEIGHT + 20 - ((timeSeconds * speed + hash01(i, 2) * travel) % travel);
      const x = hash01(i, 3) * GAME_WIDTH + Math.sin(timeSeconds * 0.6 + i) * 6;
      const twinkle = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(timeSeconds * (1.5 + hash01(i, 4)) + i));
      const size = hash01(i, 5) < 0.25 ? 3 : 2;
      const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length] ?? 0xffffff;
      g.fillStyle(color, twinkle).fillRect(Math.round(x), Math.round(y), size, size);
    }
  }

  destroy(): void {
    for (const light of this.lights) light.destroy();
    this.sparks.destroy();
  }
}
