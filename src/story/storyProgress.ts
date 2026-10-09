import type { AIDifficulty, MatchSetup } from '../types/match';
import type { StoryLeg, StoryProgress, StoryRoute } from '../types/story';
import { stageIdForLocation } from './locations';
import { campaignStartLocation, drawStoryRoute } from './storyProfiles';

/*
 * Campaign progression as pure functions over an immutable StoryProgress. The scenes only
 * store the value and call these; the fight itself is the regular best-of-three match. The
 * route is drawn once, when the campaign starts, and travels inside the progress.
 */

/** Where leg `stage` departs from: the previous leg's place, or the campaign's start. */
function departure(fighterId: string, route: StoryRoute, stage: number): string {
  const previous = stage > 0 ? route[stage - 1] : undefined;
  return previous ? previous.destination : campaignStartLocation(fighterId);
}

/** About to travel along leg `stage` (or complete when past the last leg). */
function atLeg(
  fighterId: string,
  route: StoryRoute,
  stage: number,
  completed: readonly number[],
): StoryProgress {
  const leg = route[stage];
  if (!leg) {
    const last = route[route.length - 1] as StoryLeg;
    return {
      selectedFighter: fighterId,
      route,
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
    route,
    currentStage: stage,
    // Always from where the campaign is: home, or the previous fight's place.
    currentLocation: departure(fighterId, route, stage),
    nextLocation: leg.destination,
    opponent: leg.opponent,
    completedStages: completed,
    phase: 'travel',
  };
}

/**
 * A new campaign for the chosen fighter: random rivals, then the final boss (drawStoryRoute);
 * the first trip leaves from its home. `random` is injectable for tests.
 */
export function startStory(fighterId: string, random: () => number = Math.random): StoryProgress {
  const route = drawStoryRoute(fighterId, random);
  if (!route) throw new Error(`"${fighterId}" has no story campaign.`);
  return startStoryOn(fighterId, route);
}

/** A new campaign over a given route (e.g. a fixed one in tests). */
export function startStoryOn(fighterId: string, route: StoryRoute): StoryProgress {
  if (route.length === 0) throw new Error(`"${fighterId}" has no story campaign.`);
  return atLeg(fighterId, route, 0, []);
}

/** The current leg's definition (undefined once the campaign is complete). */
export function currentLeg(progress: StoryProgress): StoryLeg | undefined {
  return progress.route[progress.currentStage];
}

/** Where leg `stage` of this campaign departs from (home for the first one). */
export function legDeparture(progress: StoryProgress, stage: number): string {
  return departure(progress.selectedFighter, progress.route, stage);
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
  return atLeg(progress.selectedFighter, progress.route, progress.currentStage + 1, completed);
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
export function routeCities(progress: StoryProgress): string[] {
  return [legDeparture(progress, 0), ...progress.route.map((leg) => leg.destination)];
}
