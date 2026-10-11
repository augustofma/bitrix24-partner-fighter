import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_STAGE_ID } from '../src/stages/stageRegistry';
import { BRAZIL_BOUNDS, locationToMap } from '../src/story/brazilMap';
import {
  STORY_LOCATIONS,
  getStoryLocation,
  locationLabel,
  stageIdForLocation,
} from '../src/story/locations';
import { WORLD_VIEW } from '../src/story/mapViews';
import { STORY_ENDING_ART } from '../src/story/storyEndings';
import { STORY_PROFILES, campaignStartLocation, rivalLeg } from '../src/story/storyProfiles';
import { STORY_MAP_LAYOUT } from '../src/ui/story/storyMapLayout';

describe('São José (SC) in the story', () => {
  it('is a Brazilian city (SC), on the mainland facing Florianópolis island', () => {
    const place = getStoryLocation('sao-jose');
    expect(place).toMatchObject({ kind: 'city', name: 'São José', regionCode: 'SC' });
    expect(locationLabel(place)).toBe('SÃO JOSÉ - SC');
    // West of Florianópolis (the island), at about the same latitude.
    const floripa = getStoryLocation('florianopolis');
    expect(place.longitude).toBeLessThan(floripa.longitude);
    expect(Math.abs(place.latitude - floripa.latitude)).toBeLessThan(0.1);
    expect(place.latitude).toBeLessThan(BRAZIL_BOUNDS.north);
    expect(place.latitude).toBeGreaterThan(BRAZIL_BOUNDS.south);
  });

  it('is Jonas’s home: his campaign starts there, the others meet him at the Partner Summit', () => {
    expect(STORY_PROFILES).toContainEqual({ fighterId: 'jonas', home: 'sao-jose' });
    expect(campaignStartLocation('jonas')).toBe('sao-jose');
    expect(stageIdForLocation('sao-jose')).toBe(DEFAULT_STAGE_ID);
    expect(DEFAULT_STAGE_ID).toBe('partner-summit');
    expect(rivalLeg('jonas')).toEqual({ opponent: 'jonas', destination: 'sao-jose' });
    expect(STORY_ENDING_ART.jonas).toBe('story/endings/jonas.jpg');
    expect(existsSync(join(__dirname, '..', 'public', 'story/endings/jonas.jpg'))).toBe(true);
  });

  it.each([
    ['Brazil map', STORY_MAP_LAYOUT.maps.brazil, BRAZIL_BOUNDS],
    ['world map', STORY_MAP_LAYOUT.maps.world, WORLD_VIEW.bounds],
  ] as const)('on the %s São José is drawn apart from every other place', (_n, rect, bounds) => {
    const saoJose = locationToMap(getStoryLocation('sao-jose'), rect, bounds);
    for (const other of STORY_LOCATIONS.filter((l) => l.id !== 'sao-jose' && l.kind === 'city')) {
      const at = locationToMap(other, rect, bounds);
      expect(Math.hypot(saoJose.x - at.x, saoJose.y - at.y), other.id).toBeGreaterThan(11);
    }
  });
});
