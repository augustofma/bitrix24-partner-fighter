import Phaser from 'phaser';
import { AMBIENCE_FADE, AMBIENCE_VOLUME, AMBIENCES, ambienceKey } from '../config/audio';
import type { AmbienceId } from '../types/audio';

/*
 * The stage's ambience loop during a fight, under the music: fades in when the fight starts,
 * fades out when the match is decided and is released with the scene. On Phaser's shared
 * sound manager, so the global mute (M) silences it too. A loop that did not load (or a
 * browser without audio) simply leaves the fight without ambience.
 */
export class StageAmbience {
  private sound: Phaser.Sound.BaseSound | null = null;
  private tween: Phaser.Tweens.Tween | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly id: AmbienceId | undefined,
  ) {
    const { sound } = scene.game;
    if (sound.locked) {
      // Audio still locked by the browser: start on the unlock, unless the fight is gone.
      const start = () => this.start();
      sound.once(Phaser.Sound.Events.UNLOCKED, start);
      scene.events.once('shutdown', () => sound.off(Phaser.Sound.Events.UNLOCKED, start));
    } else {
      this.start();
    }
    scene.events.once('shutdown', () => this.destroy());
  }

  fadeOut(durationMs: number = AMBIENCE_FADE.outMs): void {
    this.fadeTo(0, durationMs);
  }

  private start(): void {
    const { id, scene } = this;
    if (!id || this.sound || !scene.cache.audio.exists(ambienceKey(id))) return;
    try {
      this.sound = scene.sound.add(ambienceKey(id), { loop: true, volume: 0 });
      this.sound.play();
    } catch (error) {
      console.warn(`[audio] Could not play ambience "${id}".`, error);
      this.sound = null;
      return;
    }
    this.fadeTo(AMBIENCE_VOLUME * AMBIENCES[id].gain, AMBIENCE_FADE.inMs);
  }

  private fadeTo(volume: number, durationMs: number): void {
    if (!this.sound) return;
    this.tween?.remove();
    this.tween = this.scene.tweens.add({ targets: this.sound, volume, duration: durationMs });
  }

  private destroy(): void {
    this.tween?.remove();
    this.tween = null;
    this.sound?.stop();
    this.sound?.destroy();
    this.sound = null;
  }
}
