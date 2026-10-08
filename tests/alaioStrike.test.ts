import { describe, expect, it } from 'vitest';
import { AIController } from '../src/controllers/AIController';
import { aiProfileFor } from '../src/controllers/aiProfiles';
import { createRng } from '../src/core/random';
import { augusto } from '../src/fighters/augusto';
import { AI_DIFFICULTIES } from '../src/types/match';
import { MAX_FIGHTER_SEPARATION } from '../src/config/simulation';
import { FightSimulation, type SimulationEvent } from '../src/core/FightSimulation';
import { toWorldRect } from '../src/core/geometry';
import { dmitry } from '../src/fighters/dmitry';
import { fighterB } from '../src/fighters/fighterB';
import { partnerArena } from '../src/stages/partnerArena';
import type { InputState } from '../src/types/input';
import { FAST_TIMING, idle, placeAtDistance, press, stepFrames } from './helpers';

const strike = dmitry.specials[0]!;
const arena = partnerArena;

function setup(distance: number): FightSimulation {
  const sim = new FightSimulation({
    fighters: [dmitry, fighterB],
    stage: arena,
    roundTiming: FAST_TIMING,
  });
  stepFrames(sim, 1);
  placeAtDistance(sim, distance);
  sim.fighters[0].changeSpecialMeter(100);
  return sim;
}

/** Dmitry presses F on frame 0; the rival plays `p2(frame)`. */
function run(sim: FightSimulation, p2: (f: number) => InputState = idle, frames = 90) {
  const events: SimulationEvent[] = [];
  for (let f = 0; f < frames; f++) events.push(...sim.step([press({ special: f === 0 }), p2(f)]));
  return events;
}

const hits = (events: SimulationEvent[]) => events.filter((e) => e.type === 'hit').length;
const blocks = (events: SimulationEvent[]) => events.filter((e) => e.type === 'block').length;

describe('Dmitry: ALAIO STRIKE! configuration', () => {
  it('is a ground-only, mid, boss-sized special with its own storm effect', () => {
    expect(strike).toMatchObject({
      id: 'dmitry.alaioStrike',
      displayName: 'ALAIO STRIKE!',
      state: 'special',
      level: 'mid',
      meterCost: 50,
      groundOnly: true,
      advanceSpeed: 0,
      damage: 24,
      chipDamage: 4,
    });
    expect(dmitry.assets.specialEffects?.[strike.id]).toEqual({
      style: 'skyLightning',
      label: 'ALAIO STRIKE!',
      sound: 'special-alaio-strike',
    });
    // Very punishable when guarded.
    expect(strike.recoveryFrames).toBeGreaterThan(strike.blockstunFrames + 10);
  });

  it('covers the whole arena, floor to sky, from any position and either facing', () => {
    for (let x = arena.wallMargin; x <= arena.width - arena.wallMargin; x += 40) {
      for (const direction of [1, -1] as const) {
        const box = toWorldRect(strike.hitbox, { x, y: arena.groundY }, direction);
        expect(box.x).toBeLessThanOrEqual(0);
        expect(box.x + box.width).toBeGreaterThanOrEqual(arena.width);
        expect(box.y).toBeLessThanOrEqual(arena.groundY - 600);
        expect(box.y + box.height).toBeGreaterThanOrEqual(arena.groundY);
      }
    }
  });
});

describe('Dmitry: ALAIO STRIKE! execution', () => {
  it.each([60, 300, MAX_FIGHTER_SEPARATION])(
    'hits a rival who does not guard at %i px: once, 24 damage',
    (distance) => {
      const sim = setup(distance);
      const [, b] = sim.fighters;
      const events = run(sim);
      expect(hits(events)).toBe(1);
      expect(b.health).toBe(b.maxHealth - strike.damage);
    },
  );

  it('walking away does not save the rival', () => {
    const sim = setup(500);
    const [, b] = sim.fighters;
    const events = run(sim, () => press({ right: true }));
    expect(hits(events)).toBe(1);
    expect(b.health).toBe(b.maxHealth - strike.damage);
  });

  it('jumping does not save the rival either (no guard in the air)', () => {
    const sim = setup(400);
    const [, b] = sim.fighters;
    // Jump so the lightning falls while airborne.
    const jumpAt = strike.startupFrames - 8;
    const events = run(sim, (f) => press({ up: f === jumpAt }));
    expect(hits(events)).toBe(1);
    expect(b.health).toBe(b.maxHealth - strike.damage);
  });

  it.each([
    ['standing', { block: true }],
    ['crouching', { block: true, down: true }],
  ])('a %s guard is the only way out: blocked, only the chip damage', (_label, guard) => {
    const sim = setup(500);
    const [, b] = sim.fighters;
    const events = run(sim, () => press(guard));
    expect(hits(events)).toBe(0);
    expect(blocks(events)).toBe(1);
    expect(b.health).toBe(b.maxHealth - strike.chipDamage);
  });

  it('cannot be started in the air', () => {
    const sim = setup(300);
    const [a] = sim.fighters;
    stepFrames(sim, 4, press({ up: true }));
    const events: SimulationEvent[] = [];
    for (let f = 0; f < 60; f++) events.push(...sim.step([press({ special: true }), idle()]));
    expect(hits(events)).toBe(0);
    expect(a.specialMeter).toBe(100);
  });
});

describe('Dmitry: ALAIO STRIKE! in CPU hands', () => {
  it.each(AI_DIFFICULTIES)('the boss uses it in a CPU match (%s)', (difficulty) => {
    const sim = new FightSimulation({
      fighters: [augusto, dmitry],
      stage: arena,
      roundTiming: FAST_TIMING,
    });
    const ais = [
      new AIController(aiProfileFor(difficulty), createRng(41)),
      new AIController(aiProfileFor(difficulty), createRng(91)),
    ];
    let strikes = 0;
    for (let frame = 0; frame < 28000 && !sim.match.isOver; frame++) {
      const [a, b] = sim.fighters;
      const events = sim.step([
        ais[0]!.getInput({ self: a, opponent: b }),
        ais[1]!.getInput({ self: b, opponent: a }),
      ]);
      if (events.some((e) => e.type === 'roundStart')) ais.forEach((ai) => ai.reset());
      strikes += events.filter((e) => e.type === 'specialStart' && e.fighterIndex === 1).length;
    }
    expect(strikes).toBeGreaterThan(0);
  });
});
