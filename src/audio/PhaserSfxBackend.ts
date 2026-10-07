import type Phaser from 'phaser';
import { sfxKey } from '../config/audio';
import type { SfxId } from '../types/audio';
import type { SfxBackend } from './SfxManager';

/**
 * SfxBackend on Phaser's global sound manager. `sound.play` creates a short-lived instance
 * that Phaser destroys itself when it ends, so effects never pile up.
 */
export class PhaserSfxBackend implements SfxBackend {
  constructor(private readonly game: Phaser.Game) {}

  get locked(): boolean {
    return this.game.sound.locked;
  }

  isLoaded(id: SfxId): boolean {
    return this.game.cache.audio.exists(sfxKey(id));
  }

  now(): number {
    return performance.now();
  }

  play(id: SfxId, volume: number, rate: number): void {
    try {
      this.game.sound.play(sfxKey(id), { volume, rate });
    } catch (error) {
      console.warn(`[audio] Could not play "${id}".`, error);
    }
  }
}
