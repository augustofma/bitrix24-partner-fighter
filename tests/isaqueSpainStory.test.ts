import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { projectToMap } from '../src/story/brazilMap';
import { tripForProgress } from '../src/story/flightPath';
import {
  getStoryLocation,
  isHomeCountry,
  locationLabel,
  locationName,
} from '../src/story/locations';
import { WORLD_BOUNDS, WORLD_VIEW, mapViewForTrip, viewShows } from '../src/story/mapViews';
import {
  campaignOpponents,
  fighterOrigin,
  getStoryProfile,
  quickFightStageId,
  storyLocationId,
  storyRouteFor,
} from '../src/story/storyProfiles';
import {
  arriveForFight,
  currentLeg,
  recordStoryMatch,
  startStory,
  storyMatchSetup,
} from '../src/story/storyProgress';
import { DEFAULT_STAGE_ID } from '../src/stages/stageRegistry';
import type { StoryProgress } from '../src/types/story';
import { STORY_MAP_LAYOUT } from '../src/ui/story/storyMapLayout';

const ISAQUE = 'isaque-ferreira';

/** Plays a campaign (winning) until the trip to Isaque; returns that travel step. */
function untilIsaque(fighterId: string): StoryProgress {
  let progress = startStory(fighterId);
  while (progress.opponent !== ISAQUE) {
    progress = recordStoryMatch(arriveForFight(progress), true);
  }
  return progress;
}

describe('SPAIN story location', () => {
  it('exists as a country with valid coordinates, inside the world map, near Portugal', () => {
    const spain = getStoryLocation('spain');
    expect(spain).toMatchObject({ kind: 'country', name: 'Espanha' });
    expect(locationLabel(spain)).toBe('ESPANHA');
    expect(locationName(spain)).toBe('ESPANHA');
    expect(spain.latitude).toBeGreaterThan(36);
    expect(spain.latitude).toBeLessThan(44);
    expect(spain.longitude).toBeGreaterThan(-9.5);
    expect(spain.longitude).toBeLessThan(3.5);
    // East of Portugal, west of Russia, north of Brazil.
    expect(spain.longitude).toBeGreaterThan(getStoryLocation('portugal').longitude);
    expect(spain.longitude).toBeLessThan(getStoryLocation('russia').longitude);
    expect(spain.latitude).toBeGreaterThan(getStoryLocation('recife').latitude);
    expect(viewShows(WORLD_VIEW, spain)).toBe(true);
    expect(spain.latitude).toBeLessThan(WORLD_BOUNDS.north);
    expect(isHomeCountry(spain)).toBe(false);
  });

  it('its marker and Portugal’s are apart, and their labels go to opposite sides', () => {
    const rect = STORY_MAP_LAYOUT.maps.world;
    const at = (id: string) => {
      const l = getStoryLocation(id);
      return projectToMap(l.latitude, l.longitude, rect, WORLD_BOUNDS);
    };
    const spain = at('spain');
    const portugal = at('portugal');
    expect(Math.hypot(spain.x - portugal.x, spain.y - portugal.y)).toBeGreaterThan(8);
    const labels = [getStoryLocation('spain').mapLabel, getStoryLocation('portugal').mapLabel];
    expect(labels[0]?.side).not.toBe(labels[1]?.side);
    expect(Math.sign(labels[0]!.dy)).not.toBe(Math.sign(labels[1]!.dy));
  });
});

