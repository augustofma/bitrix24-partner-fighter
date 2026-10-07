import type { MatchRules } from '../src/core/systems/MatchSystem';
import { describe, expect, it } from 'vitest';
import { SPECIAL_METER } from '../src/config/special';
import { totalAttackFrames } from '../src/core/fighter/attackFrames';
import { FightSimulation, type SimulationEvent } from '../src/core/FightSimulation';
import { fighterB } from '../src/fighters/fighterB';
import { filipe } from '../src/fighters/filipe';
import { partnerArena } from '../src/stages/partnerArena';
import type { InputState } from '../src/types/input';
import { FAST_TIMING, idle, placeAtDistance, press, stepFrames, SINGLE_ROUND } from './helpers';

const agent = filipe.specials[0]!;

function setup(distance = 150, matchRules?: MatchRules): FightSimulation {
  const sim = new FightSimulation({
    ...(matchRules ? { matchRules } : {}),
    fighters: [filipe, fighterB],
    stage: partnerArena,
    roundTiming: FAST_TIMING,
  });
  stepFrames(sim, 1);
  placeAtDistance(sim, distance);
  return sim;
}

function run(sim: FightSimulation, frames: number, p1: (f: number) => InputState, p2 = idle) {
  const events: SimulationEvent[] = [];
  const states: string[] = [];
  for (let f = 0; f < frames; f++) {
    events.push(...sim.step([p1(f), p2()]));
    states.push(sim.fighters[0].state);
  }
  return { events, states };
}

const specialStarts = (states: readonly string[]) =>
  states.filter((s, i) => s === 'special' && states[i - 1] !== 'special').length;

describe('Filipe: MINDHUB AGENT configuration', () => {
  it('is a generic, ground-only special with the documented frame data', () => {
    expect(agent).toMatchObject({
      id: 'filipe.mindhubAgent',
      state: 'special',
      level: 'mid',
      meterCost: 35,
      groundOnly: true,
      damage: 18,
      chipDamage: 2,
      startupFrames: 15,
      activeFrames: 6,
      recoveryFrames: 24,
      hitstunFrames: 24,
      blockstunFrames: 16,
      hitstopFrames: 12,
    });
    expect(filipe.assets.specialEffects?.[agent.id]?.style).toBe('mindNetwork');
  });

  it('reaches much further than his normals, but nowhere near the whole screen', () => {
    const reach = agent.hitbox.x + agent.hitbox.width;
    const normalReaches = Object.values(filipe.attacks).map((a) => a.hitbox.x + a.hitbox.width);
    expect(reach).toBeGreaterThan(Math.max(...normalReaches) * 1.4);
    expect(reach).toBeLessThan(partnerArena.width / 4);
  });
});

