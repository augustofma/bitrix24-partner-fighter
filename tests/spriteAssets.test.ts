import { describe, expect, it } from 'vitest';
import { fighterA } from '../src/fighters/fighterA';
import { fighterB } from '../src/fighters/fighterB';
import { ROSTER } from '../src/fighters/roster';
import {
  collectFighterAssets,
  pixelArtTextureKeys,
  portraitTextureKey,
  vfxTextureKey,
} from '../src/render/assets/fighterAssets';
import {
  selectSpriteAssets,
  validateRosterAssets,
  validateSpriteAssets,
} from '../src/render/sprite/spriteValidation';
import { FIGHTER_STATES, type FighterConfig, type FighterSpriteAssets } from '../src/types/fighter';

/** FIGHTER_A demo sheet: 8x5 grid. */
const DEMO_SHEET_FRAMES = 40;

function withSprite(base: FighterConfig, sprite: FighterSpriteAssets): FighterConfig {
  return { ...base, id: `${base.id}-test`, assets: { ...base.assets, sprite } };
}

const demoSprite = (): FighterSpriteAssets => {
  const sprite = fighterA.assets.sprite;
  if (!sprite) throw new Error('fighterA must declare demo sprite assets');
  return sprite;
};

describe('roster art configuration', () => {
  it('the roster has no asset errors', () => {
    const errors = validateRosterAssets(ROSTER).filter((i) => i.level === 'error');
    expect(errors).toEqual([]);
  });

  it('FIGHTER_A declares every animation (no warnings) within its sheet', () => {
    expect(validateSpriteAssets(fighterA, DEMO_SHEET_FRAMES)).toEqual([]);
  });

  it('FIGHTER_B has no art and keeps the placeholder', () => {
    expect(fighterB.assets.sprite).toBeUndefined();
    expect(selectSpriteAssets(fighterB, null)).toBeNull();
  });
});

describe('selectSpriteAssets (fallback decision)', () => {
  it('uses the sprite when the config is valid and the texture loaded', () => {
    expect(selectSpriteAssets(fighterA, DEMO_SHEET_FRAMES)).toBe(fighterA.assets.sprite);
  });

  it('falls back when the texture failed to load', () => {
    expect(selectSpriteAssets(fighterA, null)).toBeNull();
    expect(selectSpriteAssets(fighterA, 0)).toBeNull();
  });

  it('falls back when a frame is outside the loaded sheet', () => {
    expect(selectSpriteAssets(fighterA, 10)).toBeNull();
  });

  it('falls back on a broken config', () => {
    const broken = withSprite(fighterA, {
      ...demoSprite(),
      animations: { idle: { frames: [] } },
    });
    expect(selectSpriteAssets(broken, DEMO_SHEET_FRAMES)).toBeNull();
  });
});

describe('validateSpriteAssets', () => {
  const messages = (config: FighterConfig, level: 'error' | 'warning') =>
    validateSpriteAssets(config, DEMO_SHEET_FRAMES)
      .filter((i) => i.level === level)
      .map((i) => i.message);

  it('reports a missing idle animation (configs built loosely at runtime)', () => {
    const loose = { ...demoSprite(), animations: {} } as unknown as FighterSpriteAssets;
    expect(messages(withSprite(fighterA, loose), 'error')).toContain(
      'animations.idle is required.',
    );
  });

  it('reports invalid frames, bad sizes, bad scale and inconsistent attack phases', () => {
    const config = withSprite(fighterA, {
      sheet: { key: 'k', path: 'p.png', frameWidth: 0, frameHeight: 64 },
      visual: { scale: 0 },
      animations: {
        idle: { frames: [0, -1, 1.5] },
        punch: { frames: [1, 2], attackPhases: { startup: 1, active: 1, recovery: 1 } },
      },
    });
    const errors = messages(config, 'error');
    expect(errors.some((m) => m.includes('frameWidth/frameHeight'))).toBe(true);
    expect(errors.some((m) => m.includes('scale'))).toBe(true);
    expect(errors.filter((m) => m.includes('invalid frame index'))).toHaveLength(2);
    expect(errors.some((m) => m.includes('attackPhases must add up'))).toBe(true);
  });

  it('validates jumpPhases like attackPhases', () => {
    const config = withSprite(fighterA, {
      ...demoSprite(),
      animations: {
        idle: { frames: [0], jumpPhases: { rise: 1, apex: 0, fall: 0 } },
        jump: { frames: [8, 9, 31], jumpPhases: { rise: 1, apex: 1, fall: 2 } },
      },
    });
    expect(messages(config, 'error')).toContain(
      'animations.jump.jumpPhases must add up to 3 (frames.length).',
    );
    expect(messages(config, 'warning')).toContain(
      'animations.idle.jumpPhases is only used by the jump animation.',
    );
  });

  it('warns (not errors) about missing optional animations', () => {
    const config = withSprite(fighterA, { ...demoSprite(), animations: { idle: { frames: [0] } } });
    expect(messages(config, 'error')).toEqual([]);
    // Idle exists, and this fighter has no special to animate.
    expect(messages(config, 'warning')).toHaveLength(FIGHTER_STATES.length - 2);
  });

  it('reports two different sheets sharing a texture key', () => {
    const other = withSprite(fighterB, {
      ...demoSprite(),
      sheet: { ...demoSprite().sheet, path: 'fighters/other/sprite.png' },
    });
    const errors = validateRosterAssets([fighterA, other]).filter((i) => i.level === 'error');
    expect(errors).toHaveLength(1);
  });
});

