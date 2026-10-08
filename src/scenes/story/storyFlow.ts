import type Phaser from 'phaser';
import { DEFAULT_AI_DIFFICULTY } from '../../config/match';
import { RegistryKeys } from '../../config/registryKeys';
import { SceneKeys } from '../../config/sceneKeys';
import {
  arriveForFight,
  recordStoryMatch,
  startStory,
  storyMatchSetup,
} from '../../story/storyProgress';
import { isAIDifficulty, type AIDifficulty, type MatchResult } from '../../types/match';
import type { StoryProgress } from '../../types/story';
import { goToScene, isLeaving } from '../transitions';

/*
 * Glue between the story campaign (pure, src/story/) and the scenes: the current
 * StoryProgress lives in the game registry for the session, and these helpers move the
 * player between the existing scenes. Quick fights never call them. While a scene is already
 * fading out (e.g. Enter then Esc within the fade), the helpers change nothing: the progress
 * must match the transition that really happens.
 */

type SceneLike = Pick<Phaser.Scene, 'registry'>;

export function getStoryProgress(scene: SceneLike): StoryProgress | null {
  const value: unknown = scene.registry.get(RegistryKeys.storyProgress);
  return isStoryProgress(value) ? value : null;
}

export function setStoryProgress(scene: SceneLike, progress: StoryProgress | null): void {
  scene.registry.set(RegistryKeys.storyProgress, progress);
}

function storyDifficulty(scene: SceneLike): AIDifficulty {
  const saved: unknown = scene.registry.get(RegistryKeys.aiDifficulty);
  return isAIDifficulty(saved) ? saved : DEFAULT_AI_DIFFICULTY;
}

/** Character chosen: a fresh campaign, starting with the first trip on the map. */
export function beginStory(scene: Phaser.Scene, fighterId: string): void {
  if (isLeaving(scene)) return;
  setStoryProgress(scene, startStory(fighterId));
  goToScene(scene, SceneKeys.StoryMap);
}

/** The plane landed: present the rival (VS screen), then the regular match. */
export function arriveAndFight(scene: Phaser.Scene): void {
  if (isLeaving(scene)) return;
  const progress = getStoryProgress(scene);
  if (!progress) {
    goToScene(scene, SceneKeys.Menu);
    return;
  }
  const fight = arriveForFight(progress);
  setStoryProgress(scene, fight);
  goToScene(scene, SceneKeys.Versus, storyMatchSetup(fight, storyDifficulty(scene)));
}

/**
 * Records a finished story match once (wins advance; losses keep the leg for a retry) and
 * returns the new progress. Results of quick fights are ignored.
 */
export function finishStoryMatch(scene: SceneLike, result: MatchResult): StoryProgress | null {
  const progress = getStoryProgress(scene);
  if (!progress || result.setup.mode !== 'story') return progress;
  if (progress.phase !== 'fight' || result.setup.cpuFighterId !== progress.opponent) {
    return progress;
  }
  const next = recordStoryMatch(progress, result.winnerIndex === 0);
  setStoryProgress(scene, next);
  return next;
}

/**
 * Where a finished match goes. Normally the victory screen; but the win that completes a
 * campaign (its last fight, the final boss's when there is one) goes straight to the
 * campaign's ending, without the "<NAME> VENCEU!" screen in between.
 */
export function endMatch(scene: Phaser.Scene, result: MatchResult): void {
  if (isLeaving(scene)) return;
  if (result.setup.mode === 'story' && result.winnerIndex === 0) {
    if (finishStoryMatch(scene, result)?.phase === 'complete') {
      goToScene(scene, SceneKeys.CampaignComplete);
      return;
    }
  }
  goToScene(scene, SceneKeys.Victory, result);
}

/** After a won story match: the next trip, or the campaign's ending. */
export function continueStory(scene: Phaser.Scene): void {
  const progress = getStoryProgress(scene);
  if (!progress) {
    goToScene(scene, SceneKeys.Menu);
    return;
  }
  goToScene(scene, progress.phase === 'complete' ? SceneKeys.CampaignComplete : SceneKeys.StoryMap);
}

/** Lost (or drew): the same fight again, without replaying the campaign. */
export function retryStoryFight(scene: Phaser.Scene): void {
  const progress = getStoryProgress(scene);
  if (!progress || progress.phase !== 'fight') {
    goToScene(scene, SceneKeys.Menu);
    return;
  }
  goToScene(scene, SceneKeys.Versus, storyMatchSetup(progress, storyDifficulty(scene)));
}

/** Same character, campaign from the start. */
export function restartStory(scene: Phaser.Scene): void {
  const progress = getStoryProgress(scene);
  if (!progress) {
    goToScene(scene, SceneKeys.Menu);
    return;
  }
  beginStory(scene, progress.selectedFighter);
}

/** Leaves story mode (the campaign is dropped) and returns to the main menu. */
export function quitStory(scene: Phaser.Scene): void {
  if (isLeaving(scene)) return;
  setStoryProgress(scene, null);
  goToScene(scene, SceneKeys.Menu);
}

function isStoryProgress(value: unknown): value is StoryProgress {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<StoryProgress>;
  return (
    typeof candidate.selectedFighter === 'string' &&
    typeof candidate.currentStage === 'number' &&
    Array.isArray(candidate.completedStages) &&
    (candidate.phase === 'travel' || candidate.phase === 'fight' || candidate.phase === 'complete')
  );
}
