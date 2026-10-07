import Phaser from 'phaser';
import type { SfxId } from '../types/audio';
import { MusicManager } from './MusicManager';
import { PhaserMusicBackend } from './PhaserMusicBackend';
import { PhaserSfxBackend } from './PhaserSfxBackend';
import { SfxManager } from './SfxManager';

/*
 * The game's audio services, created once per game and shared by every scene: the
 * MusicManager and the SfxManager, both on Phaser's single sound manager (one AudioContext for
 * the whole game; effects never create their own). Wired here, once:
 * - the game loop drives the music fades;
 * - the browser's audio unlock (first tap / click / key) starts the waiting music; effects
 *   simply start working from then on;
 * - a background-loaded track may be the one a scene is waiting for;
 * - M mutes / unmutes everything (remembered in localStorage when available).
 * Scenes only call gameMusic(scene) / gameSfx(scene) / playSfx(scene, id): entering a scene
 * again never adds listeners or audio instances.
 */

export interface GameAudio {
  music: MusicManager;
  sfx: SfxManager;
  setMuted(muted: boolean): void;
  readonly isMuted: boolean;
}

const MUTE_STORAGE_KEY = 'bpf:music-muted';
/** A long stall (or returning to the tab) finishes a fade instead of skipping past it. */
const MAX_FADE_STEP_MS = 1000;
const services = new WeakMap<Phaser.Game, GameAudio>();

export function gameAudio(scene: Phaser.Scene): GameAudio {
  const game = scene.game;
  let audio = services.get(game);
  if (!audio) {
    audio = createGameAudio(game);
    services.set(game, audio);
  }
  return audio;
}

export function gameMusic(scene: Phaser.Scene): MusicManager {
  return gameAudio(scene).music;
}

export function gameSfx(scene: Phaser.Scene): SfxManager {
  return gameAudio(scene).sfx;
}

/** Shorthand for UI and scenes: plays one effect through the shared manager. */
export function playSfx(scene: Phaser.Scene, id: SfxId): void {
  gameAudio(scene).sfx.play(id);
}

function createGameAudio(game: Phaser.Game): GameAudio {
  const music = new MusicManager(new PhaserMusicBackend(game));
  const sfx = new SfxManager(new PhaserSfxBackend(game));
  let muted = false;
  const audio: GameAudio = {
    music,
    sfx,
    setMuted(value: boolean) {
      muted = value;
      music.setMuted(value);
      sfx.setMuted(value);
    },
    get isMuted() {
      return muted;
    },
  };
  audio.setMuted(readMuted());

  // Fades follow the wall clock: Phaser smooths its frame delta while a heavy scene is being
  // built, which would stretch a 450 ms fade to seconds. Hidden tabs do not step at all.
  let last = performance.now();
  game.events.on(Phaser.Core.Events.STEP, () => {
    const now = performance.now();
    music.update(Math.min(now - last, MAX_FADE_STEP_MS));
    last = now;
  });
  game.sound.on(Phaser.Sound.Events.UNLOCKED, () => {
    music.refresh();
    sfx.unlocked();
  });
  game.cache.audio.events.on(Phaser.Cache.Events.ADD, () => music.refresh());
  window.addEventListener('keydown', (event) => {
    if (event.code !== 'KeyM' || event.repeat) return;
    audio.setMuted(!audio.isMuted);
    writeMuted(audio.isMuted);
  });
  return audio;
}

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0');
  } catch {
    // Storage blocked (private mode): mute still works for this session.
  }
}
