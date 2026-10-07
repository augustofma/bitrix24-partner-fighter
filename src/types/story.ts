/*
 * Story mode data. Everything about places, origins and campaigns is configuration
 * (src/story/); no scene or system tests fighter ids.
 */

/** A city (with its state) or a whole country, placed on the map by latitude/longitude. */
export type StoryLocationKind = 'city' | 'country';

/** A place on the travel map: home of a fighter, or where a campaign fight happens. */
export interface StoryLocation {
  id: string;
  kind: StoryLocationKind;
  /** "Recife", "Portugal". */
  name: string;
  /** Country the place belongs to (a country names itself), e.g. "Brasil". */
  country: string;
  /** Cities: state name and two-letter code (UF), e.g. "Pernambuco" / "PE". */
  region?: string;
  regionCode?: string;
  latitude: number;
  longitude: number;
  /** Arena of fights held here (a StageConfig id); the default stage when omitted. */
  stageId?: string;
}

/**
 * One leg of a campaign: fly from where the campaign is now to `destination` and fight
 * `opponent` there. The departure is never stored: it is the previous leg's destination (or
 * the fighter's home for the first leg), so the plane always leaves from where the story is.
 */
export interface StoryLeg {
  opponent: string;
  /** Where this fight happens (a StoryLocation id); not necessarily the rival's home. */
  destination: string;
  /** Arena of this fight; defaults to the destination's stage (StoryLocation.stageId). */
  stageId?: string;
}

/** Ordered legs of a campaign; the last leg's win completes it. */
export type StoryRoute = readonly StoryLeg[];

/** Where a fighter comes from and, for playable characters, their campaign. */
export interface StoryCharacterProfile {
  fighterId: string;
  /** Home (a StoryLocation id): the fighter's official origin, shown on select and VS. */
  home: string;
  /**
   * Where campaigns meet this fighter as a rival (a StoryLocation id). Defaults to `home`;
   * a rival can be from one place and be challenged in another (e.g. abroad).
   */
  encounter?: string;
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