describe('Isaque Ferreira in the story (configuration only)', () => {
  it('his story place is Spain; no invented official origin', () => {
    expect(storyLocationId(ISAQUE)).toBe('spain');
    expect(getStoryProfile(ISAQUE)?.home).toBeUndefined();
    expect(fighterOrigin(ISAQUE)).toBeUndefined();
  });

  it('every other campaign meets him in Spain, right after Russia where that leg exists', () => {
    for (const fighter of ['augusto', 'filipe', 'joao-guiotti', 'romualdo']) {
      const route = storyRouteFor(fighter)!;
      const leg = route.find((l) => l.opponent === ISAQUE);
      expect(leg, fighter).toEqual({ opponent: ISAQUE, destination: 'spain' });
      const order = campaignOpponents(fighter);
      if (order.includes('joao-guiotti')) {
        expect(order.indexOf(ISAQUE)).toBe(order.indexOf('joao-guiotti') + 1);
      }
    }
  });

  it('the scenes never test his id (the map, VS and flow read the route)', () => {
    for (const file of [
      'src/scenes/story/StoryMapScene.ts',
      'src/scenes/VersusScene.ts',
      'src/scenes/story/storyFlow.ts',
      'src/story/flightPath.ts',
    ]) {
      expect(readFileSync(join(__dirname, '..', file), 'utf8'), file).not.toContain(ISAQUE);
    }
  });
});

describe('the trip to Spain and the fight there', () => {
  it.each([
    ['augusto', 'russia'],
    ['filipe', 'russia'],
    ['joao-guiotti', 'portugal'],
    ['romualdo', 'russia'],
  ])('%s flies from where the campaign is (%s) to Spain, on the world map', (fighter, from) => {
    const travel = untilIsaque(fighter);
    expect(travel).toMatchObject({ phase: 'travel', currentLocation: from, nextLocation: 'spain' });
    const trip = tripForProgress(travel, STORY_MAP_LAYOUT.maps)!;
    expect(trip.from.id).toBe(travel.currentLocation);
    expect(trip.to.id).toBe('spain');
    expect(trip.view.id).toBe('world');
    expect(trip.international).toBe(true);
    expect(mapViewForTrip(trip.from, trip.to).flightMs).toBe(WORLD_VIEW.flightMs);
  });

  it('landing makes Spain the current place; the VS shows ESPANHA; the fight is regular', () => {
    const fight = arriveForFight(untilIsaque('augusto'));
    expect(fight).toMatchObject({ phase: 'fight', currentLocation: 'spain', opponent: ISAQUE });
    // The VS writes the leg's destination name under "VS".
    expect(locationName(getStoryLocation(currentLeg(fight)!.destination))).toBe('ESPANHA');
    expect(storyMatchSetup(fight, 'normal')).toEqual({
      playerFighterId: 'augusto',
      cpuFighterId: ISAQUE,
      stageId: DEFAULT_STAGE_ID, // Spain has no stage of its own yet
      difficulty: 'normal',
      mode: 'story',
    });
  });

  it('a loss keeps the same fight in Spain (retry); a win moves on from Spain', () => {
    const fight = arriveForFight(untilIsaque('augusto'));
    const lost = recordStoryMatch(fight, false);
    expect(lost).toEqual(fight);
    expect(storyMatchSetup(lost, 'normal').cpuFighterId).toBe(ISAQUE);
    expect(lost.currentLocation).toBe('spain');
    const won = recordStoryMatch(fight, true);
    expect(won).toMatchObject({
      phase: 'travel',
      currentStage: fight.currentStage + 1,
      currentLocation: 'spain',
      nextLocation: 'joinville',
      opponent: 'romualdo',
    });
  });

  it('when Isaque is the last rival, beating him completes the campaign in Spain', () => {
    const fight = arriveForFight(untilIsaque('romualdo'));
    expect(recordStoryMatch(fight, true)).toMatchObject({
      phase: 'complete',
      currentLocation: 'spain',
    });
  });

  it('quick fights stay independent: no Spain stage, nothing changes for the others', () => {
    expect(quickFightStageId(ISAQUE, 'fighter-b')).toBe(DEFAULT_STAGE_ID);
    expect(quickFightStageId('augusto', 'fighter-b')).toBe('recife');
    expect(quickFightStageId('romualdo', 'fighter-b')).toBe('joinville');
  });

  it('domestic trips still use the Brazil map', () => {
    const recife = getStoryLocation('recife');
    const joinville = getStoryLocation('joinville');
    expect(mapViewForTrip(recife, joinville).id).toBe('brazil');
    expect(mapViewForTrip(getStoryLocation('russia'), getStoryLocation('portugal')).id).toBe(
      'world',
    );
  });
});
