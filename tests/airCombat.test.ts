import { describe, expect, it } from 'vitest';
import { GRAVITY } from '../src/config/simulation';
import type { FightSimulation, SimulationEvent } from '../src/core/FightSimulation';
import { fighterA } from '../src/fighters/fighterA';
import type { InputState } from '../src/types/input';
import { createFightingSim, idle, placeAtDistance, press, stepFrames } from './helpers';

const heightOf = (sim: FightSimulation, index: 0 | 1 = 0) =>
  sim.stage.groundY - sim.fighters[index].position.y;

/** Steps until `done` is true (or a safety limit), collecting events. */
function stepUntil(
  sim: FightSimulation,
  done: () => boolean,
  p1: () => InputState = idle,
  limit = 200,
): SimulationEvent[] {
  const events: SimulationEvent[] = [];
  for (let i = 0; i < limit && !done(); i++) events.push(...sim.step([p1(), idle()]));
  return events;
}

/** Neutral or directional jump: one frame of `up`, then airborne. */
function jump(sim: FightSimulation, direction: Partial<InputState> = {}): void {
  stepFrames(sim, 1, press({ up: true, ...direction }));
  expect(sim.fighters[0].isAirborne).toBe(true);
}

describe('air attacks', () => {
  it('↑ then A starts airPunch in the air (ascending)', () => {
    const sim = createFightingSim();
    const [player] = sim.fighters;
    jump(sim);
    stepFrames(sim, 2);
    expect(player.velocity.y).toBeLessThan(0);
    stepFrames(sim, 1, press({ punch: true }));
    expect(player.state).toBe('airPunch');
    expect(player.activeAttack).toBe(fighterA.attacks.airPunch);
    expect(player.isAirborne).toBe(true);
  });

  it('↑ then S starts airKick in the air (descending)', () => {
    const sim = createFightingSim();
    const [player] = sim.fighters;
    jump(sim);
    stepUntil(sim, () => player.velocity.y > 0);
    stepFrames(sim, 1, press({ kick: true }));
    expect(player.state).toBe('airKick');
    expect(player.activeAttack).toBe(fighterA.attacks.airKick);
  });

  it('ground punch and kick are unchanged', () => {
    const sim = createFightingSim();
    stepFrames(sim, 1, press({ punch: true }));
    expect(sim.fighters[0].state).toBe('punch');
    stepFrames(sim, 30);
    stepFrames(sim, 1, press({ kick: true }));
    expect(sim.fighters[0].state).toBe('kick');
    expect(sim.fighters[0].isAirborne).toBe(false);
  });

  it('gravity keeps acting during an air attack', () => {
    const sim = createFightingSim();
    const [player] = sim.fighters;
    jump(sim);
    stepFrames(sim, 1, press({ punch: true }));
    const vy = player.velocity.y;
    stepFrames(sim, 5);
    expect(player.state).toBe('airPunch');
    expect(player.velocity.y).toBeCloseTo(vy + 5 * GRAVITY, 5);
  });

  it('horizontal jump momentum keeps acting during an air attack (→ + ↑ + S)', () => {
    const sim = createFightingSim();
    const [player] = sim.fighters;
    jump(sim, { right: true });
    const vx = player.velocity.x;
    expect(vx).toBe(fighterA.stats.jumpHorizontalSpeed);
    stepFrames(sim, 1, press({ kick: true }));
    const x = player.position.x;
    stepFrames(sim, 4);
    expect(player.state).toBe('airKick');
    expect(player.velocity.x).toBe(vx);
    expect(player.position.x).toBeCloseTo(x + 4 * vx, 5);
  });

  it('landing ends the air attack and removes its hitbox', () => {
    const sim = createFightingSim();
    const [player] = sim.fighters;
    jump(sim);
    // Late air kick: its active frames would continue past the landing.
    stepUntil(sim, () => player.velocity.y > 0 && heightOf(sim) < 40);
    stepFrames(sim, 1, press({ kick: true }));
    expect(player.state).toBe('airKick');
    stepUntil(sim, () => !player.isAirborne);
    expect(player.state).toBe('idle');
    expect(player.activeAttack).toBeNull();
    expect(player.getHitbox()).toBeNull();
    // ...and it never comes back on the following frames.
    for (let i = 0; i < 10; i++) {
      stepFrames(sim, 1);
      expect(player.getHitbox()).toBeNull();
    }
  });

  it('an air attack that ends in the air returns to the jump state', () => {
    const sim = createFightingSim();
    const [player] = sim.fighters;
    jump(sim);
    stepFrames(sim, 1, press({ punch: true }));
    stepUntil(sim, () => player.state !== 'airPunch');
    expect(player.isAirborne).toBe(true);
    expect(player.state).toBe('jump');
  });

  it('holding or mashing A gives a single air attack per jump', () => {
    const sim = createFightingSim();
    const [player] = sim.fighters;
    jump(sim);
    let starts = 0;
    let previous = player.state;
    let frame = 0;
    stepUntil(
      sim,
      () => {
        if (player.state === 'airPunch' && previous !== 'airPunch') starts++;
        previous = player.state;
        return !player.isAirborne;
      },
      // Alternate pressed / released every frame: a new press edge each other frame.
      () => press({ punch: frame++ % 2 === 0 }),
    );
    expect(starts).toBe(1);
  });

  it('air attacks hit, deal damage and connect only once', () => {
    // The slower air kick must be thrown higher to become active before landing.
    const throwBelowHeight = { punch: 110, kick: 150 } as const;
    for (const button of ['punch', 'kick'] as const) {
      const sim = createFightingSim();
      placeAtDistance(sim, 60);
      const [player, cpu] = sim.fighters;
      jump(sim);
      stepUntil(sim, () => player.velocity.y > 0 && heightOf(sim) < throwBelowHeight[button]);
      const events = [
        ...stepFrames(sim, 1, press({ [button]: true })),
        ...stepUntil(sim, () => !player.isAirborne),
      ];
      const slot = button === 'punch' ? 'airPunch' : 'airKick';
      const hits = events.filter((e) => e.type === 'hit');
      expect(hits, slot).toHaveLength(1);
      expect(cpu.health).toBe(cpu.maxHealth - fighterA.attacks[slot].damage);
    }
  });
});
