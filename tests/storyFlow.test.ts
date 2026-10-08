import { beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ goToScene: vi.fn(), leaving: false }));
vi.mock('../src/scenes/transitions', () => ({
  goToScene: nav.goToScene,
  fadeIn: vi.fn(),
  isLeaving: () => nav.leaving,
}));

import { RegistryKeys } from '../src/config/registryKeys';
import { SceneKeys } from '../src/config/sceneKeys';
import {
  arriveAndFight,
  beginStory,
  continueStory,
  finishStoryMatch,
  getStoryProgress,
  quitStory,
  retryStoryFight,
} from '../src/scenes/story/storyFlow';
import { storyRouteFor } from '../src/story/storyProfiles';
import type { MatchResult, MatchSetup } from '../src/types/match';

/** A stand-in scene: only the game registry matters to the story glue. */
function fakeScene() {
  const store = new Map<string, unknown>();
  const registry = {
    get: (key: string) => store.get(key),
    set: (key: string, value: unknown) => store.set(key, value),
  };
  return { registry } as unknown as Phaser.Scene;
}
const lastNavigation = () => nav.goToScene.mock.lastCall?.slice(1);
const result = (setup: MatchSetup, winnerIndex: 0 | 1 | null): MatchResult => ({
  setup,
  winnerIndex,
  reason: 'ko',
  roundWins: winnerIndex === 0 ? [2, 0] : [0, 2],
});

beforeEach(() => {
  nav.goToScene.mockClear();
  nav.leaving = false;
});

describe('story flow between the existing scenes', () => {
  it('picking a fighter starts its campaign and opens the travel map', () => {
    const scene = fakeScene();
    beginStory(scene, 'augusto');
    expect(getStoryProgress(scene)).toMatchObject({ selectedFighter: 'augusto', phase: 'travel' });
    expect(lastNavigation()).toEqual([SceneKeys.StoryMap]);
  });

  it('landing opens the VS screen with the leg rival and the chosen difficulty', () => {
    const scene = fakeScene();
    scene.registry.set(RegistryKeys.aiDifficulty, 'hard');
    beginStory(scene, 'filipe');
    arriveAndFight(scene);
    expect(lastNavigation()).toEqual([
      SceneKeys.Versus,
      expect.objectContaining({
        playerFighterId: 'filipe',
        // Filipe starts in Portugal; his first rival is Augusto, met in Recife (Marco Zero).
        cpuFighterId: 'augusto',
        stageId: 'recife',
        difficulty: 'hard',
        mode: 'story',
      }),
    ]);
  });

  it('a loss keeps the fight; retry repeats it; a win records once and moves on', () => {
    const scene = fakeScene();
    beginStory(scene, 'augusto');
    arriveAndFight(scene);
    const setup = lastNavigation()?.[1] as MatchSetup;
    expect(finishStoryMatch(scene, result(setup, 1))).toMatchObject({
      phase: 'fight',
      currentStage: 0,
    });
    retryStoryFight(scene);
    expect(lastNavigation()).toEqual([SceneKeys.Versus, setup]);
    const won = finishStoryMatch(scene, result(setup, 0));
    expect(won).toMatchObject({ phase: 'travel', currentStage: 1, opponent: 'joao-guiotti' });
    // The same result reported twice never advances twice.
    expect(finishStoryMatch(scene, result(setup, 0))).toEqual(won);
    continueStory(scene);
    expect(lastNavigation()).toEqual([SceneKeys.StoryMap]);
  });

  it('the last win leads to the campaign ending; quitting clears the campaign', () => {
    const scene = fakeScene();
    beginStory(scene, 'augusto');
    for (let leg = 0; leg < (storyRouteFor('augusto')?.length ?? 0); leg++) {
      arriveAndFight(scene);
      finishStoryMatch(scene, result(lastNavigation()?.[1] as MatchSetup, 0));
    }
    continueStory(scene);
    expect(lastNavigation()).toEqual([SceneKeys.CampaignComplete]);
    quitStory(scene);
    expect(getStoryProgress(scene)).toBeNull();
    expect(lastNavigation()).toEqual([SceneKeys.Menu]);
  });

  it('quick fights never touch the campaign', () => {
    const scene = fakeScene();
    beginStory(scene, 'augusto');
    arriveAndFight(scene);
    const before = getStoryProgress(scene);
    const quick: MatchSetup = {
      playerFighterId: 'augusto',
      cpuFighterId: 'joao-guiotti',
      stageId: 'partner-summit',
      difficulty: 'normal',
    };
    expect(finishStoryMatch(scene, result(quick, 0))).toBe(before);
    expect(getStoryProgress(scene)).toBe(before);
    expect(finishStoryMatch(fakeScene(), result(quick, 0))).toBeNull();
  });
});

describe('story flow during a scene transition', () => {
  it('Enter then Esc within the fade: the campaign is kept (regression)', () => {
    const scene = fakeScene();
    beginStory(scene, 'augusto');
    arriveAndFight(scene); // Enter: fading out to the VS
    const fight = getStoryProgress(scene);
    expect(fight?.phase).toBe('fight');
    nav.leaving = true; // the fade is still running
    quitStory(scene); // Esc: ignored, like the transition it would start
    expect(getStoryProgress(scene)).toBe(fight);
    arriveAndFight(scene); // a second Enter changes nothing either
    expect(getStoryProgress(scene)).toBe(fight);
    nav.leaving = false;
    quitStory(scene); // a real Esc later still leaves story mode
    expect(getStoryProgress(scene)).toBeNull();
  });
});
