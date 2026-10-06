import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import { COLORS, DEPTH, arcadeText, css } from './theme';

/** Big centered arcade messages: "ROUND 1", "FIGHT!", "K.O.", "TIME OVER". */
export class Announcer {
  private readonly text: Phaser.GameObjects.Text;

  constructor(private readonly scene: Phaser.Scene) {
    this.text = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.4, '', arcadeText(84, COLORS.gold, COLORS.ink))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.announcer)
      .setVisible(false);
  }

  /** Shows a message; `holdMs` = 0 keeps it on screen until the next one. */
  show(message: string, holdMs = 900, color: number = COLORS.gold): void {
    this.scene.tweens.killTweensOf(this.text);
    this.text.setText(message).setColor(css(color)).setVisible(true).setAlpha(1).setScale(2.2);
    this.scene.tweens.add({ targets: this.text, scale: 1, duration: 220, ease: 'Back.easeOut' });
    if (holdMs > 0) {
      this.scene.tweens.add({
        targets: this.text,
        alpha: 0,
        delay: holdMs,
        duration: 200,
        onComplete: () => this.text.setVisible(false),
      });
    }
  }
}
