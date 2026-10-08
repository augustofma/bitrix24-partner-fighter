import { ROSTER } from '../fighters/roster';
import { DEFAULT_STAGE_ID } from '../stages/stageRegistry';
import type {
  StoryCharacterProfile,
  StoryFinalBoss,
  StoryLeg,
  StoryLocation,
  StoryRoute,
} from '../types/story';
import { getStoryLocation, stageIdForLocation } from './locations';

/*
 * Story characters and the campaign generator: plain configuration plus one generic rule, no
 * code per fighter. Every story character has an official origin (`home`) and a place in the
 * story world (`encounter`, defaulting to `home`). A campaign starts at the chosen fighter's
 * place and flies to every other story character's place, in order, to fight them there.
 */

/**
 * Every story character, in the default order campaigns meet them. Adding a partner: an entry
 * here (its `home`; `encounter` when it lives elsewhere in the story) is all it takes to make
 * it playable in story mode and a rival in the other campaigns.
 */
export const STORY_PROFILES: readonly StoryCharacterProfile[] = [
  // Ending: Augusto watching the sunset on the Recife waterfront, back home.
  { fighterId: 'augusto', home: 'recife', endingArt: 'story/endings/augusto.jpg' },
  // Filipe is from Recife, but in the story he is in Portugal.
  { fighterId: 'filipe', home: 'recife', encounter: 'portugal' },
  // João Guiotti is from São Paulo, but in the story he is in Russia.
  // Met on Moscow's Red Square (the RUSSIA stage).
  {
    fighterId: 'joao-guiotti',
    home: 'sao-paulo',
    encounter: 'russia',
    encounterStageId: 'russia',
  },
  // Isaque Ferreira has no official origin yet: only his place in the story, Spain.
  { fighterId: 'isaque-ferreira', encounter: 'spain' },
  { fighterId: 'romualdo', home: 'joinville' },
  // Met in Joinville too, but at the ZOPU-dressed gate (Romualdo keeps the CRMThink one).
  { fighterId: 'aislan', encounter: 'joinville', encounterStageId: 'joinville-zopu' },
];

/**
 * The final boss: Dmitry, at the Bitrix24 office in Moscow. That stage is used in the story
 * only for this fight (no StoryLocation points to it). Until Dmitry's FighterConfig is in the
 * ROSTER the leg is simply absent; adding him needs no change here. He must not get a regular
 * STORY_PROFILES entry (he would be fought twice).
 */
export const STORY_FINAL_BOSS: StoryFinalBoss = {
  fighterId: 'dmitry',
  destination: 'russia',
  stageId: 'bitrix24-moscow',
};

/** The final boss leg of `fighterId`'s campaign, when the boss exists and is someone else. */
export function finalBossLeg(fighterId: string): StoryLeg | undefined {
  const { fighterId: boss, destination, stageId } = STORY_FINAL_BOSS;
  if (fighterId === boss || !ROSTER.some((config) => config.id === boss)) return undefined;
  return { opponent: boss, destination, stageId };
}

export function getStoryProfile(fighterId: string): StoryCharacterProfile | undefined {
  return STORY_PROFILES.find((profile) => profile.fighterId === fighterId);
}

function requireProfile(fighterId: string): StoryCharacterProfile {
  const profile = getStoryProfile(fighterId);
  if (!profile) throw new Error(`"${fighterId}" is not a story character.`);
  return profile;
}

/**
 * Where a fighter is in the story world (a StoryLocation id): its `encounter` place, or its
 * home. Its own campaign STARTS here, and the other campaigns FIGHT it here.
 */
export function storyLocationId(fighterId: string): string {
  const profile = requireProfile(fighterId);
  const place = profile.encounter ?? profile.home;
  if (!place) throw new Error(`"${fighterId}" has neither a home nor a story place.`);
  return place;
}

/** Where the chosen fighter's campaign starts (StoryProgress.currentLocation at the start). */
export function campaignStartLocation(fighterId: string): string {
  return storyLocationId(fighterId);
}

/** A playable fighter (FighterConfig.playable) that has a story profile. */
export function isStoryEligible(fighterId: string): boolean {
  const fighter = ROSTER.find((config) => config.id === fighterId);
  return fighter?.playable === true && getStoryProfile(fighterId) !== undefined;
}

/**
 * The rivals of a campaign, in order: every other story-eligible fighter (never the fighter
 * itself, never a non-playable placeholder).
 */
export function campaignOpponents(fighterId: string): string[] {
  const profile = requireProfile(fighterId);
  const order = profile.opponentOrder ?? STORY_PROFILES.map((p) => p.fighterId);
  return order.filter(
    (id) => id !== fighterId && id !== STORY_FINAL_BOSS.fighterId && isStoryEligible(id),
  );
}

/** A leg against `opponent`, at that rival's place in the story (and its encounter arena). */
export function rivalLeg(opponent: string): StoryLeg {
  const stageId = getStoryProfile(opponent)?.encounterStageId;
  return { opponent, destination: storyLocationId(opponent), ...(stageId ? { stageId } : {}) };
}

/** The campaign of a fighter (generated), or undefined when it has none. */
export function storyRouteFor(fighterId: string): StoryRoute | undefined {
  if (!isStoryEligible(fighterId)) return undefined;
  const route = campaignOpponents(fighterId).map(rivalLeg);
  if (route.length === 0) return undefined;
  const boss = finalBossLeg(fighterId);
  return boss ? [...route, boss] : route;
}

export function hasStoryCampaign(fighterId: string): boolean {
  return storyRouteFor(fighterId) !== undefined;
}

/** Fighters met as rivals in some campaign. */
export function isStoryRival(fighterId: string): boolean {
  return STORY_PROFILES.some((profile) =>
    storyRouteFor(profile.fighterId)?.some((leg) => leg.opponent === fighterId),
  );
}

/** Official home of a fighter (undefined for fighters outside the story). */
export function fighterOrigin(fighterId: string): StoryLocation | undefined {
  const profile = getStoryProfile(fighterId);
  return profile?.home ? getStoryLocation(profile.home) : undefined;
}

/**
 * Where leg `stage` departs from: the previous leg's destination, or (first leg) the place
 * where the chosen fighter's campaign starts.
 */
export function legDeparture(fighterId: string, stage: number): string {
  const route = storyRouteFor(fighterId) ?? [];
  const previous = route[stage - 1];
  if (stage > 0 && previous) return previous.destination;
  return campaignStartLocation(fighterId);
}

/**
 * Arena of a quick fight: the home stage of the rival, or of the player when the rival has
 * none, so a fight "at home" happens in that city. Decided by places only,
 * through the same location -> stage table as the story; places without a stage use the
 * default.
 */
export function quickFightStageId(playerFighterId: string, cpuFighterId: string): string {
  for (const fighterId of [cpuFighterId, playerFighterId]) {
    const home = getStoryProfile(fighterId)?.home;
    const stageId = home ? stageIdForLocation(home) : undefined;
    if (stageId && stageId !== DEFAULT_STAGE_ID) return stageId;
  }
  return DEFAULT_STAGE_ID;
}
