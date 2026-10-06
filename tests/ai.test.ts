import { describe, expect, it } from 'vitest';
import { AIController } from '../src/controllers/AIController';
import { NORMAL_AI } from '../src/controllers/aiProfiles';
import { createRng } from '../src/core/random';
import { createFightingSim, idle, placeAtDistance, press } from './helpers';

describe('AIController', () => {
  it('approaches a far-away opponent', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 500);
    const ai = new AIController(NORMAL_AI, createRng(1));
    const [player, cpu] = sim.fighters;
    const startDistance = cpu.position.x - player.position.x;
    for (let i = 0; i < 60; i++) {
      sim.step([idle(), ai.getInput({ self: cpu, opponent: player })]);
    }
    expect(cpu.position.x - player.position.x).toBeLessThan(startDistance);
  });

  it('eventually lands attacks on an idle opponent', () => {
    const sim = createFightingSim();
    const ai = new AIController(NORMAL_AI, createRng(7));
    const [player, cpu] = sim.fighters;
    for (let i = 0; i < 600; i++) {
      sim.step([idle(), ai.getInput({ self: cpu, opponent: player })]);
    }
    expect(player.health).toBeLessThan(player.maxHealth);
  });

  it('can block an incoming punch', () => {
    const sim = createFightingSim();
    // Never attacks on its own, always tries to block.
    const ai = new AIController({ ...NORMAL_AI, blockChance: 1, aggression: 0 }, createRng(3));
    placeAtDistance(sim, 80);
    const [player, cpu] = sim.fighters;
    let blocked = false;
    for (let i = 0; i < 20; i++) {
      const p1 = press({ punch: i === 0 });
      const events = sim.step([p1, ai.getInput({ self: cpu, opponent: player })]);
      if (events.some((e) => e.type === 'block')) blocked = true;
    }
    expect(blocked).toBe(true);
  });

  it('can jump in with an air kick (when its profile allows it)', () => {
    const sim = createFightingSim();
    const profile = { ...NORMAL_AI, jumpInChance: 1, jumpInAttackChance: 1 };
    const ai = new AIController(profile, createRng(5));
    placeAtDistance(sim, 260);
    const [player, cpu] = sim.fighters;
    let airKicked = false;
    for (let i = 0; i < 120; i++) {
      sim.step([idle(), ai.getInput({ self: cpu, opponent: player })]);
      if (cpu.state === 'airKick') airKicked = true;
    }
    expect(airKicked).toBe(true);
  });
});
