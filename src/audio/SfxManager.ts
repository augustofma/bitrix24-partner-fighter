import {
  SFX,
  SFX_DEDUP_MS,
  SFX_LEVEL_VARIATION,
  SFX_PITCH_VARIATION,
  SFX_UNLOCK_GRACE_MS,
  SFX_VOLUME,
} from '../config/audio';
import type { SfxId } from '../types/audio';

/*
 * The one place sound effects are played from. Engine-free (the Phaser side is a small
 * SfxBackend sharing the game's single sound manager / AudioContext), so its rules are tested:
 *
 * - nothing plays while the browser keeps audio locked; only the very last request (e.g. the
 *   JOGAR tap that unlocks audio) plays if the unlock lands within SFX_UNLOCK_GRACE_MS, since a
 *   late hit sound is worse than none;
 * - the same effect within SFX_DEDUP_MS is played once (keyboard + tap in one frame, or two
 *   systems reporting one moment);
 * - `vary` effects get a small random pitch/level change. That randomness is presentation
 *   only (it never touches the simulation, whose RNG is separate and seeded);
 * - mute stops new effects; volume scales every effect.
 */

export interface SfxBackend {
  /** Fire-and-forget one-shot; `rate` 1 = original pitch. */
  play(id: SfxId, volume: number, rate: number): void;
  isLoaded(id: SfxId): boolean;
  readonly locked: boolean;
  /** Milliseconds, monotonic (only differences matter). */
  now(): number;
}

export class SfxManager {
  private volume = SFX_VOLUME;
  private muted = false;
  private readonly lastPlayed = new Map<SfxId, number>();
  private waitingForUnlock: { id: SfxId; levelScale: number; at: number } | null = null;

  constructor(
    private readonly backend: SfxBackend,
    /** Presentation-only randomness for the variations (0..1). */
    private readonly random: () => number = Math.random,
  ) {}

  get sfxVolume(): number {
    return this.volume;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** Plays an effect; returns whether it actually played. */
  play(id: SfxId, levelScale = 1): boolean {
    if (this.muted || !this.backend.isLoaded(id)) return false;
    const now = this.backend.now();
    if (this.backend.locked) {
      this.waitingForUnlock = { id, levelScale, at: now };
      return false;
    }
    const last = this.lastPlayed.get(id);
    if (last !== undefined && now - last < SFX_DEDUP_MS) return false;
    this.lastPlayed.set(id, now);
    const config = SFX[id];
    let level = config.volume * this.volume * levelScale;
    let rate = 1;
    if (config.vary) {
      rate += (this.random() * 2 - 1) * SFX_PITCH_VARIATION;
      level *= 1 - this.random() * SFX_LEVEL_VARIATION;
    }
    if (level <= 0) return false;
    this.backend.play(id, Math.min(1, level), rate);
    return true;
  }

  /** Audio just unlocked: the effect of the unlocking tap, if it is still fresh. */
  unlocked(): void {
    const waiting = this.waitingForUnlock;
    this.waitingForUnlock = null;
    if (waiting && this.backend.now() - waiting.at <= SFX_UNLOCK_GRACE_MS) {
      this.play(waiting.id, waiting.levelScale);
    }
  }

  playAll(ids: readonly SfxId[]): void {
    for (const id of ids) this.play(id);
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }
}
