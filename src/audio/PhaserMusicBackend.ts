import type Phaser from 'phaser';
import { musicKey } from '../config/audio';
import type { MusicTrackId } from '../types/audio';
import type { MusicBackend, MusicHandle } from './MusicManager';

/** MusicBackend on top of Phaser's global sound manager (Web Audio, HTML5 audio or none). */
export class PhaserMusicBackend implements MusicBackend {
  constructor(private readonly game: Phaser.Game) {}

  get locked(): boolean {
    return this.game.sound.locked;
  }

  isLoaded(id: MusicTrackId): boolean {
    return this.game.cache.audio.exists(musicKey(id));
  }

  create(id: MusicTrackId, loop: boolean): MusicHandle | null {
    if (!this.isLoaded(id)) return null;
    let sound: Phaser.Sound.BaseSound;
    try {
      sound = this.game.sound.add(musicKey(id), { loop, volume: 0 });
    } catch (error) {
      console.warn(`[audio] Could not play "${id}".`, error);
      return null;
    }
    const withVolume = sound as Phaser.Sound.BaseSound & { setVolume(volume: number): unknown };
    return {
      play: (volume) => {
        withVolume.setVolume(volume);
        sound.play();
      },
      setVolume: (volume) => withVolume.setVolume(volume),
      stop: () => {
        sound.stop();
        sound.destroy();
      },
      onEnded: (callback) => sound.once('complete', callback),
    };
  }

  setMuted(muted: boolean): void {
    this.game.sound.mute = muted;
  }
}
