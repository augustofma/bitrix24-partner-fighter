/*
 * Story mode data. Everything about places, origins and campaigns is configuration
 * (src/story/); no scene or system tests fighter ids.
 */

/** A city on the travel map. Latitude/longitude place it on the map projection. */
export interface StoryLocation {
  id: string;
  city: string;
  state: string;
  /** Two-letter state code (UF), e.g. "PE". */
  stateCode: string;
  latitude: number;
  longitude: number;
}

/** One leg of a campaign: fly from a city to another and fight the local rival there. */
export interface StoryLeg {
  from: string;
  to: string;
  opponent: string;
  /** Arena of this fight (default stage when omitted). */
  stageId?: string;
}

/** Ordered legs of a campaign; the last leg's win completes it. */
export type StoryRoute = readonly StoryLeg[];

/** Where a fighter comes from and, for playable characters, their campaign. */
export interface StoryCharacterProfile {
  fighterId: string;
  /** Home city (a StoryLocation id). Its city/state/UF and map position come from there. */
  home: string;
  /** Campaign of this character; fighters without one are rivals only. */
  storyRoute?: StoryRoute;
}

export type StoryPhase = 'travel' | 'fight' | 'complete';

/**
 * Where a campaign stands. Immutable: every step returns a new value (pure, testable).
 * - travel: about to fly from `currentLocation` to `nextLocation` to face `opponent`;
 * - fight: arrived at `currentLocation`, the fight against `opponent` is on (retries stay here);
 * - complete: every leg won.
 */
export interface StoryProgress {
  selectedFighter: string;
  /** Index of the leg being played (equals the route length once complete). */
  currentStage: number;
  currentLocation: string;
  nextLocation: string | null;
  opponent: string | null;
  /** Indices of the legs already won, in order. */
  completedStages: readonly number[];
  phase: StoryPhase;
}
