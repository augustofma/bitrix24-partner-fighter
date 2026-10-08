import { describe, expect, it } from 'vitest';
import { ROSTER, getFighterConfig } from '../src/fighters/roster';
import {
  BRAZIL_BOUNDS,
  BRAZIL_OUTLINE,
  brazilOutline,
  projectOutline,
  isInside,
  locationToMap,
  projectToMap,
} from '../src/story/brazilMap';
import { flightPath, tripForProgress } from '../src/story/flightPath';
import {
  BRAZIL_VIEW,
  WORLD_BOUNDS,
  WORLD_VIEW,
  mapViewForTrip,
  viewShows,
} from '../src/story/mapViews';
import {
  STORY_LOCATIONS,
  getStoryLocation,
  isHomeCountry,
  locationLabel,
} from '../src/story/locations';
import {
  STORY_PROFILES,
  fighterOrigin,
  hasStoryCampaign,
  storyLocationId,
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

describe('origins (all from configuration)', () => {
  it.each([
    ['augusto', 'Recife', 'Pernambuco', 'PE'],
    ['filipe', 'Recife', 'Pernambuco', 'PE'],
    ['joao-guiotti', 'São Paulo', 'São Paulo', 'SP'],
    ['romualdo', 'Joinville', 'Santa Catarina', 'SC'],
  ])('%s comes from %s - %s (%s)', (id, name, region, regionCode) => {
    expect(fighterOrigin(id)).toMatchObject({ kind: 'city', name, region, regionCode });
  });

  it('every profile and route points to real fighters and places', () => {
    for (const profile of STORY_PROFILES) {
      expect(() => getFighterConfig(profile.fighterId)).not.toThrow();
      if (profile.home) expect(() => getStoryLocation(profile.home!)).not.toThrow();
      expect(profile.home ?? profile.encounter).toBeDefined();
      if (profile.encounter) expect(() => getStoryLocation(profile.encounter!)).not.toThrow();
      for (const leg of storyRouteFor(profile.fighterId) ?? []) {
        expect(() => getStoryLocation(leg.destination)).not.toThrow();
        expect(() => getFighterConfig(leg.opponent)).not.toThrow();
        expect(leg.opponent).not.toBe(profile.fighterId);
      }
    }
    expect(fighterOrigin('fighter-b')).toBeUndefined();
    expect(locationLabel(getStoryLocation('recife'))).toBe('RECIFE - PE');
    expect(locationLabel(getStoryLocation('portugal'))).toBe('PORTUGAL');
    expect(locationLabel(getStoryLocation('russia'))).toBe('RÚSSIA');
  });
});

describe('story places (separate from origins)', () => {
  it('Filipe is in Portugal, João Guiotti in Russia, Augusto and Romualdo at home', () => {
    expect(storyLocationId('augusto')).toBe('recife');
    expect(storyLocationId('filipe')).toBe('portugal');
    expect(storyLocationId('joao-guiotti')).toBe('russia');
    expect(storyLocationId('romualdo')).toBe('joinville');
  });

  it('their official origins do not change', () => {
    expect(fighterOrigin('filipe')?.id).toBe('recife');
    expect(fighterOrigin('joao-guiotti')?.id).toBe('sao-paulo');
  });

  it("every leg against a rival flies to that rival's place in the story", () => {
    for (const profile of STORY_PROFILES) {
      for (const leg of storyRouteFor(profile.fighterId) ?? []) {
        expect(leg.destination, leg.opponent).toBe(storyLocationId(leg.opponent));
      }
    }
  });
});

describe('campaigns', () => {
  it('Augusto: Recife -> Portugal (Filipe) -> Russia (João Guiotti) -> Joinville (Romualdo)', () => {
    expect(storyRouteFor('augusto')).toEqual([
      { opponent: 'filipe', destination: 'portugal' },
      { opponent: 'joao-guiotti', destination: 'russia', stageId: 'russia' },
      { opponent: 'isaque-ferreira', destination: 'spain' },
      { opponent: 'romualdo', destination: 'joinville' },
      { opponent: 'aislan', destination: 'joinville', stageId: 'joinville' },
    ]);
    expect(routeCities('augusto')).toEqual([
      'recife',
      'portugal',
      'russia',
      'spain',
      'joinville',
      'joinville',
    ]);
  });

  it('Filipe (never against himself): Portugal -> Recife -> Russia -> Spain -> Joinville', () => {
    expect(storyRouteFor('filipe')).toEqual([
      { opponent: 'augusto', destination: 'recife' },
      { opponent: 'joao-guiotti', destination: 'russia', stageId: 'russia' },
      { opponent: 'isaque-ferreira', destination: 'spain' },
      { opponent: 'romualdo', destination: 'joinville' },
      { opponent: 'aislan', destination: 'joinville', stageId: 'joinville' },
    ]);
    expect(routeCities('filipe')).toEqual([
      'portugal',
      'recife',
      'russia',
      'spain',
      'joinville',
      'joinville',
    ]);
  });

  it('every story character is playable in story mode; others are not', () => {
    const playable = ROSTER.filter((config) => hasStoryCampaign(config.id)).map((c) => c.id);
    expect(playable).toEqual([
      'augusto',
      'filipe',
      'joao-guiotti',
      'romualdo',
      'isaque-ferreira',
      'aislan',
    ]);
    expect(() => startStory('fighter-a')).toThrow();
  });
});

describe('story progress', () => {
  it("starts with the selected fighter, flying from home to the first rival's place", () => {
    expect(startStory('augusto')).toEqual({
      selectedFighter: 'augusto',
      currentStage: 0,
      currentLocation: 'recife',
      nextLocation: 'portugal',
      opponent: 'filipe',
      completedStages: [],
      phase: 'travel',
    });
  });

  it('landing makes the destination the current location, and the fight is a regular match', () => {
    const fight = arriveForFight(startStory('augusto'));
    expect(fight).toMatchObject({
      phase: 'fight',
      currentLocation: 'portugal',
      nextLocation: null,
    });
    expect(storyMatchSetup(fight, 'hard')).toEqual({
      playerFighterId: 'augusto',
      cpuFighterId: 'filipe',
      stageId: DEFAULT_STAGE_ID,
      difficulty: 'hard',
      mode: 'story',
    });
    expect(() => getStageConfig(storyMatchSetup(fight, 'normal').stageId)).not.toThrow();
  });

  it('a loss does not advance; retrying keeps the same leg, rival and place', () => {
    const fight = arriveForFight(startStory('augusto'));
    const lost = recordStoryMatch(fight, false);
    expect(lost).toEqual(fight);
    expect(storyMatchSetup(lost, 'normal').cpuFighterId).toBe('filipe');
    expect(currentLeg(lost)).toEqual({ opponent: 'filipe', destination: 'portugal' });
  });

  it('the next trip leaves from where the last fight was: Portugal -> Russia', () => {
    const second = recordStoryMatch(arriveForFight(startStory('augusto')), true);
    expect(second).toMatchObject({
      currentStage: 1,
      currentLocation: 'portugal',
      nextLocation: 'russia',
      opponent: 'joao-guiotti',
      completedStages: [0],
      phase: 'travel',
    });
    const third = recordStoryMatch(arriveForFight(second), true);
    expect(third).toMatchObject({
      currentLocation: 'russia',
      nextLocation: 'spain',
      opponent: 'isaque-ferreira',
    });
    const fourth = recordStoryMatch(arriveForFight(third), true);
    expect(fourth).toMatchObject({
      currentLocation: 'spain',
      nextLocation: 'joinville',
      opponent: 'romualdo',
    });
  });

  it('winning the last fight completes the campaign (and nothing advances after it)', () => {
    let progress = startStory('filipe');
    for (let leg = 0; leg < 5; leg++) progress = recordStoryMatch(arriveForFight(progress), true);
    expect(progress).toMatchObject({
      phase: 'complete',
      currentStage: 5,
      currentLocation: 'joinville',
      opponent: null,
      completedStages: [0, 1, 2, 3, 4],
    });
    expect(recordStoryMatch(progress, true)).toBe(progress);
    expect(arriveForFight(progress)).toBe(progress);
    expect(() => storyMatchSetup(progress, 'normal')).toThrow();
  });

  it('results outside a fight (e.g. a quick fight) never touch the campaign', () => {
    const traveling = startStory('augusto');
    expect(recordStoryMatch(traveling, true)).toBe(traveling);
  });

  it('is deterministic: the same results always give the same progress', () => {
    const play = () => {
      const steps = [];
      let progress = startStory('augusto');
      for (const won of [false, true, true, false, false, true, true]) {
        progress = progress.phase === 'travel' ? arriveForFight(progress) : progress;
        progress = recordStoryMatch(progress, won);
        steps.push(JSON.stringify(progress));
      }
      return steps;
    };
    expect(play()).toEqual(play());
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
    for (const location of STORY_LOCATIONS.filter(isHomeCountry)) {
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

describe('international travel map', () => {
  const rects = {
    brazil: { x: 44, y: 62, width: 450, height: 450 },
    world: { x: 14, y: 96, width: 552, height: 372 },
  };
  const at = (id: string) => getStoryLocation(id);

  it('Portugal and Russia have valid coordinates, in the right part of the world', () => {
    const portugal = at('portugal');
    const russia = at('russia');
    expect(portugal).toMatchObject({ kind: 'country', name: 'Portugal' });
    expect(russia).toMatchObject({ kind: 'country', name: 'Rússia' });
    // Portugal: western tip of Europe. Moscow area: far northeast of it.
    expect(portugal.latitude).toBeGreaterThan(36);
    expect(portugal.latitude).toBeLessThan(43);
    expect(portugal.longitude).toBeGreaterThan(-10);
    expect(portugal.longitude).toBeLessThan(-6);
    expect(russia.latitude).toBeGreaterThan(50);
    expect(russia.longitude).toBeGreaterThan(30);
    for (const place of [portugal, russia, at('recife')])
      expect(viewShows(WORLD_VIEW, place)).toBe(true);
    expect(viewShows(BRAZIL_VIEW, portugal)).toBe(false);
  });

  it('both countries sit on land on the world map, and Recife sits in Brazil', () => {
    const rect = rects.world;
    const land = WORLD_VIEW.landmasses.map((outline) =>
      projectOutline(outline, rect, WORLD_BOUNDS),
    );
    const onLand = (id: string) =>
      land.some((outline) => isInside(locationToMap(at(id), rect, WORLD_BOUNDS), outline));
    expect(onLand('portugal')).toBe(true);
    expect(onLand('russia')).toBe(true);
    const brazil = projectOutline(BRAZIL_OUTLINE, rect, WORLD_BOUNDS);
    const recife = locationToMap(at('recife'), rect, WORLD_BOUNDS);
    expect(isInside({ x: recife.x - 4, y: recife.y }, brazil)).toBe(true);
  });

  it('the world map keeps the same scale on both axes', () => {
    const { north, south, west, east } = WORLD_BOUNDS;
    expect(rects.world.width / (east - west)).toBeCloseTo(rects.world.height / (north - south), 2);
  });

  it('domestic trips keep the Brazil map; trips abroad use the world map and fly longer', () => {
    expect(mapViewForTrip(at('recife'), at('sao-paulo'))).toBe(BRAZIL_VIEW);
    expect(mapViewForTrip(at('recife'), at('portugal'))).toBe(WORLD_VIEW);
    expect(mapViewForTrip(at('russia'), at('joinville'))).toBe(WORLD_VIEW);
    expect(WORLD_VIEW.flightMs).toBeGreaterThan(BRAZIL_VIEW.flightMs);
    expect(BRAZIL_VIEW.flightMs).toBeGreaterThanOrEqual(2000);
    expect(WORLD_VIEW.flightMs).toBeLessThanOrEqual(5000);
  });

  it('Recife -> Portugal: the plane leaves from the current location and crosses the Atlantic', () => {
    const trip = tripForProgress(startStory('augusto'), rects)!;
    expect(trip.from.id).toBe('recife');
    expect(trip.to.id).toBe('portugal');
    expect(trip.international).toBe(true);
    expect(trip.view.id).toBe('world');
    expect(trip.path.pointAt(0)).toEqual(locationToMap(at('recife'), rects.world, WORLD_BOUNDS));
    const end = trip.path.pointAt(1);
    const portugal = locationToMap(at('portugal'), rects.world, WORLD_BOUNDS);
    expect(end.x).toBeCloseTo(portugal.x);
    expect(end.y).toBeCloseTo(portugal.y);
    // Heading north-east (up and right on screen) on the way, staying inside the map.
    for (let t = 0; t <= 1; t += 0.1) {
      const p = trip.path.pointAt(t);
      expect(p.x).toBeGreaterThanOrEqual(rects.world.x);
      expect(p.y).toBeGreaterThanOrEqual(rects.world.y);
    }
    expect(Math.sin(trip.path.angleAt(0.5))).toBeLessThan(0);
  });

  it('Portugal -> Russia: the second trip departs from Portugal', () => {
    const second = recordStoryMatch(arriveForFight(startStory('augusto')), true);
    const trip = tripForProgress(second, rects)!;
    expect([trip.from.id, trip.to.id]).toEqual(['portugal', 'russia']);
    expect(trip.path.pointAt(0)).toEqual(locationToMap(at('portugal'), rects.world, WORLD_BOUNDS));
    expect(Math.cos(trip.path.angleAt(0.5))).toBeGreaterThan(0); // eastward
  });

  it('a domestic trip still uses the Brazil map and its rectangle', () => {
    const domestic = {
      selectedFighter: 'augusto',
      currentStage: 0,
      currentLocation: 'recife',
      nextLocation: 'sao-paulo',
      opponent: 'joao-guiotti',
      completedStages: [],
      phase: 'travel' as const,
    };
    const trip = tripForProgress(domestic, rects)!;
    expect(trip.view.id).toBe('brazil');
    expect(trip.international).toBe(false);
    expect(trip.path.pointAt(0)).toEqual(locationToMap(at('recife'), rects.brazil));
  });
});
