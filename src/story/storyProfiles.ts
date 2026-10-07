import type { StoryCharacterProfile, StoryLeg, StoryLocation, StoryRoute } from '../types/story';
import { DEFAULT_STAGE_ID } from '../stages/stageRegistry';
import { getStoryLocation, stageIdForLocation } from './locations';

/*
 * Origins, encounter places and campaigns: plain configuration. A fighter's `home` is where
 * they are from; `encounter` is where campaigns challenge them (it may be abroad). Routes list
 * the rivals in order, each leg flying to that rival's encounter place.
 */

/** Rivals only: home and where they are met. */
const RIVALS: readonly StoryCharacterProfile[] = [
  // Filipe is from Recife, but the campaign meets him in Portugal.
  { fighterId: 'filipe', home: 'recife', encounter: 'portugal' },
  // João Guiotti is from São Paulo, but the campaign meets him in Russia.
  { fighterId: 'joao-guiotti', home: 'sao-paulo', encounter: 'russia' },
  { fighterId: 'romualdo', home: 'joinville' },
];

/** Where a campaign fights this rival: its `encounter` place, or its home. */
export function encounterLocationId(fighterId: string): string {
  const profile = RIVALS.find((rival) => rival.fighterId === fighterId);
  if (!profile) throw new Error(`"${fighterId}" is not a story rival.`);
  return profile.encounter ?? profile.home;
}

/** A leg against `opponent`, at that rival's encounter place. */
export function rivalLeg(opponent: string): StoryLeg {
  return { opponent, destination: encounterLocationId(opponent) };
}

/** Augusto's world tour: Portugal (Filipe), Russia (João Guiotti), back home to Joinville. */
export const WORLD_TOUR: StoryRoute = [
  rivalLeg('filipe'),
  rivalLeg('joao-guiotti'),
  rivalLeg('romualdo'),
];

/** Filipe cannot face himself: Russia (João Guiotti), then Joinville (Romualdo). */
export const FILIPE_TOUR: StoryRoute = [rivalLeg('joao-guiotti'), rivalLeg('romualdo')];

/**
 * Every story fighter. Adding a partner: an entry here (home; `encounter` if campaigns meet
 * them elsewhere; `storyRoute` to make them playable in story mode).
 */
export const STORY_PROFILES: readonly StoryCharacterProfile[] = [
  { fighterId: 'augusto', home: 'recife', storyRoute: WORLD_TOUR },
  { ...(RIVALS[0] as StoryCharacterProfile), storyRoute: FILIPE_TOUR },
  ...RIVALS.slice(1),
];

export function getStoryProfile(fighterId: string): StoryCharacterProfile | undefined {
  return STORY_PROFILES.find((profile) => profile.fighterId === fighterId);
}

/** Official home of a fighter (undefined for fighters outside the story). */
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

/** Where leg `stage` departs from: the previous leg's destination, or the fighter's home. */
export function legDeparture(fighterId: string, stage: number): string {
  const route = storyRouteFor(fighterId) ?? [];
  const previous = route[stage - 1];
  if (stage > 0 && previous) return previous.destination;
  const home = getStoryProfile(fighterId)?.home;
  if (!home) throw new Error(`"${fighterId}" has no home location.`);
  return home;
}

/**
 * Arena of a quick fight: the home stage of the rival, or of the player when the rival has
 * none (e.g. FIGHTER_B), so a fight "at home" happens in that city. Decided by places only:
 * a fighter from Recife fights at the Marco Zero; places without a stage use the default.
 */
export function quickFightStageId(playerFighterId: string, cpuFighterId: string): string {
  for (const fighterId of [cpuFighterId, playerFighterId]) {
    const home = getStoryProfile(fighterId)?.home;
    const stageId = home ? stageIdForLocation(home) : undefined;
    if (stageId && stageId !== DEFAULT_STAGE_ID) return stageId;
  }
  return DEFAULT_STAGE_ID;
}
