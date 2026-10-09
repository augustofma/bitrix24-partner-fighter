import { beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ goToScene: vi.fn() }));
vi.mock('../src/scenes/transitions', () => ({
  goToScene: nav.goToScene,
  fadeIn: vi.fn(),
  isLeaving: () => false,
}));

import { RegistryKeys } from '../src/config/registryKeys';
import { SceneKeys } from '../src/config/sceneKeys';
import {
  endMatch,
  beginStory,
  arriveAndFight,
  getStoryProgress,
} from '../src/scenes/story/storyFlow';
import {
  UNLOCKED_ENDINGS_KEY,
  allEndingsUnlocked,
  availableFighters,
  galleryRewardFighters,
  isFighterAvailable,
  galleryEntries,
  loadUnlockedEndings,
  resetSessionUnlocks,
  unlockEnding,
  type KeyValueStore,
} from '../src/story/endingGallery';
import { hasStoryCampaign } from '../src/story/storyProfiles';
import { ROSTER } from '../src/fighters/roster';
import { galleryGrid, moveInGallery, GALLERY_LAYOUT } from '../src/ui/gallery/galleryLayout';
import type { MatchResult, MatchSetup } from '../src/types/match';

function memoryStore(initial?: string): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(UNLOCKED_ENDINGS_KEY, initial);
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

beforeEach(() => {
  resetSessionUnlocks();
  nav.goToScene.mockClear();
});

describe('unlocked endings (remembered)', () => {
  it('starts empty, unlocks once, and remembers it in storage', () => {
    const store = memoryStore();
    expect(loadUnlockedEndings(store)).toEqual([]);
    expect(unlockEnding('augusto', store)).toBe(true);
    expect(unlockEnding('augusto', store)).toBe(false);
    expect(unlockEnding('filipe', store)).toBe(true);
    expect(JSON.parse(store.data.get(UNLOCKED_ENDINGS_KEY)!)).toEqual(['augusto', 'filipe']);
    resetSessionUnlocks();
    // A new session (page reload) reads them back from storage.
    expect(loadUnlockedEndings(store)).toEqual(['augusto', 'filipe']);
  });

  it('broken or foreign data reads as nothing unlocked, never throws', () => {
    expect(loadUnlockedEndings(memoryStore('not json'))).toEqual([]);
    expect(loadUnlockedEndings(memoryStore('{"a":1}'))).toEqual([]);
    expect(loadUnlockedEndings(memoryStore('["romulo", 3, null]'))).toEqual(['romulo']);
  });

  it('without storage (private mode / blocked) it still works for the session', () => {
    const failing: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(unlockEnding('aislan', failing)).toBe(true);
    expect(loadUnlockedEndings(failing)).toEqual(['aislan']);
    expect(loadUnlockedEndings(null)).toEqual(['aislan']);
  });
});

describe('gallery entries', () => {
  it('one per story fighter, in roster order, marking the unlocked ones', () => {
    const entries = galleryEntries(['filipe', 'romulo']);
    expect(entries.map((e) => e.fighterId)).toEqual(
      ROSTER.filter((f) => hasStoryCampaign(f.id)).map((f) => f.id),
    );
    expect(entries.filter((e) => e.unlocked).map((e) => e.fighterId)).toEqual(['filipe', 'romulo']);
    // The final boss (no campaign) and placeholders are not in the gallery.
    expect(entries.some((e) => e.fighterId === 'dmitry')).toBe(false);
    expect(entries.some((e) => e.fighterId.startsWith('fighter-'))).toBe(false);
  });
});

describe('completing a campaign unlocks its ending', () => {
  function fakeScene() {
    const store = new Map<string, unknown>();
    return {
      registry: {
        get: (k: string) => store.get(k),
        set: (k: string, v: unknown) => store.set(k, v),
      },
    } as unknown as Phaser.Scene;
  }
  const won = (setup: MatchSetup): MatchResult => ({
    setup,
    winnerIndex: 0,
    reason: 'ko',
    roundWins: [2, 0],
  });

  it('only the win that completes the campaign unlocks (and flags it as new)', () => {
    const scene = fakeScene();
    beginStory(scene, 'gabriel-mattozo');
    const legs = getStoryProgress(scene)!.route.length;
    for (let leg = 0; leg < legs; leg++) {
      expect(loadUnlockedEndings(null)).not.toContain('gabriel-mattozo');
      arriveAndFight(scene);
      endMatch(scene, won(nav.goToScene.mock.lastCall![2] as MatchSetup));
    }
    expect(nav.goToScene.mock.lastCall![1]).toBe(SceneKeys.CampaignComplete);
    expect(loadUnlockedEndings(null)).toContain('gabriel-mattozo');
    expect(scene.registry.get(RegistryKeys.newEndingUnlocked)).toBe(true);
  });

  it('completing again with the same fighter is not a new unlock', () => {
    unlockEnding('augusto', null);
    const scene = fakeScene();
    beginStory(scene, 'augusto');
    const legs = getStoryProgress(scene)!.route.length;
    for (let leg = 0; leg < legs; leg++) {
      arriveAndFight(scene);
      endMatch(scene, won(nav.goToScene.mock.lastCall![2] as MatchSetup));
    }
    expect(scene.registry.get(RegistryKeys.newEndingUnlocked)).toBe(false);
  });
});

