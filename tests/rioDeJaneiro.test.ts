import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT } from '../src/config/display';
import { collectStageAssets } from '../src/render/assets/stageAssets';
import { rioDeJaneiro } from '../src/stages/rioDeJaneiro';
import { getSelectableStages, getStageConfig } from '../src/stages/stageRegistry';
import { BRAZIL_BOUNDS, locationToMap } from '../src/story/brazilMap';
import {
  STORY_LOCATIONS,
  getStoryLocation,
  locationLabel,
  stageIdForLocation,
} from '../src/story/locations';
import { WORLD_VIEW } from '../src/story/mapViews';
import { STORY_MAP_LAYOUT } from '../src/ui/story/storyMapLayout';

const ART = join(__dirname, '..', 'public', 'stages/rio-de-janeiro/background.jpg');

/** JPEG size from its SOF marker. */
function jpegSize(file: string): [number, number] {
  const data = readFileSync(file);
  for (let i = 2; i < data.length;) {
    const marker = data[i + 1]!;
    const length = data.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc2)
      return [data.readUInt16BE(i + 7), data.readUInt16BE(i + 5)];
    i += 2 + length;
  }
  throw new Error('no SOF');
}

describe('RIO DE JANEIRO stage', () => {
  it('is registered and selectable, with its art in public/', () => {
    expect(getStageConfig('rio-de-janeiro')).toBe(rioDeJaneiro);
    expect(getSelectableStages()).toContain(rioDeJaneiro);
    expect(collectStageAssets([rioDeJaneiro]).map((a) => a.path)).toEqual([
      'stages/rio-de-janeiro/background.jpg',
    ]);
    expect(existsSync(ART)).toBe(true);
  });

  it('the art covers the screen and the crowd sits inside it, behind the barrier', () => {
    const [width, height] = jpegSize(ART);
    const art = rioDeJaneiro.art!;
    expect(art.top + height).toBeGreaterThanOrEqual(GAME_HEIGHT);
    const crowd = art.crowd!;
    for (const band of crowd.bands) {
      expect(band.x + band.width).toBeLessThanOrEqual(width);
      expect(band.y + band.height).toBeLessThanOrEqual(height);
      // The barrier hides each band's lower edge while the columns bounce.
      expect(crowd.barrier.y).toBeLessThan(band.y + band.height);
    }
    expect(crowd.barrier.x + crowd.barrier.width).toBeLessThanOrEqual(width);
  });
});

describe('Rio de Janeiro in the story', () => {
  it('is a Brazilian city (RJ) with its own stage', () => {
    const place = getStoryLocation('rio-de-janeiro');
    expect(place).toMatchObject({ kind: 'city', name: 'Rio de Janeiro', regionCode: 'RJ' });
    expect(locationLabel(place)).toBe('RIO DE JANEIRO - RJ');
    expect(stageIdForLocation('rio-de-janeiro')).toBe('rio-de-janeiro');
    // Inside the Brazil map's frame (the coastline check for every place is in storyMode.test).
    expect(place.latitude).toBeLessThan(BRAZIL_BOUNDS.north);
    expect(place.latitude).toBeGreaterThan(BRAZIL_BOUNDS.south);
    expect(place.longitude).toBeGreaterThan(BRAZIL_BOUNDS.west);
    expect(place.longitude).toBeLessThan(BRAZIL_BOUNDS.east);
  });

  it.each([
    ['Brazil map', STORY_MAP_LAYOUT.maps.brazil, BRAZIL_BOUNDS],
    ['world map', STORY_MAP_LAYOUT.maps.world, WORLD_VIEW.bounds],
  ] as const)('on the %s Rio is drawn apart from every other place', (_name, rect, bounds) => {
    const rio = locationToMap(getStoryLocation('rio-de-janeiro'), rect, bounds);
    for (const other of STORY_LOCATIONS.filter(
      (l) => l.id !== 'rio-de-janeiro' && l.kind === 'city',
    )) {
      const at = locationToMap(other, rect, bounds);
      expect(Math.hypot(rio.x - at.x, rio.y - at.y), other.id).toBeGreaterThan(11);
    }
  });
});
