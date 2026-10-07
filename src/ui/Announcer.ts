import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import { DEPTH } from './theme';
import { createFightTitle } from './victory/fightTitle';

/** Size of the announcements relative to the fight title lettering (88 px font). */
const ANNOUNCER_SCALE = 1.05;
/** The message slams in from this multiple of its size. */
const SLAM_FROM = 2.2;

/**
 * Big centered arcade messages: "ROUND 1", "FINAL ROUND", "FIGHT!", "K.O.", "TIME OVER", drawn
 * with the same fight lettering as the victory title so every big call shares one look.
 */
export class Announcer {
  private image: Phaser.GameObjects.Image | null = null;

  constructor(private readonly scene: Phaser.Scene) {}

  /** Takes the current message off right away (a bigger call is coming). */
  clear(): void {
    if (!this.image) return;
    this.scene.tweens.killTweensOf(this.image);
    this.image.destroy();
    this.image = null;
  }

  /** Shows a message; `holdMs` = 0 keeps it on screen until the next one. */
  show(message: string, holdMs = 900): void {
    if (this.image) {
      this.scene.tweens.killTweensOf(this.image);
      this.image.destroy();
    }
    const image = createFightTitle(this.scene, GAME_WIDTH / 2, GAME_HEIGHT * 0.4, message)
      .setScrollFactor(0)
      .setDepth(DEPTH.announcer);
    this.image = image;
    const scale = image.scaleX * ANNOUNCER_SCALE;
    image.setScale(scale * SLAM_FROM);
    this.scene.tweens.add({ targets: image, scale, duration: 220, ease: 'Back.easeOut' });
    if (holdMs > 0) {
      this.scene.tweens.add({
        targets: image,
        alpha: 0,
        delay: holdMs,
        duration: 200,
        onComplete: () => image.destroy(),
      });
    }
  }
}
