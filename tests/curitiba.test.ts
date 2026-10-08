import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectStageAssets } from '../src/render/assets/stageAssets';
import { curitiba } from '../src/stages/curitiba';
import { getSelectableStages, getStageConfig } from '../src/stages/stageRegistry';
import { BRAZIL_BOUNDS, locationToMap } from '../src/story/brazilMap';
import { getStoryLocation, locationLabel, stageIdForLocation } from '../src/story/locations';
import { WORLD_VIEW } from '../src/story/mapViews';
import {
  STORY_PROFILES,
  campaignStartLocation,
  fighterOrigin,
  rivalLeg,
  storyRouteFor,
} from '../src/story/storyProfiles';
import { legStageId } from '../src/story/storyProgress';
import { STORY_MAP_LAYOUT } from '../src/ui/story/storyMapLayout';

describe('CURITIBA stage', () => {
  it('is registered and selectable, with every art layer in public/', () => {
    expect(getStageConfig('curitiba')).toBe(curitiba);
    expect(getSelectableStages()).toContain(curitiba);
    const paths = collectStageAssets([curitiba]).map((asset) => asset.path);
    expect(paths.sort()).toEqual(
      ['background.jpg', 'banner.png', 'plane.png', 'propeller.png', 'skyline.png']
        .map((file) => `stages/curitiba/${file}`)
        .sort(),
    );
    for (const path of paths) expect(existsSync(join(__dirname, '..', 'public', path))).toBe(true);
  });
});

describe('Curitiba in the story', () => {
  it('is a Brazilian city (PR) with its own stage', () => {
    const place = getStoryLocation('curitiba');
    expect(place).toMatchObject({ kind: 'city', name: 'Curitiba', regionCode: 'PR' });
    expect(locationLabel(place)).toBe('CURITIBA - PR');
    expect(stageIdForLocation('curitiba')).toBe('curitiba');
  });

  it('is Gabriel Mattozo’s origin: his campaign starts there, the others meet him there', () => {
    expect(fighterOrigin('gabriel-mattozo')?.id).toBe('curitiba');
    expect(campaignStartLocation('gabriel-mattozo')).toBe('curitiba');
    expect(legStageId(rivalLeg('gabriel-mattozo'))).toBe('curitiba');
    for (const { fighterId } of STORY_PROFILES.filter((p) => p.fighterId !== 'gabriel-mattozo')) {
      const legs = storyRouteFor(fighterId)!.filter((leg) => leg.opponent === 'gabriel-mattozo');
      expect(legs).toEqual([{ opponent: 'gabriel-mattozo', destination: 'curitiba' }]);
    }
  });

  it.each([
    ['Brazil map', STORY_MAP_LAYOUT.maps.brazil, BRAZIL_BOUNDS],
    ['world map', STORY_MAP_LAYOUT.maps.world, WORLD_VIEW.bounds],
  ] as const)('on the %s Curitiba and Joinville are drawn apart', (_name, rect, bounds) => {
    const a = locationToMap(getStoryLocation('curitiba'), rect, bounds);
    const b = locationToMap(getStoryLocation('joinville'), rect, bounds);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(11);
  });
});
