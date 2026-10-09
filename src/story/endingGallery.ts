import { ROSTER } from '../fighters/roster';
import { hasStoryCampaign } from './storyProfiles';

/*
 * Ending gallery: which story endings the player has unlocked (by completing a campaign with
 * that fighter). Remembered in localStorage, so it survives closing the game; when storage is
 * unavailable (private mode, blocked site data) it still works for the session.
 */

/** Minimal key/value storage (localStorage's shape), injectable for tests. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const UNLOCKED_ENDINGS_KEY = 'bpf-unlocked-endings';

/** Unlocks of this session, kept even if they cannot be written to storage. */
const sessionUnlocks = new Set<string>();

function browserStore(): KeyValueStore | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function readStored(store: KeyValueStore | null): string[] {
  if (!store) return [];
  try {
    const value: unknown = JSON.parse(store.getItem(UNLOCKED_ENDINGS_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/** Fighter ids whose ending is unlocked (stored ones plus this session's). */
export function loadUnlockedEndings(store: KeyValueStore | null = browserStore()): string[] {
  return [...new Set([...readStored(store), ...sessionUnlocks])];
}

/**
 * Unlocks a fighter's ending (its campaign was completed). Returns whether it is new, so the
 * ending screen can celebrate a first unlock. Never throws (storage errors are ignored).
 */
export function unlockEnding(
  fighterId: string,
  store: KeyValueStore | null = browserStore(),
): boolean {
  const unlocked = loadUnlockedEndings(store);
  sessionUnlocks.add(fighterId);
  if (unlocked.includes(fighterId)) return false;
  try {
    store?.setItem(UNLOCKED_ENDINGS_KEY, JSON.stringify([...unlocked, fighterId]));
  } catch {
    // Storage full or blocked: the unlock still counts for this session.
  }
  return true;
}

export interface GalleryEntry {
  fighterId: string;
  unlocked: boolean;
}

/** One entry per fighter with a story campaign, in roster order. */
export function galleryEntries(unlocked: readonly string[]): GalleryEntry[] {
  return ROSTER.filter((fighter) => hasStoryCampaign(fighter.id)).map((fighter) => ({
    fighterId: fighter.id,
    unlocked: unlocked.includes(fighter.id),
  }));
}

/** Test helper: forgets this session's unlocks. */
export function resetSessionUnlocks(): void {
  sessionUnlocks.clear();
}
