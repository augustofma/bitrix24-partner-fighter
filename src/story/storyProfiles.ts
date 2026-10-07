import type { StoryCharacterProfile, StoryLocation, StoryRoute } from '../types/story';
import { getStoryLocation } from './locations';

/**
 * The first campaign: from the Northeast to the South, through the partners' rivals.
 * A route is plain data: another character can reuse it or get a completely different one.
 */
export const PARTNER_TOUR: StoryRoute = [
  { from: 'recife', to: 'sao-paulo', opponent: 'joao-guiotti' },
  { from: 'sao-paulo', to: 'joinville', opponent: 'romualdo' },
];

/**
 * Origin of every story fighter and the campaign of the playable ones. Adding a partner:
 * an entry here (home city; plus `storyRoute` to make them playable in story mode).
 */
export const STORY_PROFILES: readonly StoryCharacterProfile[] = [
  { fighterId: 'augusto', home: 'recife', storyRoute: PARTNER_TOUR },
  { fighterId: 'filipe', home: 'recife', storyRoute: PARTNER_TOUR },
  { fighterId: 'joao-guiotti', home: 'sao-paulo' },
  { fighterId: 'romualdo', home: 'joinville' },
];

export function getStoryProfile(fighterId: string): StoryCharacterProfile | undefined {
  return STORY_PROFILES.find((profile) => profile.fighterId === fighterId);
}

/** Home city of a fighter (undefined for fighters outside the story). */
export function fighterOrigin(fighterId: string): StoryLocation | undefined {
  const profile = getStoryProfile(fighterId);
  return profile ? getStoryLocation(profile.home) : undefined;
}

/** The campaign of a fighter, or undefined when it has none (not playable in story mode). */
export function storyRouteFor(fighterId: string): StoryRoute | undefined {
  const route = getStoryProfile(fighterId)?.storyRoute;
  return route && route.length > 0 ? route : undefined;
}

export function hasStoryCampaign(fighterId: string): boolean {
  return storyRouteFor(fighterId) !== undefined;
}

/** Fighters met as rivals in some campaign (shown locked in the story select screen). */
export function isStoryRival(fighterId: string): boolean {
  return STORY_PROFILES.some((profile) =>
    (profile.storyRoute ?? []).some((leg) => leg.opponent === fighterId),
  );
}
