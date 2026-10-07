import { describe, expect, it } from 'vitest';
import { FightSimulation, type SimulationEvent } from '../src/core/FightSimulation';
import { RoundSystem } from '../src/core/systems/RoundSystem';
import { fighterA } from '../src/fighters/fighterA';
import { fighterB } from '../src/fighters/fighterB';
import { partnerArena } from '../src/stages/partnerArena';
import type { RoundResult } from '../src/types/match';
import type { RoundTiming } from '../src/core/systems/RoundSystem';
import { FAST_TIMING, idle, placeAtDistance, press, stepFrames } from './helpers';

/** A short clock so time-over rounds finish quickly in tests. */
const SHORT_CLOCK: RoundTiming = { ...FAST_TIMING, timeFrames: 240 };

function newSim(timing: RoundTiming = FAST_TIMING): FightSimulation {
  const sim = new FightSimulation({
    fighters: [fighterA, fighterB],
    stage: partnerArena,
    roundTiming: timing,
  });
  stepFrames(sim, 1); // past the 1-frame intro
  return sim;
}

const roundEnd = (events: readonly SimulationEvent[]): RoundResult | undefined => {
  for (const event of events)
    if (event.type === 'ko' || event.type === 'timeUp') return event.result;
  return undefined;
};

/** Side `attacker` lands punches until the other side is knocked out; returns the round result. */
function knockOut(sim: FightSimulation, attacker: 0 | 1): RoundResult {
  const defender = sim.fighters[attacker === 0 ? 1 : 0];
  (defender as unknown as { health: number }).health = 1;
  placeAtDistance(sim, 70);
  const events: SimulationEvent[] = [];
  for (let f = 0; f < 60 && !roundEnd(events); f++) {
    const punch = press({ punch: f % 2 === 0 });
    events.push(...sim.step(attacker === 0 ? [punch, idle()] : [idle(), punch]));
  }
  const result = roundEnd(events);
  if (!result) throw new Error('no KO');
  return result;
}

/** Plays the round out to the next round (or the end of the match). */
function finishRound(sim: FightSimulation): SimulationEvent[] {
  const events: SimulationEvent[] = [];
  for (
    let f = 0;
    f < 200 && !events.some((e) => e.type === 'roundStart' || e.type === 'matchOver');
    f++
  ) {
    events.push(...sim.step([idle(), idle()]));
  }
  stepFrames(sim, 2);
  return events;
}

/** Side `attacker` hits the other once (a real hit, real HP loss). */
function landHit(
  sim: FightSimulation,
  attacker: 0 | 1,
  extra: Partial<Parameters<typeof press>[0]> = {},
): void {
  placeAtDistance(sim, 70);
  const hit = press({ punch: true, ...extra });
  stepFrames(sim, 1, attacker === 0 ? hit : idle(), attacker === 0 ? idle() : hit);
  stepFrames(sim, 40);
}