describe('Filipe: MINDHUB AGENT execution', () => {
  it('does nothing without enough meter (34) and keeps the meter', () => {
    const sim = setup();
    const [a] = sim.fighters;
    a.changeSpecialMeter(34);
    const { states } = run(sim, 40, (f) => press({ special: f === 0 }));
    expect(specialStarts(states)).toBe(0);
    expect(a.specialMeter).toBe(34);
  });

  it('spends exactly 35 on startup and never repeats while F is held', () => {
    const sim = setup();
    const [a] = sim.fighters;
    a.changeSpecialMeter(100);
    const { states } = run(sim, 120, () => press({ special: true }));
    expect(specialStarts(states)).toBe(1);
    expect(a.specialMeter).toBe(100 - 35);
  });

  it('hits once at a range the normals cannot reach: 18 damage, hitstop, +5 for the defender only', () => {
    const sim = setup(180); // beyond the kick (110 + 28 = 138), inside the agent (170 + 28)
    const [a, b] = sim.fighters;
    a.changeSpecialMeter(35);
    const { events } = run(sim, 80, (f) => press({ special: f === 0 }));
    expect(events.filter((e) => e.type === 'hit')).toHaveLength(1);
    expect(b.health).toBe(b.maxHealth - 18);
    expect(a.specialMeter).toBe(0);
    expect(b.specialMeter).toBe(SPECIAL_METER.received);

    const kickOnly = setup(180);
    const kick = run(kickOnly, 40, (f) => press({ kick: f === 0 }));
    expect(kick.events.some((e) => e.type === 'hit')).toBe(false);
  });

  it('freezes the fight for its hitstop on contact', () => {
    const sim = setup();
    sim.fighters[0].changeSpecialMeter(35);
    run(sim, agent.startupFrames + 1, (f) => press({ special: f === 0 }));
    expect(sim.isInHitstop).toBe(true);
  });

  it('whiffs at long range', () => {
    const sim = setup(260);
    const [a, b] = sim.fighters;
    a.changeSpecialMeter(35);
    run(sim, 80, (f) => press({ special: f === 0 }));
    expect(b.health).toBe(b.maxHealth);
    expect(a.specialMeter).toBe(0); // paid on startup even on a whiff
  });

  it.each([
    ['standing', { block: true }],
    ['crouching', { block: true, down: true }],
  ])('is blocked by a %s guard (mid): chip 2, no meter for either side', (_label, guard) => {
    const sim = setup();
    const [a, b] = sim.fighters;
    a.changeSpecialMeter(35);
    const { events } = run(
      sim,
      80,
      (f) => press({ special: f === 0 }),
      () => press(guard),
    );
    expect(events.filter((e) => e.type === 'block')).toHaveLength(1);
    expect(b.health).toBe(b.maxHealth - 2);
    expect([a.specialMeter, b.specialMeter]).toEqual([0, 0]);
  });

  it('can KO', () => {
    const sim = setup(150, SINGLE_ROUND);
    const [a, b] = sim.fighters;
    a.changeSpecialMeter(35);
    b.health = 10;
    const { events } = run(sim, 120, (f) => press({ special: f === 0 }));
    expect(events.some((e) => e.type === 'koHit')).toBe(true);
    expect(b.isKnockedOut).toBe(true);
  });

  it('cannot start in the air, during another attack, in hitstun or in blockstun', () => {
    // Air (ground-only).
    const air = setup();
    air.fighters[0].changeSpecialMeter(35);
    const jump = run(air, 40, (f) => press({ up: f === 0, special: f === 4 }));
    expect(specialStarts(jump.states)).toBe(0);
    expect(air.fighters[0].specialMeter).toBe(35);

    // During a punch (pressed early, so the buffer expires before the punch ends).
    const busy = setup();
    busy.fighters[0].changeSpecialMeter(35);
    const punch = run(busy, 40, (f) => press({ punch: f === 0, special: f === 2 }));
    expect(punch.states.slice(0, totalAttackFrames(filipe.attacks.punch))).not.toContain('special');
    expect(specialStarts(punch.states)).toBe(0);

    // In hitstun.
    const hurt = setup();
    const [a] = hurt.fighters;
    a.changeSpecialMeter(35);
    a.applyHit(fighterB.attacks.kick, -1);
    const stunned = run(hurt, 8, () => press({ special: true }));
    expect(stunned.states.every((s) => s === 'hurt')).toBe(true);

    // In blockstun: F pressed right after blocking does nothing while the guard is stunned
    // (and the press expires from the buffer before the guard is free).
    const guard = setup(80);
    guard.fighters[0].changeSpecialMeter(35);
    let blockedAt = -1;
    const blocking: string[] = [];
    for (let f = 0; f < 50; f++) {
      const p1 = press({ block: true, special: blockedAt >= 0 && f === blockedAt + 1 });
      const events = guard.step([p1, press({ kick: f === 0 })]);
      if (blockedAt < 0 && events.some((e) => e.type === 'block')) blockedAt = f;
      blocking.push(guard.fighters[0].state);
    }
    expect(blockedAt).toBeGreaterThan(0);
    expect(blocking).not.toContain('special');
    expect(guard.fighters[0].specialMeter).toBe(35);
  });
});
