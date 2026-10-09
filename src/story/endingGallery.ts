import { ROSTER } from '../fighters/roster';
import type { FighterConfig } from '../types/fighter';
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

/** Every story ending is unlocked (the gallery is complete). */
export function allEndingsUnlocked(unlocked: readonly string[]): boolean {
  const entries = galleryEntries(unlocked);
  return entries.length > 0 && entries.every((entry) => entry.unlocked);
}

/**
 * Whether a fighter can be picked in quick fights: the playable ones, plus hidden ones whose
 * unlock condition is met (FighterConfig.unlock; 'all-endings': the gallery is complete).
 */
export function isFighterAvailable(config: FighterConfig, unlocked: readonly string[]): boolean {
  if (config.playable) return true;
  return config.unlock === 'all-endings' && allEndingsUnlocked(unlocked);
}

/** The quick fight roster for these unlocks, in roster order. */
export function availableFighters(unlocked: readonly string[]): FighterConfig[] {
  return ROSTER.filter((config) => isFighterAvailable(config, unlocked));
}

/** Hidden fighters the complete gallery unlocks (e.g. to announce them). */
export function galleryRewardFighters(): FighterConfig[] {
  return ROSTER.filter((config) => !config.playable && config.unlock === 'all-endings');
}

/** Test helper: forgets this session's unlocks. */
export function resetSessionUnlocks(): void {
  sessionUnlocks.clear();
}
