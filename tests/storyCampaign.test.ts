import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tripForProgress } from '../src/story/flightPath';
import { STORY_LOCATIONS, getStoryLocation, stageIdForLocation } from '../src/story/locations';
import {
  STORY_PROFILES,
  campaignOpponents,
  campaignStartLocation,
  storyLocationId,
  storyRouteFor,
} from '../src/story/storyProfiles';
import {
  arriveForFight,
  legStageId,
  recordStoryMatch,
  routeCities,
  startStory,
  storyMatchSetup,
} from '../src/story/storyProgress';
import { DEFAULT_STAGE_ID, getStageConfig } from '../src/stages/stageRegistry';
import { STORY_MAP_LAYOUT } from '../src/ui/story/storyMapLayout';
import type { StoryProgress } from '../src/types/story';

const PLAYABLE = STORY_PROFILES.map((profile) => profile.fighterId);

/** Plays a whole campaign, winning every fight; returns every progress step. */
function playThrough(fighterId: string): StoryProgress[] {
  const steps = [startStory(fighterId)];
  let progress = steps[0]!;
  while (progress.phase !== 'complete') {
    progress = arriveForFight(progress);
    steps.push(progress);
    progress = recordStoryMatch(progress, true);
    steps.push(progress);
  }
  return steps;
}

describe('the campaign starts where the chosen fighter is', () => {
  it.each([
    ['augusto', 'recife'],
    ['isaque-ferreira', 'spain'],
    ['joao-guiotti', 'russia'],
    ['romualdo', 'joinville'],
    ['filipe', 'portugal'],
  ])('%s starts in %s (its configured story place)', (fighterId, place) => {
    expect(campaignStartLocation(fighterId)).toBe(place);
    expect(campaignStartLocation(fighterId)).toBe(storyLocationId(fighterId));
    expect(startStory(fighterId)).toMatchObject({
      selectedFighter: fighterId,
      currentStage: 0,
      currentLocation: place,
      phase: 'travel',
    });
  });

  it('the first flight on the map leaves from the chosen fighter’s place', () => {
    for (const fighterId of PLAYABLE) {
      const trip = tripForProgress(startStory(fighterId), STORY_MAP_LAYOUT.maps)!;
      expect(trip.from.id).toBe(campaignStartLocation(fighterId));
      expect(trip.to.id).toBe(storyRouteFor(fighterId)![0]!.destination);
    }
  });
});

describe('rivals are generated, never written per campaign', () => {
  it('every other story character, once each, and never the fighter itself', () => {
    for (const fighterId of PLAYABLE) {
      const opponents = campaignOpponents(fighterId);
      expect(opponents).not.toContain(fighterId);
      expect([...opponents].sort()).toEqual(PLAYABLE.filter((id) => id !== fighterId).sort());
      expect(
        storyRouteFor(fighterId)!
          .slice(0, -1)
          .map((leg) => leg.opponent),
      ).toEqual(opponents);
    }
  });

  it('each rival is met at its own story place', () => {
    for (const fighterId of PLAYABLE) {
      for (const leg of storyRouteFor(fighterId)!.slice(0, -1)) {
        expect(leg.destination).toBe(storyLocationId(leg.opponent));
      }
    }
  });

  it('Augusto: Recife -> Portugal (Filipe) -> Russia (João) -> Spain (Isaque) -> Joinville', () => {
    expect(routeCities('augusto')).toEqual([
      'recife',
      'portugal',
      'russia',
      'spain',
      'curitiba',
      'joinville',
      'joinville',
      'castelo-branco',
      'russia',
    ]);
    expect(campaignOpponents('augusto')).toEqual([
      'filipe',
      'joao-guiotti',
      'isaque-ferreira',
      'gabriel-mattozo',
      'romualdo',
      'aislan',
      'romulo',
    ]);
  });

  it('João: Russia -> Recife -> Portugal -> Spain (Isaque) -> Joinville', () => {
    expect(routeCities('joao-guiotti')).toEqual([
      'russia',
      'recife',
      'portugal',
      'spain',
      'curitiba',
      'joinville',
      'joinville',
      'castelo-branco',
      'russia',
    ]);
    expect(campaignOpponents('joao-guiotti')).toEqual([
      'augusto',
      'filipe',
      'isaque-ferreira',
      'gabriel-mattozo',
      'romualdo',
      'aislan',
      'romulo',
    ]);
  });

  it('Romualdo: Joinville -> Recife -> Portugal -> Russia -> Spain (Isaque)', () => {
    expect(routeCities('romualdo')).toEqual([
      'joinville',
      'recife',
      'portugal',
      'russia',
      'spain',
      'curitiba',
      'joinville',
      'castelo-branco',
      'russia',
    ]);
    expect(campaignOpponents('romualdo')).toEqual([
      'augusto',
      'filipe',
      'joao-guiotti',
      'isaque-ferreira',
      'gabriel-mattozo',
      'aislan',
      'romulo',
    ]);
  });

  it('Isaque: starts in Spain, never fights himself', () => {
    expect(campaignStartLocation('isaque-ferreira')).toBe('spain');
    expect(routeCities('isaque-ferreira')).toEqual([
      'spain',
      'recife',
      'portugal',
      'russia',
      'curitiba',
      'joinville',
      'joinville',
      'castelo-branco',
      'russia',
    ]);
  });
});

