import { describe, expect, it } from 'vitest';
import { totalAttackFrames } from '../src/core/fighter/attackFrames';
import { fighterA } from '../src/fighters/fighterA';
import { createFightingSim, idle, press, stepFrames } from './helpers';

describe('Fighter movement and states', () => {
  it('walks right and left', () => {
    const sim = createFightingSim();
    const [player] = sim.fighters;
    const startX = player.position.x;
    stepFrames(sim, 10, press({ right: true }));
    expect(player.state).toBe('walk');
    expect(player.position.x).toBeGreaterThan(startX);

    const midX = player.position.x;
    stepFrames(sim, 10, press({ left: true }));
    expect(player.position.x).toBeLessThan(midX);
  });

  it('jumps, leaves the ground and lands back to idle', () => {
    const sim = createFightingSim();
    const [player] = sim.fighters;
    stepFrames(sim, 1, press({ up: true }));
    expect(player.state).toBe('jump');
    stepFrames(sim, 10);
    expect(player.isAirborne).toBe(true);
    stepFrames(sim, 60);
    expect(player.isAirborne).toBe(false);
    expect(player.state).toBe('idle');
  });

  it('crouches while down is held', () => {
    const sim = createFightingSim();
    const [player] = sim.fighters;
    stepFrames(sim, 3, press({ down: true }));
    expect(player.state).toBe('crouch');
    stepFrames(sim, 1, idle());
    expect(player.state).toBe('idle');
  });

  it('blocks while block is held', () => {
    const sim = createFightingSim();
    stepFrames(sim, 2, press({ block: true }));
    expect(sim.fighters[0].state).toBe('block');
  });

  it('runs a punch through startup, active and recovery, then returns to idle', () => {
    const sim = createFightingSim();
    const [player] = sim.fighters;
    stepFrames(sim, 1, press({ punch: true }));
    expect(player.state).toBe('punch');
    expect(player.attackPhase).toBe('startup');
    stepFrames(sim, fighterA.attacks.punch.startupFrames);
    expect(player.attackPhase).toBe('active');
    stepFrames(sim, totalAttackFrames(fighterA.attacks.punch));
    expect(player.state).toBe('idle');
  });

  it('kicks', () => {
    const sim = createFightingSim();
    stepFrames(sim, 1, press({ kick: true }));
    expect(sim.fighters[0].state).toBe('kick');
  });

  it('ignores input during the round intro', () => {
    const sim = createFightingSim({
      timeFrames: 600,
      introFrames: 30,
      victoryPoseDelayFrames: 5,
      outroFrames: 10,
    });
    const [player] = sim.fighters;
    const startX = player.position.x;
    stepFrames(sim, 10, press({ right: true }));
    expect(player.position.x).toBe(startX);
  });
});