describe('collectFighterAssets (loading derived from the roster)', () => {
  it('collects portrait, special-effect emblems and sheet of fighters that declare them', () => {
    const requests = collectFighterAssets(ROSTER);
    expect(requests).toEqual([
      {
        type: 'image',
        key: portraitTextureKey('fighters/augusto/portrait.png'),
        path: 'fighters/augusto/portrait.png',
      },
      { type: 'image', key: vfxTextureKey('vfx/24zap-emblem.png'), path: 'vfx/24zap-emblem.png' },
      {
        type: 'spritesheet',
        key: 'augusto-sheet',
        path: 'fighters/augusto/sprite.png',
        frameWidth: 192,
        frameHeight: 224,
      },
      {
        type: 'image',
        key: portraitTextureKey('fighters/filipe/portrait.png'),
        path: 'fighters/filipe/portrait.png',
      },
      {
        type: 'image',
        key: vfxTextureKey('vfx/mindhub-emblem.png'),
        path: 'vfx/mindhub-emblem.png',
      },
      { type: 'image', key: vfxTextureKey('vfx/mindhub-sigil.png'), path: 'vfx/mindhub-sigil.png' },
      {
        type: 'spritesheet',
        key: 'filipe-sheet',
        path: 'fighters/filipe/sprite.png',
        frameWidth: 192,
        frameHeight: 224,
      },
      {
        type: 'image',
        key: portraitTextureKey('fighters/joao-guiotti/portrait.png'),
        path: 'fighters/joao-guiotti/portrait.png',
      },
      {
        type: 'image',
        key: vfxTextureKey('vfx/vibecode-emblem.png'),
        path: 'vfx/vibecode-emblem.png',
      },
      {
        type: 'spritesheet',
        key: 'joao-guiotti-sheet',
        path: 'fighters/joao-guiotti/sprite.png',
        frameWidth: 192,
        frameHeight: 224,
      },
      {
        type: 'image',
        key: portraitTextureKey('fighters/romualdo/portrait.png'),
        path: 'fighters/romualdo/portrait.png',
      },
      {
        type: 'image',
        key: vfxTextureKey('vfx/gptmaker-emblem.png'),
        path: 'vfx/gptmaker-emblem.png',
      },
      {
        type: 'spritesheet',
        key: 'romualdo-sheet',
        path: 'fighters/romualdo/sprite.png',
        frameWidth: 192,
        frameHeight: 224,
      },
      {
        type: 'image',
        key: portraitTextureKey('fighters/isaque-ferreira/portrait.png'),
        path: 'fighters/isaque-ferreira/portrait.png',
      },
      {
        type: 'spritesheet',
        key: 'isaque-ferreira-sheet',
        path: 'fighters/isaque-ferreira/sprite.png',
        frameWidth: 192,
        frameHeight: 224,
      },
      {
        type: 'image',
        key: portraitTextureKey('fighters/fighter-a/portrait.png'),
        path: 'fighters/fighter-a/portrait.png',
      },
      {
        type: 'spritesheet',
        key: 'fighter-a-demo-sheet',
        path: 'fighters/fighter-a/sprite.png',
        frameWidth: 96,
        frameHeight: 112,
      },
    ]);
  });

  it('never loads the same texture twice', () => {
    const clone = { ...fighterA, id: 'clone' };
    expect(collectFighterAssets([fighterA, clone, fighterA])).toHaveLength(2);
  });

  it('collects nothing for fighters without art', () => {
    expect(collectFighterAssets([fighterB])).toEqual([]);
  });

  it('lists pixel-art textures for nearest-neighbour filtering', () => {
    expect(pixelArtTextureKeys(ROSTER).sort()).toEqual(
      [
        'augusto-sheet',
        'filipe-sheet',
        'joao-guiotti-sheet',
        'romualdo-sheet',
        'isaque-ferreira-sheet',
        portraitTextureKey('fighters/isaque-ferreira/portrait.png'),
        portraitTextureKey('fighters/romualdo/portrait.png'),
        portraitTextureKey('fighters/joao-guiotti/portrait.png'),
        portraitTextureKey('fighters/filipe/portrait.png'),
        portraitTextureKey('fighters/augusto/portrait.png'),
        'fighter-a-demo-sheet',
        portraitTextureKey('fighters/fighter-a/portrait.png'),
        vfxTextureKey('vfx/24zap-emblem.png'),
        vfxTextureKey('vfx/mindhub-emblem.png'),
        vfxTextureKey('vfx/mindhub-sigil.png'),
        vfxTextureKey('vfx/vibecode-emblem.png'),
        vfxTextureKey('vfx/gptmaker-emblem.png'),
      ].sort(),
    );
  });
});
