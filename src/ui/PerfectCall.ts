import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import { STRINGS } from '../config/strings';
import { sparkTexture } from './hud/SpecialReadyEffect';
import { COLORS, DEPTH } from './theme';
import { createFightTitle } from './victory/fightTitle';

/*
 * "PERFECT": the big gold call after a round won without losing any health. Same fight
 * lettering as the rest of the game (gold palette), a soft additive glow, a short spark burst
 * and a scale pop: 0.5 -> 1.15 -> 1.0 in ~420 ms, held ~1 s, then out. Built once per fight and
 * reused every round.
 */

/** Slightly larger than the regular announcer calls. */
const SIZE = 1.2;
const Y = GAME_HEIGHT * 0.4;
const POP = { from: 0.5, overshoot: 1.15, upMs: 240, settleMs: 180 } as const;
export const PERFECT_HOLD_MS = 1000;
const OUT_MS = 220;
const GLOW = { scale: 1.06, minAlpha: 0.22, maxAlpha: 0.5, breathMs: 360 } as const;
const SPARKS = 26;

export class PerfectCall {
  private readonly title: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly baseScale: number;

  constructor(private readonly scene: Phaser.Scene) {
    const x = GAME_WIDTH / 2;
    this.glow = createFightTitle(scene, x, Y, STRINGS.perfect, 'gold')
      .setTint(COLORS.gold)
      .setBlendMode('ADD');
    this.title = createFightTitle(scene, x, Y, STRINGS.perfect, 'gold');
    this.baseScale = this.title.scaleX * SIZE;
    this.sparks = scene.add.particles(x, Y, sparkTexture(scene), {
      lifespan: 650,
      speed: { min: 140, max: 360 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.8, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [COLORS.gold, COLORS.orange, COLORS.white],
      emitting: false,
    });
    const objects = [this.glow, this.sparks, this.title];
    objects.forEach((object, i) => object.setScrollFactor(0).setDepth(DEPTH.announcer + 1 + i));
    this.hide();
  }

  /** Total time on screen (pop + hold + exit), for callers that need to wait for it. */
  static get durationMs(): number {
    return POP.upMs + POP.settleMs + PERFECT_HOLD_MS + OUT_MS;
  }

  show(): void {
    this.hide();
    const scale = this.baseScale;
    this.title
      .setVisible(true)
      .setAlpha(1)
      .setScale(scale * POP.from);
    this.glow
      .setVisible(true)
      .setAlpha(0)
      .setScale(scale * POP.from * GLOW.scale);
    this.scene.tweens.chain({
      targets: this.title,
      tweens: [
        { scale: scale * POP.overshoot, duration: POP.upMs, ease: 'Quad.easeOut' },
        { scale, duration: POP.settleMs, ease: 'Back.easeOut' },
        { alpha: 0, delay: PERFECT_HOLD_MS, duration: OUT_MS, ease: 'Quad.easeIn' },
      ],
      onComplete: () => this.hide(),
    });
    this.scene.tweens.add({
      targets: this.glow,
      scale: scale * GLOW.scale,
      duration: POP.upMs + POP.settleMs,
      ease: 'Back.easeOut',
    });
    // Discreet breathing glow while it holds, gone with the title.
    this.scene.tweens.add({
      targets: this.glow,
      alpha: { from: GLOW.minAlpha, to: GLOW.maxAlpha },
      duration: GLOW.breathMs,
      yoyo: true,
      repeat: Math.ceil((POP.upMs + POP.settleMs + PERFECT_HOLD_MS) / (GLOW.breathMs * 2)) - 1,
      onComplete: () => this.scene.tweens.add({ targets: this.glow, alpha: 0, duration: OUT_MS }),
    });
    this.sparks.explode(SPARKS);
  }

  /** Off the screen at once (e.g. the next round is starting). */
  hide(): void {
    this.scene.tweens.killTweensOf([this.title, this.glow]);
    this.title.setVisible(false);
    this.glow.setVisible(false);
  }
}
