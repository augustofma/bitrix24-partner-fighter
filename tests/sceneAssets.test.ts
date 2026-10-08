import { describe, expect, it } from 'vitest';
import { ROSTER, getFighterConfig } from '../src/fighters/roster';
import { bootAssets, matchAssets, stageThumbnailAssets } from '../src/render/assets/sceneAssets';
import { storyEndingAsset } from '../src/render/assets/storyEndingAssets';
import { getSelectableStages, getStageConfig } from '../src/stages/stageRegistry';

const sheetKeys = ROSTER.flatMap((f) => (f.assets.sprite ? [f.assets.sprite.sheet.key] : []));

describe('assets loaded per moment of the game', () => {
  it('the boot skips the heavy art: no sprite sheet, stage art or ending', () => {
    const assets = bootAssets(ROSTER);
    expect(assets.some((a) => a.type === 'spritesheet')).toBe(false);
    expect(assets.some((a) => a.type === 'image' && a.path.startsWith('stages/'))).toBe(false);
    expect(assets.some((a) => a.type === 'image' && a.path.startsWith('story/'))).toBe(false);
    // ...but has what the selects need: every fighter's portrait.
    for (const { assets: art } of ROSTER) {
      if (art.portrait)
        expect(assets.some((a) => a.type === 'image' && a.path === art.portrait)).toBe(true);
    }
  });

  it('a fight loads both fighters sheets and the stage art, and only them', () => {
    const fighters = [getFighterConfig('augusto'), getFighterConfig('gabriel-mattozo')];
    const stage = getStageConfig('curitiba');
    const keys = matchAssets(fighters, stage).map((a) => a.key);
    const sheets = keys.filter((key) => sheetKeys.includes(key));
    expect(sheets).toEqual(fighters.map((f) => f.assets.sprite!.sheet.key));
    expect(keys).toContain(stage.art!.background.key);
    expect(keys.some((key) => key.startsWith('story-ending:'))).toBe(false);
  });

  it('a story fight also fetches the player ending illustration', () => {
    const fighters = [getFighterConfig('augusto'), getFighterConfig('filipe')];
    const keys = matchAssets(fighters, getStageConfig('portugal'), 'augusto').map((a) => a.key);
    expect(keys).toContain(storyEndingAsset('augusto')!.key);
  });

  it('the stage select loads one background per illustrated stage', () => {
    const stages = getSelectableStages();
    const assets = stageThumbnailAssets(stages);
    expect(assets.map((a) => a.key)).toEqual(
      stages.flatMap((s) => (s.art ? [s.art.background.key] : [])),
    );
  });
});