describe('gallery layout', () => {
  it('8 fighters: two rows of four 16:9 cards, inside the area, without overlaps', () => {
    const { columns, rows, cards } = galleryGrid(8);
    expect([columns, rows]).toEqual([4, 2]);
    const { area, nameHeight } = GALLERY_LAYOUT;
    for (const card of cards) {
      expect(card.width / card.thumbHeight).toBeCloseTo(16 / 9, 1);
      expect(card.x).toBeGreaterThanOrEqual(area.left);
      expect(card.x + card.width).toBeLessThanOrEqual(area.left + area.width);
      expect(card.y).toBeGreaterThanOrEqual(area.top);
      expect(card.y + card.thumbHeight + nameHeight).toBeLessThanOrEqual(area.top + area.height);
    }
    expect(cards[1]!.x).toBeGreaterThan(cards[0]!.x + cards[0]!.width);
    expect(cards[4]!.y).toBeGreaterThan(cards[0]!.y + cards[0]!.thumbHeight + nameHeight);
  });

  it('grows with the roster: 9 or 10 in two rows of five, more in three rows', () => {
    for (const count of [9, 10]) {
      expect(galleryGrid(count)).toMatchObject({ columns: 5, rows: 2 });
    }
    const twelve = galleryGrid(12);
    expect(twelve.rows).toBe(3);
    expect(twelve.cards[0]!.width).toBeLessThan(galleryGrid(8).cards[0]!.width);
    // Never cards wider than with fewer entries.
    expect(galleryGrid(10).cards[0]!.width).toBeLessThanOrEqual(galleryGrid(8).cards[0]!.width);
  });

  it('keyboard moves wrap around rows and columns', () => {
    expect(moveInGallery(0, 'right', 8, 4)).toBe(1);
    expect(moveInGallery(7, 'right', 8, 4)).toBe(0);
    expect(moveInGallery(0, 'left', 8, 4)).toBe(7);
    expect(moveInGallery(1, 'down', 8, 4)).toBe(5);
    expect(moveInGallery(5, 'down', 8, 4)).toBe(1);
    expect(moveInGallery(2, 'up', 8, 4)).toBe(6);
    // A short last row: going up from the top lands on the last card of that column or before.
    expect(moveInGallery(3, 'up', 6, 4)).toBe(5);
  });
});

describe('the complete gallery unlocks the final boss as a playable fighter', () => {
  const storyIds = () => galleryEntries([]).map((entry) => entry.fighterId);
  const dmitry = () => ROSTER.find((fighter) => fighter.id === 'dmitry')!;

  it('the boss is hidden until every ending is unlocked', () => {
    const all = storyIds();
    expect(dmitry().playable).toBe(false);
    expect(allEndingsUnlocked([])).toBe(false);
    expect(allEndingsUnlocked(all.slice(0, -1))).toBe(false);
    expect(isFighterAvailable(dmitry(), all.slice(0, -1))).toBe(false);
    expect(availableFighters(all.slice(0, -1))).not.toContain(dmitry());
    expect(allEndingsUnlocked(all)).toBe(true);
    expect(isFighterAvailable(dmitry(), all)).toBe(true);
    expect(availableFighters(all)).toContain(dmitry());
  });

  it('is the only reward; placeholders never become available', () => {
    expect(galleryRewardFighters()).toEqual([dmitry()]);
    const available = availableFighters(storyIds());
    expect(available.some((fighter) => fighter.id.startsWith('fighter-'))).toBe(false);
    // Every playable fighter stays available, in roster order, with the boss added.
    expect(available).toEqual(
      ROSTER.filter((fighter) => fighter.playable || fighter.id === 'dmitry'),
    );
  });

  it('he still has no story campaign (he stays the final boss there)', () => {
    expect(hasStoryCampaign('dmitry')).toBe(false);
    expect(galleryEntries(storyIds()).some((entry) => entry.fighterId === 'dmitry')).toBe(false);
  });
});
