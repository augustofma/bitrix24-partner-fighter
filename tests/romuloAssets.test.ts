import { selectSpriteAssets, validateSpriteAssets } from '../src/render/sprite/spriteValidation';
import { describe, expect, it } from 'vitest';
import { romulo } from '../src/fighters/romulo';
import { ROSTER } from '../src/fighters/roster';
import { hasStoryCampaign } from '../src/story/storyProfiles';
import {
  attackFrameIndex,
  jumpFrameIndex,
  timedFrameIndex,
} from '../src/render/sprite/animationHelpers';
import type { FighterStateId } from '../src/types/fighter';
import { readRgbaPng } from './png';

describe('Romulo PNG assets', () => {
  it('keeps one roster entry, his own portrait, quick-fight eligibility', () => {
    expect(ROSTER.filter((f) => f.id === 'romulo')).toEqual([romulo]);
    expect(romulo.assets.portrait).toBe('fighters/romulo/portrait.png');
    expect(romulo.playable).toBe(true);
    // No story profile is invented for the new fighter.
    expect(hasStoryCampaign(romulo.id)).toBe(false);
  });
  it('uses the real sheet with all animation frames inside its 40 cells', () => {
    expect(validateSpriteAssets(romulo, 40)).toEqual([]);
    expect(selectSpriteAssets(romulo, 40)).toBe(romulo.assets.sprite);
    const frames = Object.values(romulo.assets.sprite!.animations).flatMap((a) => a.frames);
    expect(new Set(frames).size).toBe(40);
    expect(Math.min(...frames)).toBe(0);
    expect(Math.max(...frames)).toBe(39);
  });
  it('has a genuine transparent portrait at 240x300', () => {
    const image = readRgbaPng(`public/${romulo.assets.portrait}`);
    expect([image.width, image.height]).toEqual([240, 300]);
    expect(image.alpha(0, 0)).toBe(0);
    expect(image.alpha(120, 150)).toBeGreaterThan(0);
  });
  it('contains exactly 40 nonempty, isolated RGBA cells with safe margins', () => {
    const sheet = romulo.assets.sprite!.sheet;
    const image = readRgbaPng(`public/${sheet.path}`);
    expect([image.width, image.height]).toEqual([1536, 1120]);
    expect([sheet.frameWidth, sheet.frameHeight]).toEqual([192, 224]);
    expect((image.width / sheet.frameWidth) * (image.height / sheet.frameHeight)).toBe(40);
    for (let frame = 0; frame < 40; frame++) {
      let opaque = 0,
        marginContent = 0,
        bottom = 0;
      for (let y = 0; y < 224; y++)
        for (let x = 0; x < 192; x++) {
          if (image.alpha((frame % 8) * 192 + x, Math.floor(frame / 8) * 224 + y) === 0) continue;
          opaque++;
          bottom = Math.max(bottom, y + 1);
          if (x < 4 || x >= 188 || y < 4 || y >= 220) marginContent++;
        }
      expect(opaque, `frame ${frame} content`).toBeGreaterThan(500);
      expect(marginContent, `frame ${frame} isolation`).toBe(0);
      const airborne = [10, 11, 12, 26, 27, 28, 29, 30, 31].includes(frame);
      if (airborne) expect(bottom).toBeLessThan(216);
      else expect(bottom, `frame ${frame} ground baseline`).toBe(216);
    }
  });
});

const animations = romulo.assets.sprite!.animations;
const FRAME_MAP: Partial<Record<FighterStateId, number[]>> = {
  idle: [0, 1, 2, 3],
  walk: [4, 5, 6, 7, 8, 9],
  jump: [10, 11, 12],
  crouch: [13],
  punch: [14, 15, 16],
  kick: [17, 18, 19],
  crouchPunch: [20, 21, 22],
  crouchKick: [23, 24, 25],
  airPunch: [26, 27, 28],
  airKick: [29, 30, 31],
  block: [32],
  crouchBlock: [33],
  hurt: [34, 35],
  knockout: [36, 37, 38],
  victory: [39],
};

describe('Romulo animation contract', () => {
  it.each(Object.entries(FRAME_MAP))('%s uses the approved pose order', (state, frames) => {
    expect(animations[state as FighterStateId]?.frames).toEqual(frames);
  });
  it('loops breathing/walking and holds the grounded KO and victory poses', () => {
    expect(
      [0, 10, 20, 30, 40].map(
        (f) => animations.idle.frames[timedFrameIndex(animations.idle, 'idle', f)],
      ),
    ).toEqual([0, 1, 2, 3, 0]);
    expect(
      [0, 6, 12, 18, 24, 30, 36].map(
        (f) => animations.walk!.frames[timedFrameIndex(animations.walk!, 'walk', f)],
      ),
    ).toEqual([4, 5, 6, 7, 8, 9, 4]);
    expect(
      animations.knockout!.frames[timedFrameIndex(animations.knockout!, 'knockout', 120)],
    ).toBe(38);
    expect(animations.victory!.frames[timedFrameIndex(animations.victory!, 'victory', 120)]).toBe(
      39,
    );
  });
  it('selects rise, apex and fall from velocity rather than animation time', () => {
    expect(animations.jump!.jumpPhases).toEqual({ rise: 1, apex: 1, fall: 1 });
    expect(
      [-12, 0, 12].map((y) => animations.jump!.frames[jumpFrameIndex(animations.jump!, y, 60)]),
    ).toEqual([10, 11, 12]);
  });
  it.each(Object.values(romulo.attacks))(
    '$state shows extension only during the actual active window',
    (attack) => {
      const animation = animations[attack.state]!;
      expect(animation.attackPhases).toEqual({ startup: 1, active: 1, recovery: 1 });
      for (
        let frame = 0;
        frame < attack.startupFrames + attack.activeFrames + attack.recoveryFrames;
        frame++
      ) {
        const phase =
          frame < attack.startupFrames
            ? 0
            : frame < attack.startupFrames + attack.activeFrames
              ? 1
              : 2;
        expect(attackFrameIndex(animation, attack, frame)).toBe(phase);
      }
    },
  );
});
