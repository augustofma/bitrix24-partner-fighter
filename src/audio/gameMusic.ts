import Phaser from 'phaser';
import { MusicManager } from './MusicManager';
import { PhaserMusicBackend } from './PhaserMusicBackend';

/*
 * One MusicManager per game, shared by every scene (scenes only say which track they want).
 * Wires it to the game loop (fades), to the browser's audio unlock and to the loader, and
 * adds the M key to mute/unmute (remembered in localStorage when available).
 */

const MUTE_STORAGE_KEY = 'bpf:music-muted';
const managers = new WeakMap<Phaser.Game, MusicManager>();
/** A long stall (or returning to the tab) finishes a fade instead of skipping past it. */
const MAX_FADE_STEP_MS = 1000;

export function gameMusic(scene: Phaser.Scene): MusicManager {
  const game = scene.game;
  let manager = managers.get(game);
  if (!manager) {
    manager = createManager(game);
    managers.set(game, manager);
  }
  return manager;
}

function createManager(game: Phaser.Game): MusicManager {
  const manager = new MusicManager(new PhaserMusicBackend(game));
  manager.setMuted(readMuted());
  // Fades follow the wall clock: Phaser smooths its frame delta while a heavy scene is being
  // built, which would stretch a 450 ms fade to seconds. Hidden tabs do not step at all.
  let last = performance.now();
  game.events.on(Phaser.Core.Events.STEP, () => {
    const now = performance.now();
    manager.update(Math.min(now - last, MAX_FADE_STEP_MS));
    last = now;
  });
  // First valid tap / click / key: the browser lets audio start.
  game.sound.on(Phaser.Sound.Events.UNLOCKED, () => manager.refresh());
  // A background-loaded track may be the one a scene is waiting for.
  game.cache.audio.events.on(Phaser.Cache.Events.ADD, () => manager.refresh());
  window.addEventListener('keydown', (event) => {
    if (event.code !== 'KeyM' || event.repeat) return;
    manager.setMuted(!manager.isMuted);
    writeMuted(manager.isMuted);
  });
  return manager;
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
