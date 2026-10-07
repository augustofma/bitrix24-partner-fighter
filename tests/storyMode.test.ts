import { describe, expect, it } from 'vitest';
import { ROSTER, getFighterConfig } from '../src/fighters/roster';
import {
  BRAZIL_BOUNDS,
  brazilOutline,
  isInside,
  locationToMap,
  projectToMap,
} from '../src/story/brazilMap';
import { flightPath } from '../src/story/flightPath';
import { STORY_LOCATIONS, getStoryLocation, locationLabel } from '../src/story/locations';
import {
  STORY_PROFILES,
  fighterOrigin,
  hasStoryCampaign,
  storyRouteFor,
} from '../src/story/storyProfiles';
import {
  arriveForFight,
  currentLeg,
  recordStoryMatch,
  routeCities,
  startStory,
  storyMatchSetup,
} from '../src/story/storyProgress';
import { DEFAULT_STAGE_ID, getStageConfig } from '../src/stages/stageRegistry';

const RECIFE_TO_JOINVILLE = [
  { from: 'recife', to: 'sao-paulo', opponent: 'joao-guiotti' },
  { from: 'sao-paulo', to: 'joinville', opponent: 'romualdo' },
];

describe('origins (all from configuration)', () => {
  it.each([
    ['augusto', 'Recife', 'Pernambuco', 'PE'],
    ['filipe', 'Recife', 'Pernambuco', 'PE'],
    ['joao-guiotti', 'São Paulo', 'São Paulo', 'SP'],
    ['romualdo', 'Joinville', 'Santa Catarina', 'SC'],
  ])('%s comes from %s - %s (%s)', (id, city, state, stateCode) => {
    expect(fighterOrigin(id)).toMatchObject({ city, state, stateCode });
  });

  it('every profile and route points to real fighters and cities', () => {
    for (const profile of STORY_PROFILES) {
      expect(() => getFighterConfig(profile.fighterId)).not.toThrow();
      expect(() => getStoryLocation(profile.home)).not.toThrow();
      for (const leg of profile.storyRoute ?? []) {
        expect(() => getStoryLocation(leg.from)).not.toThrow();
        expect(() => getStoryLocation(leg.to)).not.toThrow();
        expect(() => getFighterConfig(leg.opponent)).not.toThrow();
        expect(leg.opponent).not.toBe(profile.fighterId);
      }
    }
    expect(fighterOrigin('fighter-b')).toBeUndefined();
    expect(locationLabel(getStoryLocation('recife'))).toBe('RECIFE - PE');
  });
});

describe('campaigns', () => {
  it('Augusto and Filipe: Recife -> São Paulo (João Guiotti) -> Joinville (Romualdo)', () => {
    expect(storyRouteFor('augusto')).toEqual(RECIFE_TO_JOINVILLE);
    expect(storyRouteFor('filipe')).toEqual(RECIFE_TO_JOINVILLE);
    expect(routeCities('augusto')).toEqual(['recife', 'sao-paulo', 'joinville']);
  });

  it('only fighters with a route are playable in story mode', () => {
    const playable = ROSTER.filter((config) => hasStoryCampaign(config.id)).map((c) => c.id);
    expect(playable).toEqual(['augusto', 'filipe']);
    expect(() => startStory('fighter-a')).toThrow();
  });
});

