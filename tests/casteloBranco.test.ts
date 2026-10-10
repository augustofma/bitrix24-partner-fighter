import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectStageAssets } from '../src/render/assets/stageAssets';
import { casteloBranco } from '../src/stages/casteloBranco';
import { getSelectableStages, getStageConfig } from '../src/stages/stageRegistry';
import { locationToMap } from '../src/story/brazilMap';
import {
  getStoryLocation,
  isHomeCountry,
  locationLabel,
  stageIdForLocation,
} from '../src/story/locations';
import { WORLD_VIEW } from '../src/story/mapViews';
import {
  STORY_FINAL_BOSS,
  STORY_PROFILES,
  campaignStartLocation,
  fighterOrigin,
  rivalLeg,
  storyRouteFor,
} from '../src/story/storyProfiles';
import { legStageId } from '../src/story/storyProgress';
import { STORY_MAP_LAYOUT } from '../src/ui/story/storyMapLayout';

describe('CASTELO BRANCO stage', () => {
  it('is registered and selectable, with every art layer in public/', () => {
    expect(getStageConfig('castelo-branco')).toBe(casteloBranco);
    expect(getSelectableStages()).toContain(casteloBranco);
    const paths = collectStageAssets([casteloBranco]).map((asset) => asset.path);
    expect(paths.sort()).toEqual(
      ['background.jpg', 'banner.png', 'plane.png', 'propeller.png', 'skyline.png']
        .map((file) => `stages/castelo-branco/${file}`)
        .sort(),
    );
    for (const path of paths) expect(existsSync(join(__dirname, '..', 'public', path))).toBe(true);
  });
});

describe('Castelo Branco in the story', () => {
  it('is a city abroad (Portugal), with its own stage, labelled by its name', () => {
    const place = getStoryLocation('castelo-branco');
    expect(place).toMatchObject({ kind: 'city', name: 'Castelo Branco', country: 'Portugal' });
    expect(isHomeCountry(place)).toBe(false);
    expect(locationLabel(place)).toBe('CASTELO BRANCO');
    expect(stageIdForLocation('castelo-branco')).toBe('castelo-branco');
  });

  it('is Rômulo’s origin and place: his campaign starts there', () => {
    expect(fighterOrigin('romulo')?.id).toBe('castelo-branco');
    expect(campaignStartLocation('romulo')).toBe('castelo-branco');
    const route = storyRouteFor('romulo')!;
    expect(route.some((leg) => leg.opponent === 'romulo')).toBe(false);
    expect(route.at(-1)?.opponent).toBe(STORY_FINAL_BOSS.fighterId);
  });

  it('every other campaign can meet Rômulo there, on the castle terrace', () => {
    expect(legStageId(rivalLeg('romulo'))).toBe('castelo-branco');
    for (const { fighterId } of STORY_PROFILES.filter((p) => p.fighterId !== 'romulo')) {
      const route = storyRouteFor(fighterId)!;
      const legs = route.filter((leg) => leg.opponent === 'romulo');
      expect(legs).toEqual([{ opponent: 'romulo', destination: 'castelo-branco' }]);
    }
  });

  it('on the world map Portugal, Castelo Branco and Spain are drawn apart (no overlap)', () => {
    const rect = STORY_MAP_LAYOUT.maps.world;
    const at = (id: string) => locationToMap(getStoryLocation(id), rect, WORLD_VIEW.bounds);
    const ids = ['portugal', 'castelo-branco', 'spain'];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = at(ids[i]!);
        const b = at(ids[j]!);
        // Two marker dots (radius 5) plus a little air.
        expect(Math.hypot(a.x - b.x, a.y - b.y), `${ids[i]} / ${ids[j]}`).toBeGreaterThan(11);
      }
    }
  });
});
