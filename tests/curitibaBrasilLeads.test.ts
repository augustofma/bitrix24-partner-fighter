import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT } from '../src/config/display';
import { collectStageAssets } from '../src/render/assets/stageAssets';
import { curitibaBrasilLeads } from '../src/stages/curitibaBrasilLeads';
import { partnerArena } from '../src/stages/partnerArena';
import { getSelectableStages, getStageConfig } from '../src/stages/stageRegistry';
import { stageIdForLocation } from '../src/story/locations';
import { STORY_ENDING_ART } from '../src/story/storyEndings';
import { STORY_PROFILES, rivalLeg } from '../src/story/storyProfiles';

const ART = join(__dirname, '..', 'public', 'stages/curitiba-brasil-leads/background.jpg');

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

describe('CURITIBA BRASIL LEADS stage', () => {
  it('is registered and selectable, with its art in public/ and the arena of every stage', () => {
    expect(getStageConfig('curitiba-brasil-leads')).toBe(curitibaBrasilLeads);
    expect(getSelectableStages()).toContain(curitibaBrasilLeads);
    expect(collectStageAssets([curitibaBrasilLeads]).map((a) => a.path)).toEqual([
      'stages/curitiba-brasil-leads/background.jpg',
    ]);
    expect(existsSync(ART)).toBe(true);
    expect(curitibaBrasilLeads).toMatchObject({
      width: partnerArena.width,
      groundY: partnerArena.groundY,
      wallMargin: partnerArena.wallMargin,
      ambience: 'curitiba',
    });
  });

  it('the art covers the screen and the crowd sits inside it, behind the barrier', () => {
    const [width, height] = jpegSize(ART);
    expect([width, height]).toEqual([1075, 605]);
    const art = curitibaBrasilLeads.art!;
    expect(art.top).toBeLessThanOrEqual(0);
    expect(art.top + height).toBeGreaterThanOrEqual(GAME_HEIGHT);
    const crowd = art.crowd!;
    for (const band of crowd.bands) {
      expect(band.x + band.width).toBeLessThanOrEqual(width);
      expect(band.y + band.height).toBeLessThanOrEqual(height);
      expect(crowd.barrier.y).toBeLessThan(band.y + band.height);
    }
    expect(crowd.barrier.x + crowd.barrier.width).toBeLessThanOrEqual(width);
    expect(art.top + crowd.barrier.y + crowd.barrier.height).toBeLessThan(
      curitibaBrasilLeads.groundY,
    );
  });
});

describe('Rodolfo in the story', () => {
  it('lives in Curitiba and is met at the Brasil Leads stage, with his ending', () => {
    expect(STORY_PROFILES).toContainEqual({
      fighterId: 'rodolfo',
      home: 'curitiba',
      encounterStageId: 'curitiba-brasil-leads',
    });
    expect(rivalLeg('rodolfo')).toEqual({
      opponent: 'rodolfo',
      destination: 'curitiba',
      stageId: 'curitiba-brasil-leads',
    });
    // Other fights in Curitiba keep the original Jardim Botânico stage.
    expect(stageIdForLocation('curitiba')).toBe('curitiba');
    expect(STORY_ENDING_ART.rodolfo).toBe('story/endings/rodolfo.jpg');
    expect(existsSync(join(__dirname, '..', 'public', 'story/endings/rodolfo.jpg'))).toBe(true);
  });
});