describe('PERFECT round result', () => {
  it('1. KO with full health is PERFECT', () => {
    const sim = newSim();
    expect(knockOut(sim, 0)).toEqual({ winnerIndex: 0, reason: 'ko', perfect: true });
  });

  it('2. time over with full health is PERFECT', () => {
    const sim = newSim(SHORT_CLOCK);
    landHit(sim, 0);
    const events = stepFrames(sim, SHORT_CLOCK.timeFrames);
    expect(roundEnd(events)).toEqual({ winnerIndex: 0, reason: 'timeout', perfect: true });
    expect(sim.fighters[0].health).toBe(sim.fighters[0].maxHealth);
  });

  it('3. losing a single point of health rules it out', () => {
    const sim = newSim();
    (sim.fighters[0] as unknown as { health: number }).health = sim.fighters[0].maxHealth - 1;
    expect(knockOut(sim, 0)).toMatchObject({ winnerIndex: 0, perfect: false });
  });

  it('4. chip damage taken while blocking rules it out', () => {
    const sim = newSim();
    placeAtDistance(sim, 80);
    // The CPU kicks (chip 1) into the player's guard.
    stepFrames(sim, 1, press({ block: true }), press({ kick: true }));
    stepFrames(sim, 40, press({ block: true }));
    expect(sim.fighters[0].health).toBe(
      sim.fighters[0].maxHealth - fighterB.attacks.kick.chipDamage,
    );
    expect(knockOut(sim, 0)).toMatchObject({ winnerIndex: 0, perfect: false });
  });

  it('5. blocking without losing health keeps it PERFECT', () => {
    const sim = newSim();
    placeAtDistance(sim, 70);
    expect(fighterB.attacks.punch.chipDamage).toBe(0);
    const events = [
      ...stepFrames(sim, 1, press({ block: true }), press({ punch: true })),
      ...stepFrames(sim, 40, press({ block: true })),
    ];
    expect(events.some((e) => e.type === 'block')).toBe(true);
    expect(sim.fighters[0].health).toBe(sim.fighters[0].maxHealth);
    expect(knockOut(sim, 0)).toEqual({ winnerIndex: 0, reason: 'ko', perfect: true });
  });

  it('6. the CPU can score a PERFECT too', () => {
    const sim = newSim();
    expect(knockOut(sim, 1)).toEqual({ winnerIndex: 1, reason: 'ko', perfect: true });
  });

  it('7. each round is judged on its own (best of three)', () => {
    const sim = newSim();
    // Round 1: clean KO.
    expect(knockOut(sim, 0).perfect).toBe(true);
    finishRound(sim);
    // Round 2: the player takes a hit, then wins anyway.
    landHit(sim, 1);
    expect(knockOut(sim, 0).perfect).toBe(false);
    const over = finishRound(sim).find((e) => e.type === 'matchOver');
    expect(over).toMatchObject({
      outcome: { winnerIndex: 0, roundWins: [2, 0], perfects: [1, 0] },
    });
  });

  it('8. damage from an earlier round is not carried into the next one', () => {
    const sim = newSim();
    landHit(sim, 1); // the player is hurt in round 1...
    expect(knockOut(sim, 1)).toMatchObject({ winnerIndex: 1 });
    finishRound(sim);
    expect(sim.fighters[0].health).toBe(sim.fighters[0].maxHealth);
    // ...but wins round 2 untouched: PERFECT.
    expect(knockOut(sim, 0)).toEqual({ winnerIndex: 0, reason: 'ko', perfect: true });
  });

  it('a hit earlier in the round counts even if health were somehow restored', () => {
    const round = new RoundSystem(FAST_TIMING, [100, 100]);
    round.step([100, 100]); // intro -> fight
    round.step([90, 100]);
    round.step([100, 100]);
    const [ko] = round.step([100, 0]);
    expect(ko).toMatchObject({ type: 'ko', result: { winnerIndex: 0, perfect: false } });
  });

  it('9. a draw is never PERFECT (equal full health at time over, or a double KO)', () => {
    const timeDraw = new RoundSystem(SHORT_CLOCK, [100, 100]);
    let result: RoundResult | undefined;
    for (let f = 0; f < SHORT_CLOCK.timeFrames + 5 && !result; f++)
      result = roundEnd(timeDraw.step([100, 100]));
    expect(result).toEqual({ winnerIndex: null, reason: 'timeout', perfect: false });

    const doubleKo = new RoundSystem(FAST_TIMING, [100, 100]);
    doubleKo.step([100, 100]);
    expect(roundEnd(doubleKo.step([0, 0]))).toEqual({
      winnerIndex: null,
      reason: 'ko',
      perfect: false,
    });
  });

  it('10. deterministic: the same match gives the same results, PERFECTs included', () => {
    const play = () => {
      const sim = newSim();
      const log: string[] = [];
      for (let f = 0; f < 3000; f++) {
        const p1 = press({ right: f % 40 < 25, punch: f % 9 === 0, kick: f % 23 === 0 });
        const p2 = press({ left: f % 50 < 20, block: f % 70 < 30, punch: f % 17 === 0 });
        for (const e of sim.step([p1, p2])) {
          if (e.type === 'ko' || e.type === 'timeUp') log.push(`${f}:${JSON.stringify(e.result)}`);
          if (e.type === 'matchOver') log.push(`${f}:${JSON.stringify(e.outcome)}`);
        }
      }
      return log;
    };
    const first = play();
    expect(first.length).toBeGreaterThan(0);
    expect(play()).toEqual(first);
  });
});
