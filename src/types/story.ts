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
  /**
   * Where the map writes this place's label (default: inland, level with the marker). For
   * neighbours whose labels would overlap (e.g. Portugal and Spain).
   */
  mapLabel?: { side: 'left' | 'right'; dy: number };
  /** Arena of fights held here (a StageConfig id); the default stage when omitted. */
  stageId?: string;
}

/**
 * One leg of a campaign (generated): fly from where the campaign is now to `destination` and
 * fight `opponent` there. The departure is never stored: it is the previous leg's destination (or
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

/**
 * A story character: where it is from and where it is in the story world. Campaigns are
 * generated from these (src/story/storyProfiles.ts), never written per fighter.
 */
export interface StoryCharacterProfile {
  fighterId: string;
  /**
   * Home (a StoryLocation id): the fighter's official origin, shown on select and VS. Optional:
   * a fighter without an official origin only has its story place (`encounter`).
   */
  home?: string;
  /**
   * The fighter's place in the story world (a StoryLocation id); defaults to `home` (one of
   * the two is required). Its own
   * campaign STARTS here (StoryProgress.currentLocation at the start), and the other campaigns
   * MEET it here. A fighter can be from one place and be in another (e.g. abroad).
   */
  encounter?: string;
  /** Order to meet the rivals in this fighter's campaign; default: the story roster's order. */
  opponentOrder?: readonly string[];
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
