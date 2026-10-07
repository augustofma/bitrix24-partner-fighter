import type { AIDifficulty, MatchSetup } from '../types/match';
import type { StoryLeg, StoryProgress } from '../types/story';
import { stageIdForLocation } from './locations';
import { legDeparture, storyRouteFor } from './storyProfiles';

/*
 * Campaign progression as pure functions over an immutable StoryProgress. The scenes only
 * store the value and call these; the fight itself is the regular best-of-three match.
 */

function routeOf(fighterId: string) {
  const route = storyRouteFor(fighterId);
  if (!route) throw new Error(`"${fighterId}" has no story campaign.`);
  return route;
}

/** About to travel along leg `stage` (or complete when past the last leg). */
function atLeg(fighterId: string, stage: number, completed: readonly number[]): StoryProgress {
  const route = routeOf(fighterId);
  const leg = route[stage];
  if (!leg) {
    const last = route[route.length - 1] as StoryLeg;
    return {
      selectedFighter: fighterId,
      currentStage: route.length,
      currentLocation: last.destination,
      nextLocation: null,
      opponent: null,
      completedStages: completed,
      phase: 'complete',
    };
  }
  return {
    selectedFighter: fighterId,
    currentStage: stage,
    // Always from where the campaign is: home, or the previous fight's place.
    currentLocation: legDeparture(fighterId, stage),
    nextLocation: leg.destination,
    opponent: leg.opponent,
    completedStages: completed,
    phase: 'travel',
  };
}

/** A new campaign for the chosen fighter: the first trip leaves from its home. */
export function startStory(fighterId: string): StoryProgress {
  return atLeg(fighterId, 0, []);
}

/** The current leg's definition (undefined once the campaign is complete). */
export function currentLeg(progress: StoryProgress): StoryLeg | undefined {
  return routeOf(progress.selectedFighter)[progress.currentStage];
}

/** The plane landed: the fight of the current leg is on. */
export function arriveForFight(progress: StoryProgress): StoryProgress {
  if (progress.phase !== 'travel' || !progress.nextLocation) return progress;
  return {
    ...progress,
    phase: 'fight',
    currentLocation: progress.nextLocation,
    nextLocation: null,
  };
}

/**
 * Result of the current leg's match. A win advances (next trip, or campaign complete); a loss
 * or a draw changes nothing, so a retry repeats the same fight. Outside a fight: no-op.
 */
export function recordStoryMatch(progress: StoryProgress, playerWon: boolean): StoryProgress {
  if (progress.phase !== 'fight' || !playerWon) return progress;
  const completed = [...progress.completedStages, progress.currentStage];
  return atLeg(progress.selectedFighter, progress.currentStage + 1, completed);
}

/** Arena of a leg: the one it names, or the stage of the place where the fight happens. */
export function legStageId(leg: StoryLeg): string {
  return leg.stageId ?? stageIdForLocation(leg.destination);
}

/** The regular match for the current leg (same scenes, same rules as a quick fight). */
export function storyMatchSetup(progress: StoryProgress, difficulty: AIDifficulty): MatchSetup {
  const leg = currentLeg(progress);
  if (!leg || progress.phase === 'complete') throw new Error('The campaign is already complete.');
  return {
    playerFighterId: progress.selectedFighter,
    cpuFighterId: leg.opponent,
    stageId: legStageId(leg),
    difficulty,
    mode: 'story',
  };
}

/** Every place of the campaign in order (home first), e.g. for the completion screen. */
export function routeCities(fighterId: string): string[] {
  const route = routeOf(fighterId);
  return [legDeparture(fighterId, 0), ...route.map((leg) => leg.destination)];
}
