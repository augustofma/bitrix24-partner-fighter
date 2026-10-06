import { describe, expect, it } from 'vitest';
import { totalAttackFrames } from '../src/core/fighter/attackFrames';
import { fighterA } from '../src/fighters/fighterA';
import { APEX_SPEED, jumpPhaseFor } from '../src/render/jumpPhase';
import { POSES, poseFor } from '../src/render/placeholder/poses';
import {
  attackFrameIndex,
  defaultAttackPhases,
  defaultJumpPhases,
  jumpFrameIndex,
  resolveAnimationState,
  spriteFrameFor,
  timedFrameIndex,
} from '../src/render/sprite/animationHelpers';
import { FIGHTER_STATES, type FighterAnimationSet } from '../src/types/fighter';
import { createFightingSim, press, stepFrames } from './helpers';

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

  const still = { x: 0, y: 0 };

  it('returns sheet frame numbers, not indices', () => {
    const fighter = {
      state: 'punch' as const,
      stateFrame: punch.startupFrames,
      activeAttack: punch,
      velocity: still,
    };
    expect(spriteFrameFor(set, fighter)).toBe(12);
  });

  it('uses the fallback animation for states without art', () => {
    const fighter = { state: 'block' as const, stateFrame: 0, activeAttack: null, velocity: still };
    expect(spriteFrameFor(set, fighter)).toBe(0);
  });
});

describe('jump visuals follow the vertical velocity', () => {
  const JUMP = { frames: [8, 9, 31] }; // rise, apex, fall

  it('jumpPhaseFor: negative vy rises, positive falls, near zero is the apex', () => {
    expect(jumpPhaseFor(-APEX_SPEED - 0.1)).toBe('rise');
    expect(jumpPhaseFor(-APEX_SPEED)).toBe('apex');
    expect(jumpPhaseFor(0)).toBe('apex');
    expect(jumpPhaseFor(APEX_SPEED)).toBe('apex');
    expect(jumpPhaseFor(APEX_SPEED + 0.1)).toBe('fall');
  });

  it('default split of the jump frames', () => {
    expect(defaultJumpPhases(1)).toEqual({ rise: 1, apex: 0, fall: 0 });
    expect(defaultJumpPhases(2)).toEqual({ rise: 1, apex: 0, fall: 1 });
    expect(defaultJumpPhases(3)).toEqual({ rise: 1, apex: 1, fall: 1 });
    expect(defaultJumpPhases(5)).toEqual({ rise: 2, apex: 1, fall: 2 });
  });

  it('picks the frame from velocity, regardless of time spent in the state', () => {
    for (const stateFrame of [0, 7, 40]) {
      expect(jumpFrameIndex(JUMP, -12, stateFrame)).toBe(0);
      expect(jumpFrameIndex(JUMP, 0.5, stateFrame)).toBe(1);
      expect(jumpFrameIndex(JUMP, 12, stateFrame)).toBe(2);
    }
  });

  it('a phase without frames borrows the closest one', () => {
    const twoFrames = { frames: [8, 31] }; // rise, fall
    expect(jumpFrameIndex(twoFrames, 0, 0)).toBe(0); // apex -> rise
    const custom = { frames: [1, 2, 3], jumpPhases: { rise: 0, apex: 1, fall: 2 } };
    expect(jumpFrameIndex(custom, -12, 0)).toBe(0); // rise -> apex frame
    expect(jumpFrameIndex(custom, 12, 0)).toBe(1); // first fall frame...
    expect(jumpFrameIndex(custom, 12, 6)).toBe(2); // ...cycling at frameRate
  });

  it('spriteFrameFor: a jump that just resumed (stateFrame 0) while falling shows the fall frame', () => {
    const set: FighterAnimationSet = { idle: { frames: [0] }, jump: JUMP };
    const resumed = { state: 'jump' as const, stateFrame: 0, activeAttack: null };
    expect(spriteFrameFor(set, { ...resumed, velocity: { x: 4, y: 6 } })).toBe(31);
    expect(spriteFrameFor(set, { ...resumed, velocity: { x: 4, y: -6 } })).toBe(8);
  });

  it('in a real fight: after an air kick ends mid-air on the way down, sprite and placeholder show the fall', () => {
    const sim = createFightingSim();
    const [player] = sim.fighters;
    const sprite = fighterA.assets.sprite;
    if (!sprite) throw new Error('FIGHTER_A must have demo sprite assets');
    stepFrames(sim, 1, press({ up: true }));
    stepFrames(sim, 1, press({ kick: true }));
    expect(player.state).toBe('airKick');
    while (player.state === 'airKick') stepFrames(sim, 1);

    expect(player.state).toBe('jump');
    expect(player.isAirborne).toBe(true);
    expect(player.stateFrame).toBe(0);
    expect(player.velocity.y).toBeGreaterThan(APEX_SPEED);
    expect(spriteFrameFor(sprite.animations, player)).toBe(31);
    expect(poseFor(player, 0)).toBe(POSES.jumpFall);
  });

  it('placeholder jump poses for rise and apex', () => {
    const sim = createFightingSim();
    const [player] = sim.fighters;
    stepFrames(sim, 1, press({ up: true }));
    expect(poseFor(player, 0)).toBe(POSES.jumpRise);
    while (player.velocity.y < -APEX_SPEED) stepFrames(sim, 1);
    expect(poseFor(player, 0)).toBe(POSES.jump);
  });
});
