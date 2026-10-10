import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AMBIENCES, ambienceFiles, ambienceKey, crowdSfx } from '../src/config/audio';
import { getFighterConfig } from '../src/fighters/roster';
import { matchAssets } from '../src/render/assets/sceneAssets';
import { STAGES, getStageConfig } from '../src/stages/stageRegistry';
import type { AmbienceId } from '../src/types/audio';

const PUBLIC = join(__dirname, '..', 'public');

describe('stage ambience', () => {
  it('every stage has its own ambience loop, with both files on disk', () => {
    for (const stage of STAGES) {
      expect(stage.ambience, stage.id).toBeDefined();
      for (const file of ambienceFiles(stage.ambience!))
        expect(existsSync(join(PUBLIC, file)), file).toBe(true);
    }
  });

  it('each place sounds like itself', () => {
    const ambienceOf = (id: string) => getStageConfig(id).ambience;
    expect(ambienceOf('rio-de-janeiro')).toBe('rio');
    expect(ambienceOf('recife')).toBe('recife');
    expect(ambienceOf('spain')).toBe('spain');
    expect(ambienceOf('bitrix24-moscow')).toBe('office');
    expect(ambienceOf('partner-summit')).toBe('arena');
  });

  it('is fetched with the fight, not at boot', () => {
    const fighters = [getFighterConfig('augusto'), getFighterConfig('filipe')];
    const keys = matchAssets(fighters, getStageConfig('rio-de-janeiro')).map((a) => a.key);
    expect(keys).toContain(ambienceKey('rio'));
  });

  it('every loop exists for every ambience id', () => {
    for (const id of Object.keys(AMBIENCES) as AmbienceId[])
      for (const file of ambienceFiles(id)) expect(existsSync(join(PUBLIC, file)), file).toBe(true);
  });
});

describe('crowd shouts', () => {
  it('an "ooh" at a big hit, a cheer at specials, KOs and perfects', () => {
    const recife = getStageConfig('recife');
    expect(crowdSfx(recife, 'bigHit')).toBe('crowd-ooh');
    expect(crowdSfx(recife, 'special')).toBe('crowd-cheer');
    expect(crowdSfx(recife, 'ko')).toBe('crowd-cheer');
    expect(crowdSfx(recife, 'perfect')).toBe('crowd-cheer');
  });

  it('nobody cheers at the Bitrix24 office, or on a stage without ambience', () => {
    expect(crowdSfx(getStageConfig('bitrix24-moscow'), 'ko')).toBeNull();
    expect(crowdSfx({}, 'ko')).toBeNull();
  });
});
