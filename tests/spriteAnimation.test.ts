import { describe, expect, it } from 'vitest';
import { totalAttackFrames } from '../src/core/fighter/attackFrames';
import { fighterA } from '../src/fighters/fighterA';
import {
  attackFrameIndex,
  defaultAttackPhases,
  resolveAnimationState,
  spriteFrameFor,
  timedFrameIndex,
} from '../src/render/sprite/animationHelpers';
import { FIGHTER_STATES, type FighterAnimationSet } from '../src/types/fighter';

const punch = fighterA.attacks.punch; // startup 5, active 3, recovery 9
const IDLE_ONLY: FighterAnimationSet = { idle: { frames: [0, 1] } };

describe('resolveAnimationState (state -> animation fallback)', () => {
  it('uses the state itself when it has an animation', () => {
    const set: FighterAnimationSet = { idle: { frames: [0] }, kick: { frames: [5] } };
    expect(resolveAnimationState(set, 'kick')).toBe('kick');
  });

  it('falls back along the chain and always ends at idle', () => {
    const set: FighterAnimationSet = {
      idle: { frames: [0] },
      punch: { frames: [3] },
      hurt: { frames: [4] },
    };
    expect(resolveAnimationState(set, 'kick')).toBe('punch');
    expect(resolveAnimationState(set, 'knockout')).toBe('hurt');
    for (const state of FIGHTER_STATES) {
      expect(resolveAnimationState(IDLE_ONLY, state)).toBe('idle');
    }
  });
});

describe('timedFrameIndex', () => {
  it('loops idle by default (10 fps = a new frame every 6 simulation frames)', () => {
    const anim = { frames: [10, 11, 12] };
    expect([0, 5, 6, 12, 18].map((f) => timedFrameIndex(anim, 'idle', f))).toEqual([0, 0, 1, 2, 0]);
  });

  it('plays once and holds the last frame for non-looping states', () => {
    const anim = { frames: [1, 2], frameRate: 60 };
    expect([0, 1, 2, 50].map((f) => timedFrameIndex(anim, 'knockout', f))).toEqual([0, 1, 1, 1]);
  });

  it('respects an explicit repeat', () => {
    const anim = { frames: [1, 2], frameRate: 60, repeat: -1 };
    expect(timedFrameIndex(anim, 'victory', 3)).toBe(1);
    expect(timedFrameIndex(anim, 'victory', 4)).toBe(0);
  });
});

describe('attackFrameIndex (driven by real frame data)', () => {
  it('default split: middle frame is the impact frame', () => {
    expect(defaultAttackPhases(3)).toEqual({ startup: 1, active: 1, recovery: 1 });
    expect(defaultAttackPhases(1)).toEqual({ startup: 0, active: 1, recovery: 0 });
    expect(defaultAttackPhases(5)).toEqual({ startup: 2, active: 1, recovery: 2 });
  });

  it('shows the impact frame exactly during the active frames', () => {
    const anim = { frames: [11, 12, 13] };
    const phaseOf = (frame: number) => attackFrameIndex(anim, punch, frame);
    expect(phaseOf(0)).toBe(0);
    expect(phaseOf(punch.startupFrames - 1)).toBe(0);
    expect(phaseOf(punch.startupFrames)).toBe(1);
    expect(phaseOf(punch.startupFrames + punch.activeFrames - 1)).toBe(1);
    expect(phaseOf(punch.startupFrames + punch.activeFrames)).toBe(2);
    expect(phaseOf(totalAttackFrames(punch) - 1)).toBe(2);
  });

  it('spreads several frames across a phase and honours explicit attackPhases', () => {
    const anim = { frames: [0, 1, 2, 3, 4], attackPhases: { startup: 2, active: 1, recovery: 2 } };
    expect(attackFrameIndex(anim, punch, 0)).toBe(0);
    expect(attackFrameIndex(anim, punch, 3)).toBe(1);
    expect(attackFrameIndex(anim, punch, 5)).toBe(2);
    expect(attackFrameIndex(anim, punch, 8)).toBe(3);
    expect(attackFrameIndex(anim, punch, 16)).toBe(4);
  });

  it('a single-frame attack animation always shows that frame', () => {
    const anim = { frames: [7] };
    for (let f = 0; f < totalAttackFrames(punch); f++) {
      expect(attackFrameIndex(anim, punch, f)).toBe(0);
    }
  });
});

describe('spriteFrameFor', () => {
  const set: FighterAnimationSet = {
    idle: { frames: [0, 1] },
    punch: { frames: [11, 12, 13] },
  };

  it('returns sheet frame numbers, not indices', () => {
    const fighter = {
      state: 'punch' as const,
      stateFrame: punch.startupFrames,
      activeAttack: punch,
    };
    expect(spriteFrameFor(set, fighter)).toBe(12);
  });

  it('uses the fallback animation for states without art', () => {
    expect(spriteFrameFor(set, { state: 'block', stateFrame: 0, activeAttack: null })).toBe(0);
  });
});