describe('travel: the campaign is always where the last fight was', () => {
  it.each(PLAYABLE)('%s: every landing updates the location; every trip leaves from it', (id) => {
    const steps = playThrough(id);
    const route = storyRouteFor(id)!;
    let expectedFrom = campaignStartLocation(id);
    for (const step of steps) {
      if (step.phase === 'travel') {
        expect(step.currentLocation).toBe(expectedFrom);
        expect(step.nextLocation).toBe(route[step.currentStage]!.destination);
      }
      if (step.phase === 'fight') {
        // Landed: the destination is now the current location.
        expect(step.currentLocation).toBe(route[step.currentStage]!.destination);
        expectedFrom = step.currentLocation;
      }
    }
    expect(steps.at(-1)).toMatchObject({ phase: 'complete', currentLocation: expectedFrom });
  });

  it('no trip flies to the place it leaves from', () => {
    for (const id of PLAYABLE) {
      for (const progress of playThrough(id).filter((p) => p.phase === 'travel')) {
        const trip = tripForProgress(progress, STORY_MAP_LAYOUT.maps)!;
        expect(trip.requiresFlight).toBe(trip.from.id !== trip.to.id);
      }
    }
  });
});

describe('Recife in the campaigns', () => {
  it('is a destination for everyone except the fighter who is there', () => {
    for (const id of PLAYABLE) {
      const visitsRecife = storyRouteFor(id)!.some((leg) => leg.destination === 'recife');
      expect(visitsRecife, id).toBe(campaignStartLocation(id) !== 'recife');
    }
  });

  it('a fight in Recife uses the RECIFE (Marco Zero) stage', () => {
    // João: Russia -> Recife, against Augusto, at the Marco Zero.
    const fight = arriveForFight(startStory('joao-guiotti'));
    expect(fight).toMatchObject({ currentLocation: 'recife', opponent: 'augusto' });
    const setup = storyMatchSetup(fight, 'normal');
    expect(setup.stageId).toBe('recife');
    expect(getStageConfig(setup.stageId).displayName).toBe('RECIFE');
  });

  it('places without their own stage fall back to the default stage', () => {
    for (const location of STORY_LOCATIONS) {
      const stageId = stageIdForLocation(location.id);
      expect(stageId).toBe(location.stageId ?? DEFAULT_STAGE_ID);
      expect(() => getStageConfig(stageId)).not.toThrow();
    }
    const augustoFirst = storyMatchSetup(arriveForFight(startStory('augusto')), 'normal');
    expect(augustoFirst.stageId).toBe(DEFAULT_STAGE_ID); // Portugal: no stage yet
    expect(legStageId({ opponent: 'joao-guiotti', destination: 'russia' })).toBe(DEFAULT_STAGE_ID);
    expect(legStageId({ opponent: 'romualdo', destination: 'joinville' })).toBe('joinville');
    expect(getStoryLocation('recife').stageId).toBe('recife');
  });
});

describe('no rule depends on a specific fighter', () => {
  it('story and stage code never compares fighter ids', () => {
    const files = [
      ...readdirSync(join(__dirname, '../src/story')).map((f) => `src/story/${f}`),
      ...readdirSync(join(__dirname, '../src/scenes/story')).map((f) => `src/scenes/story/${f}`),
      ...readdirSync(join(__dirname, '../src/render/stage')).map((f) => `src/render/stage/${f}`),
      'src/scenes/CharacterSelectScene.ts',
      'src/scenes/VersusScene.ts',
      'src/scenes/FightScene.ts',
    ];
    const ids = [...PLAYABLE, 'dmitry', 'fighter-a', 'fighter-b'];
    for (const file of files) {
      const source = readFileSync(join(__dirname, '..', file), 'utf8');
      for (const id of ids) {
        // A fighter id may only appear as configuration data (STORY_PROFILES), never in a test.
        expect(source, file).not.toMatch(new RegExp(`[=!]==?\\s*'${id}'`));
        expect(source, file).not.toMatch(new RegExp(`'${id}'\\s*[=!]==?`));
        expect(source, file).not.toMatch(new RegExp(`case '${id}'`));
      }
    }
  });
});
