import type Phaser from 'phaser';
import { GAME_WIDTH } from '../../config/display';
import { STRINGS } from '../../config/strings';
import { COLORS, DEPTH, arcadeText, css } from '../theme';
import { COMBO_MIN_SHOWN } from './comboTracker';

/** Under each side's health bar and name, clear of the timer and the round label. */
const POSITION = { insetX: 130, y: 172 } as const;
const HOLD_MS = 1100;
const FADE_MS = 300;
const POP_MS = 160;

/**
 * "n HITS!" on the attacker's side of the HUD, popping on each new hit of a streak and fading
 * a moment after the last one.
 */
export class ComboCounter {
  private readonly labels: [Phaser.GameObjects.Text, Phaser.GameObjects.Text];
  private readonly timers: [Phaser.Time.TimerEvent | null, Phaser.Time.TimerEvent | null] = [
    null,
    null,
  ];

  constructor(private readonly scene: Phaser.Scene) {
    this.labels = ([0, 1] as const).map((side) =>
      scene.add
        .text(
          side === 0 ? POSITION.insetX : GAME_WIDTH - POSITION.insetX,
          POSITION.y,
          '',
          arcadeText(26, COLORS.gold, COLORS.magenta),
        )
        .setOrigin(side === 0 ? 0 : 1, 0.5)
        .setShadow(0, 0, css(COLORS.ink), 6, true, true)
        .setScrollFactor(0)
        .setDepth(DEPTH.hud)
        .setAlpha(0),
    ) as [Phaser.GameObjects.Text, Phaser.GameObjects.Text];
  }

  /** Shows `side`'s streak (nothing under COMBO_MIN_SHOWN). */
  show(side: 0 | 1, hits: number): void {
    if (hits < COMBO_MIN_SHOWN) return;
    const label = this.labels[side];
    this.scene.tweens.killTweensOf(label);
    label.setText(STRINGS.comboHits(hits)).setAlpha(1).setScale(1.35);
    this.scene.tweens.add({ targets: label, scale: 1, duration: POP_MS, ease: 'Back.easeOut' });
    this.timers[side]?.remove();
    this.timers[side] = this.scene.time.delayedCall(HOLD_MS, () => this.hide(side));
  }

  hide(side: 0 | 1): void {
    const label = this.labels[side];
    this.scene.tweens.killTweensOf(label);
    this.scene.tweens.add({ targets: label, alpha: 0, duration: FADE_MS });
  }

  clear(): void {
    for (const side of [0, 1] as const) {
      this.timers[side]?.remove();
      this.timers[side] = null;
      this.scene.tweens.killTweensOf(this.labels[side]);
      this.labels[side].setAlpha(0);
    }
  }
}
