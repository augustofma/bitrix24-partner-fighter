import { describe, expect, it } from 'vitest';
import { FightSimulation, type SimulationEvent } from '../src/core/FightSimulation';
import { specialForPress } from '../src/core/fighter/specialMoves';
import { augusto } from '../src/fighters/augusto';
import { fighterB } from '../src/fighters/fighterB';
import { filipe } from '../src/fighters/filipe';
import { romulo } from '../src/fighters/romulo';
import { partnerArena } from '../src/stages/partnerArena';
import { FAST_TIMING, idle, placeAtDistance, press, stepFrames } from './helpers';

const [zap, mindhub] = romulo.specials;

function setup(): FightSimulation {
  const sim = new FightSimulation({
    fighters: [romulo, fighterB],
    stage: partnerArena,
    roundTiming: FAST_TIMING,
  });
  stepFrames(sim, 1);
  placeAtDistance(sim, 140);
  return sim;
}

/** Presses F once with full meter and returns the special that started. */
function pressSpecial(sim: FightSimulation): string | undefined {
  const [a] = sim.fighters;
  a.changeSpecialMeter(100);
  const events: SimulationEvent[] = [];
  let started: string | undefined;
  for (let f = 0; f < 120; f++) {
    events.push(...sim.step([press({ special: f === 0 }), idle()]));
    if (!started && a.state === 'special') started = a.activeAttack?.id;
  }
  return started;
}

describe('Rômulo: 24ZAP and MINDHUB AGENT, one at a time', () => {
  it('has both house specials, with the originals’ data and look', () => {
    expect(zap).toEqual({ ...augusto.specials[0], id: 'romulo.24zap' });
    expect(mindhub).toEqual({ ...filipe.specials[0], id: 'romulo.mindhubAgent' });
    expect(romulo.assets.specialEffects?.['romulo.24zap']).toEqual(
      augusto.assets.specialEffects?.['augusto.24zap'],
    );
    expect(romulo.assets.specialEffects?.['romulo.mindhubAgent']).toEqual(
      filipe.assets.specialEffects?.['filipe.mindhubAgent'],
    );
  });

  it('each press starts the other one: 24ZAP, MINDHUB, 24ZAP, MINDHUB', () => {
    const sim = setup();
    const order = [1, 2, 3, 4].map(() => pressSpecial(sim));
    expect(order).toEqual([
      'romulo.24zap',
      'romulo.mindhubAgent',
      'romulo.24zap',
      'romulo.mindhubAgent',
    ]);
  });

  it('pays the cost of the move that comes out (30 for 24ZAP, 35 for MINDHUB)', () => {
    const sim = setup();
    const [a] = sim.fighters;
    a.changeSpecialMeter(65);
    stepFrames(sim, 1, press({ special: true }));
    expect(a.specialMeter).toBe(65 - zap!.meterCost);
    stepFrames(sim, 120);
    stepFrames(sim, 1, press({ special: true }));
    expect(a.specialMeter).toBe(65 - zap!.meterCost - mindhub!.meterCost);
  });

  it('when the turn’s move cannot be paid, the other one goes (never a dead press)', () => {
    // MINDHUB's turn (turn 1) with 30-34 meter: only 24ZAP is affordable.
    expect(specialForPress(romulo, 32, false, 1)?.id).toBe('romulo.24zap');
    expect(specialForPress(romulo, 35, false, 1)?.id).toBe('romulo.mindhubAgent');
    expect(specialForPress(romulo, 29, false, 0)).toBeUndefined();
    // Single-special fighters are unaffected by the turn.
    for (const turn of [0, 1, 2, 7]) {
      expect(specialForPress(augusto, 100, false, turn)).toBe(augusto.specials[0]);
    }
  });
});

describe('Rômulo in CPU hands', () => {
  it('the CPU uses both specials, alternating', async () => {
    const { AIController } = await import('../src/controllers/AIController');
    const { aiProfileFor } = await import('../src/controllers/aiProfiles');
    const { createRng } = await import('../src/core/random');
    const sim = new FightSimulation({
      fighters: [augusto, romulo],
      stage: partnerArena,
      roundTiming: FAST_TIMING,
    });
    const ais = [
      new AIController(aiProfileFor('hard'), createRng(41)),
      new AIController(aiProfileFor('hard'), createRng(91)),
    ];
    const used: string[] = [];
    let previous = '';
    for (let frame = 0; frame < 28000 && !sim.match.isOver; frame++) {
      const [a, b] = sim.fighters;
      const events = sim.step([
        ais[0]!.getInput({ self: a, opponent: b }),
        ais[1]!.getInput({ self: b, opponent: a }),
      ]);
      if (events.some((e) => e.type === 'roundStart')) ais.forEach((ai) => ai.reset());
      const id = b.state === 'special' ? (b.activeAttack?.id ?? '') : '';
      if (id && id !== previous) used.push(id);
      previous = id;
    }
    expect(new Set(used)).toEqual(new Set(['romulo.24zap', 'romulo.mindhubAgent']));
  });
});
