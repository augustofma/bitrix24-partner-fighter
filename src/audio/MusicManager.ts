import { MUSIC_FADE, MUSIC_TRACKS, MUSIC_VOLUME } from '../config/audio';
import type { MusicTrackId } from '../types/audio';

/*
 * The one place that decides what music plays. Engine-free (the Phaser side is a small
 * MusicBackend), so its rules are unit-tested:
 *
 * - one current track; asking for the track that is already playing does nothing, so
 *   re-entering a scene never stacks a second copy;
 * - changing track fades the old one out while the new one fades in (no hard cuts); a third
 *   change mid-fade drops the oldest voice at once, so at most two voices ever overlap;
 * - stings (victory) play once over a quick fade of the current music, then leave silence;
 * - nothing starts while the browser keeps audio locked or the file is still loading: the
 *   last request waits and starts on unlock / load (stings are dropped instead, never late);
 * - fades run on game time (`update`), so a hidden tab simply pauses them.
 */

/** One playing instance of a track, as the backend exposes it. */
export interface MusicHandle {
  /** Starts from the beginning at this volume (0..1). */
  play(volume: number): void;
  setVolume(volume: number): void;
  /** Stops and releases the instance. */
  stop(): void;
  /** Called once when a non-looping track reaches its end. */
  onEnded(callback: () => void): void;
}

export interface MusicBackend {
  /** A new instance, or null when the track is not loaded (or audio is unavailable). */
  create(id: MusicTrackId, loop: boolean): MusicHandle | null;
  isLoaded(id: MusicTrackId): boolean;
  /** True until the browser allows audio (first tap / click / key). */
  readonly locked: boolean;
  setMuted(muted: boolean): void;
}

interface Voice {
  id: MusicTrackId;
  handle: MusicHandle;
  /** Fade envelope 0..1 (times the track gain and the music volume). */
  level: number;
  target: number;
  /** Level change per ms while fading. */
  rate: number;
}

export class MusicManager {
  private current: Voice | null = null;
  private outgoing: Voice | null = null;
  /** Wanted track that could not start yet (audio locked or file still loading). */
  private pending: { id: MusicTrackId; fadeInMs: number } | null = null;
  private volume = MUSIC_VOLUME;
  private muted = false;

  constructor(private readonly backend: MusicBackend) {}

  get currentTrack(): MusicTrackId | null {
    return this.current?.id ?? this.pending?.id ?? null;
  }

  /** Instances alive right now (current + one fading out at most). */
  get activeVoices(): number {
    return (this.current ? 1 : 0) + (this.outgoing ? 1 : 0);
  }

  get musicVolume(): number {
    return this.volume;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** Plays a looping theme (or keeps it, if it is already the current one). */
  play(
    id: MusicTrackId,
    fadeInMs: number = MUSIC_FADE.inMs,
    fadeOutMs: number = MUSIC_FADE.outMs,
  ): void {
    if (this.current?.id === id && this.current.target > 0) return;
    if (!this.current && this.pending?.id === id) return;
    this.fadeOutCurrent(fadeOutMs);
    this.pending = { id, fadeInMs };
    this.tryStartPending();
  }

  /** One-shot over a quick fade of the current music; silence after it ends. */
  playSting(id: MusicTrackId, fadeOutMs: number = MUSIC_FADE.stingOutMs): void {
    this.fadeOutCurrent(fadeOutMs);
    this.pending = null;
    if (this.backend.locked) return;
    const voice = this.startVoice(id, 0);
    voice?.handle.onEnded(() => {
      if (this.current !== voice) return;
      voice.handle.stop();
      this.current = null;
    });
  }

  stop(fadeOutMs: number = MUSIC_FADE.outMs): void {
    this.pending = null;
    this.fadeOutCurrent(fadeOutMs);
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    for (const voice of [this.current, this.outgoing]) if (voice) this.applyVolume(voice);
  }

  /** Mute keeps the music running silently, so unmuting never restarts it. */
  setMuted(muted: boolean): void {
    this.muted = muted;
    this.backend.setMuted(muted);
  }

  /** The browser unlocked audio, or a track finished loading: start what was asked for. */
  refresh(): void {
    this.tryStartPending();
  }

  /** Advances the fades; call once per game step. */
  update(deltaMs: number): void {
    for (const voice of [this.current, this.outgoing]) {
      if (!voice || voice.level === voice.target) continue;
      const step = voice.rate * deltaMs;
      voice.level =
        voice.level < voice.target
          ? Math.min(voice.target, voice.level + step)
          : Math.max(voice.target, voice.level - step);
      this.applyVolume(voice);
    }
    if (this.outgoing && this.outgoing.level <= 0) {
      this.outgoing.handle.stop();
      this.outgoing = null;
    }
  }

  private tryStartPending(): void {
    const request = this.pending;
    if (!request || this.current) return;
    if (this.backend.locked || !this.backend.isLoaded(request.id)) return;
    this.pending = null;
    this.startVoice(request.id, request.fadeInMs);
  }

  private startVoice(id: MusicTrackId, fadeInMs: number): Voice | null {
    const handle = this.backend.create(id, MUSIC_TRACKS[id].loop);
    if (!handle) return null;
    const voice: Voice = {
      id,
      handle,
      level: fadeInMs > 0 ? 0 : 1,
      target: 1,
      rate: fadeInMs > 0 ? 1 / fadeInMs : 0,
    };
    this.current = voice;
    handle.play(this.effectiveVolume(voice));
    return voice;
  }

  private fadeOutCurrent(fadeOutMs: number): void {
    const voice = this.current;
    if (!voice) return;
    this.current = null;
    // Never more than two voices: an older fade-out ends right away.
    this.outgoing?.handle.stop();
    this.outgoing = null;
    if (fadeOutMs <= 0) {
      voice.handle.stop();
      return;
    }
    this.outgoing = voice;
    voice.target = 0;
    voice.rate = voice.level / fadeOutMs;
  }

  private applyVolume(voice: Voice): void {
    voice.handle.setVolume(this.effectiveVolume(voice));
  }

  private effectiveVolume(voice: Voice): number {
    return voice.level * MUSIC_TRACKS[voice.id].gain * this.volume;
  }
}