describe('story progress', () => {
  it('starts with the selected fighter, flying from home to the first rival', () => {
    const progress = startStory('augusto');
    expect(progress).toEqual({
      selectedFighter: 'augusto',
      currentStage: 0,
      currentLocation: 'recife',
      nextLocation: 'sao-paulo',
      opponent: 'joao-guiotti',
      completedStages: [],
      phase: 'travel',
    });
  });

  it('landing starts the fight of that leg as a regular best-of-three match', () => {
    const fight = arriveForFight(startStory('augusto'));
    expect(fight).toMatchObject({
      phase: 'fight',
      currentLocation: 'sao-paulo',
      nextLocation: null,
    });
    expect(storyMatchSetup(fight, 'hard')).toEqual({
      playerFighterId: 'augusto',
      cpuFighterId: 'joao-guiotti',
      stageId: DEFAULT_STAGE_ID,
      difficulty: 'hard',
      mode: 'story',
    });
    expect(() => getStageConfig(storyMatchSetup(fight, 'normal').stageId)).not.toThrow();
  });

  it('a loss does not advance; retrying keeps the same leg and rival', () => {
    const fight = arriveForFight(startStory('augusto'));
    const lost = recordStoryMatch(fight, false);
    expect(lost).toEqual(fight);
    expect(storyMatchSetup(lost, 'normal').cpuFighterId).toBe('joao-guiotti');
    expect(currentLeg(lost)).toEqual(RECIFE_TO_JOINVILLE[0]);
  });

  it('a win advances to the second trip: São Paulo -> Joinville against Romualdo', () => {
    const second = recordStoryMatch(arriveForFight(startStory('augusto')), true);
    expect(second).toMatchObject({
      currentStage: 1,
      currentLocation: 'sao-paulo',
      nextLocation: 'joinville',
      opponent: 'romualdo',
      completedStages: [0],
      phase: 'travel',
    });
  });

  it('winning the last fight completes the campaign (and nothing advances after it)', () => {
    let progress = startStory('filipe');
    for (let leg = 0; leg < 2; leg++) progress = recordStoryMatch(arriveForFight(progress), true);
    expect(progress).toMatchObject({
      phase: 'complete',
      currentStage: 2,
      currentLocation: 'joinville',
      opponent: null,
      completedStages: [0, 1],
    });
    expect(recordStoryMatch(progress, true)).toBe(progress);
    expect(arriveForFight(progress)).toBe(progress);
    expect(() => storyMatchSetup(progress, 'normal')).toThrow();
  });

  it('results outside a fight (e.g. a quick fight) never touch the campaign', () => {
    const traveling = startStory('augusto');
    expect(recordStoryMatch(traveling, true)).toBe(traveling);
  });
});

describe('Brazil travel map', () => {
  const rect = { x: 100, y: 50, width: 400, height: 400 };

  it('projects latitude/longitude linearly into the map rectangle', () => {
    expect(projectToMap(BRAZIL_BOUNDS.north, BRAZIL_BOUNDS.west, rect)).toEqual({ x: 100, y: 50 });
    expect(projectToMap(BRAZIL_BOUNDS.south, BRAZIL_BOUNDS.east, rect)).toEqual({ x: 500, y: 450 });
  });

  it('places the cities where they belong relative to each other, inside Brazil', () => {
    const [recife, saoPaulo, joinville] = ['recife', 'sao-paulo', 'joinville'].map((id) =>
      locationToMap(getStoryLocation(id), rect),
    );
    // Recife is far east and north; Joinville is south of São Paulo.
    expect(recife!.x).toBeGreaterThan(saoPaulo!.x);
    expect(recife!.y).toBeLessThan(saoPaulo!.y);
    expect(joinville!.y).toBeGreaterThan(saoPaulo!.y);
    const outline = brazilOutline(rect);
    for (const location of STORY_LOCATIONS) {
      const point = locationToMap(location, rect);
      // Coastal cities sit on the coast: allow a few pixels inland.
      const nudged = { x: point.x - 6, y: point.y };
      expect(isInside(point, outline) || isInside(nudged, outline), location.id).toBe(true);
    }
    expect(isInside({ x: 0, y: 0 }, outline)).toBe(false);
  });

  it('the plane flies from the origin city to the destination along a curve', () => {
    const from = locationToMap(getStoryLocation('recife'), rect);
    const to = locationToMap(getStoryLocation('sao-paulo'), rect);
    const path = flightPath(from, to);
    expect(path.pointAt(0)).toEqual(from);
    expect(path.pointAt(1).x).toBeCloseTo(to.x);
    expect(path.pointAt(1).y).toBeCloseTo(to.y);
    const middle = path.pointAt(0.5);
    const straight = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    expect(Math.hypot(middle.x - straight.x, middle.y - straight.y)).toBeGreaterThan(10);
    // Heading at the end points roughly toward the destination (southwest on screen).
    const heading = path.angleAt(0.9);
    expect(Math.cos(heading)).toBeLessThan(0);
  });
});
