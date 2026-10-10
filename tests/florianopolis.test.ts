import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT } from '../src/config/display';
import { collectStageAssets } from '../src/render/assets/stageAssets';
import { florianopolis } from '../src/stages/florianopolis';
import { partnerArena } from '../src/stages/partnerArena';
import { getSelectableStages, getStageConfig } from '../src/stages/stageRegistry';
import { BRAZIL_BOUNDS, locationToMap } from '../src/story/brazilMap';
import {
  STORY_LOCATIONS,
  getStoryLocation,
  locationLabel,
  stageIdForLocation,
} from '../src/story/locations';
import { STORY_ENDING_ART } from '../src/story/storyEndings';
import { STORY_PROFILES } from '../src/story/storyProfiles';
import { WORLD_VIEW } from '../src/story/mapViews';
import { STORY_MAP_LAYOUT } from '../src/ui/story/storyMapLayout';

const ART = join(__dirname, '..', 'public', 'stages/florianopolis/background.jpg');

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

describe('FLORIANÓPOLIS stage', () => {
  it('is registered and selectable, with its art in public/ and the arena of every stage', () => {
    expect(getStageConfig('florianopolis')).toBe(florianopolis);
    expect(getSelectableStages()).toContain(florianopolis);
    expect(collectStageAssets([florianopolis]).map((a) => a.path)).toEqual([
      'stages/florianopolis/background.jpg',
    ]);
    expect(existsSync(ART)).toBe(true);
    expect(florianopolis).toMatchObject({
      width: partnerArena.width,
      groundY: partnerArena.groundY,
      wallMargin: partnerArena.wallMargin,
    });
  });

  it('the art covers the screen and the crowd sits inside it, behind the barrier', () => {
    const [width, height] = jpegSize(ART);
    const art = florianopolis.art!;
    expect(art.top).toBeLessThanOrEqual(0);
    expect(art.top + height).toBeGreaterThanOrEqual(GAME_HEIGHT);
    const crowd = art.crowd!;
    for (const band of crowd.bands) {
      expect(band.x + band.width).toBeLessThanOrEqual(width);
      expect(band.y + band.height).toBeLessThanOrEqual(height);
      // The barrier hides each band's lower edge while the columns bounce.
      expect(crowd.barrier.y).toBeLessThan(band.y + band.height);
    }
    expect(crowd.barrier.x + crowd.barrier.width).toBeLessThanOrEqual(width);
    // The fighters stand on the promenade, in front of the barrier.
    expect(art.top + crowd.barrier.y + crowd.barrier.height).toBeLessThan(florianopolis.groundY);
  });
});

describe('Florianópolis in the story', () => {
  it('is a Brazilian city (SC) with its own stage, Amanda Konrad home and ending', () => {
    const place = getStoryLocation('florianopolis');
    expect(place).toMatchObject({ kind: 'city', name: 'Florianópolis', regionCode: 'SC' });
    expect(locationLabel(place)).toBe('FLORIANÓPOLIS - SC');
    expect(stageIdForLocation('florianopolis')).toBe('florianopolis');
    expect(STORY_PROFILES).toContainEqual({ fighterId: 'amanda-konrad', home: 'florianopolis' });
    expect(STORY_ENDING_ART['amanda-konrad']).toBe('story/endings/amanda-konrad.jpg');
    expect(existsSync(join(__dirname, '..', 'public', 'story/endings/amanda-konrad.jpg'))).toBe(
      true,
    );
    expect(place.latitude).toBeLessThan(BRAZIL_BOUNDS.north);
    expect(place.latitude).toBeGreaterThan(BRAZIL_BOUNDS.south);
    expect(place.longitude).toBeGreaterThan(BRAZIL_BOUNDS.west);
    expect(place.longitude).toBeLessThan(BRAZIL_BOUNDS.east);
  });

  it.each([
    ['Brazil map', STORY_MAP_LAYOUT.maps.brazil, BRAZIL_BOUNDS],
    ['world map', STORY_MAP_LAYOUT.maps.world, WORLD_VIEW.bounds],
  ] as const)(
    'on the %s Florianópolis is drawn apart from every other place',
    (_n, rect, bounds) => {
      const floripa = locationToMap(getStoryLocation('florianopolis'), rect, bounds);
      for (const other of STORY_LOCATIONS.filter(
        (l) => l.id !== 'florianopolis' && l.kind === 'city',
      )) {
        const at = locationToMap(other, rect, bounds);
        expect(Math.hypot(floripa.x - at.x, floripa.y - at.y), other.id).toBeGreaterThan(11);
      }
    },
  );
});
