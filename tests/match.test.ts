import { describe, expect, it } from 'vitest';
import { MatchSystem } from '../src/core/systems/MatchSystem';
import { FightSimulation, type SimulationEvent } from '../src/core/FightSimulation';
import type { RoundTiming } from '../src/core/systems/RoundSystem';
import { fighterA } from '../src/fighters/fighterA';
import { fighterB } from '../src/fighters/fighterB';
import { partnerArena } from '../src/stages/partnerArena';
import type { RoundResult } from '../src/types/match';
import { FAST_TIMING, idle, placeAtDistance, press, stepFrames } from './helpers';

const ko = (winnerIndex: 0 | 1): RoundResult => ({ winnerIndex, reason: 'ko' });
const draw: RoundResult = { winnerIndex: null, reason: 'timeout' };

describe('MatchSystem (best of three)', () => {
  it('2x0: two straight rounds win the match', () => {
    const match = new MatchSystem();
    expect(match.recordRound(ko(0))).toEqual([
      { type: 'roundStart', roundNumber: 2, finalRound: false },
    ]);
    const [over] = match.recordRound(ko(0));
    expect(over).toMatchObject({
      type: 'matchOver',
      outcome: { winnerIndex: 0, roundWins: [2, 0], roundsPlayed: 2 },
    });
    expect(match.isOver).toBe(true);
    expect(match.recordRound(ko(1))).toEqual([]); // nothing after the match
  });

  it('2x1: 1-1 makes round 3 the FINAL ROUND', () => {
    const match = new MatchSystem();
    match.recordRound(ko(1));
    expect(match.recordRound(ko(0))).toEqual([
      { type: 'roundStart', roundNumber: 3, finalRound: true },
    ]);
    expect(match.isFinalRound).toBe(true);
    const [over] = match.recordRound({ winnerIndex: 1, reason: 'timeout' });
    expect(over).toMatchObject({
      outcome: { winnerIndex: 1, reason: 'timeout', roundWins: [1, 2], roundsPlayed: 3 },
    });
  });

  it('a drawn round scores nothing and is replayed', () => {
    const match = new MatchSystem();
    expect(match.recordRound(draw)).toEqual([
      { type: 'roundDraw', roundNumber: 1 },
      { type: 'roundStart', roundNumber: 2, finalRound: false },
    ]);
    expect(match.roundWins).toEqual([0, 0]);
  });

  it('endless draws stop at the round cap (deterministic, no infinite loop)', () => {
    const match = new MatchSystem({ roundsToWin: 2, maxRounds: 4 });
    const events = [draw, draw, draw, draw].flatMap((r) => match.recordRound(r));
    expect(events.at(-1)).toMatchObject({
      type: 'matchOver',
      outcome: { winnerIndex: null, roundWins: [0, 0], roundsPlayed: 4 },
    });
    // Leader at the cap wins.
    const lead = new MatchSystem({ roundsToWin: 2, maxRounds: 3 });
    const leadEvents = [ko(0), draw, draw].flatMap((r) => lead.recordRound(r));
    expect(leadEvents.at(-1)).toMatchObject({ outcome: { winnerIndex: 0, roundWins: [1, 0] } });
  });
});

// ---------------------------------------------------------------- full simulation

function createMatch(timing: RoundTiming = FAST_TIMING): FightSimulation {
  const sim = new FightSimulation({
    fighters: [fighterA, fighterB],
    stage: partnerArena,
    roundTiming: timing,
  });
  stepFrames(sim, 1);
  return sim;
}

/** `winner` knocks the other side out with a punch; steps until the round is over. */
function winRoundByKo(sim: FightSimulation, winner: 0 | 1): SimulationEvent[] {
  while (sim.round.phase !== 'fight') sim.step([idle(), idle()]);
  placeAtDistance(sim, 80);
  sim.fighters[winner === 0 ? 1 : 0].health = 1;
  const attack = (side: 0 | 1, f: number) => press({ punch: side === winner && f === 0 });
  const events: SimulationEvent[] = [];
  for (let f = 0; f < 400 && !events.some((e) => e.type === 'roundOver'); f++) {
    events.push(...sim.step([attack(0, f), attack(1, f)]));
  }
  return events;
}

const ofType = <T extends SimulationEvent['type']>(events: SimulationEvent[], type: T) =>
  events.filter((e): e is Extract<SimulationEvent, { type: T }> => e.type === type);

describe('best of three in FightSimulation', () => {
  it('Round 1 -> Round 2 -> Final Round -> 2x1', () => {
    const sim = createMatch();
    expect(sim.match.currentRound).toBe(1);

    const r1 = winRoundByKo(sim, 0);
    expect(ofType(r1, 'roundStart')).toEqual([
      { type: 'roundStart', roundNumber: 2, finalRound: false },
    ]);
    const r2 = winRoundByKo(sim, 1);
    expect(ofType(r2, 'roundStart')).toEqual([
      { type: 'roundStart', roundNumber: 3, finalRound: true },
    ]);
    expect(sim.match.isFinalRound).toBe(true);
    const r3 = winRoundByKo(sim, 0);
    const [over] = ofType(r3, 'matchOver');
    expect(over?.outcome).toEqual({
      winnerIndex: 0,
      reason: 'ko',
      roundWins: [2, 1],
      roundsPlayed: 3,
    });
    expect(ofType(r3, 'roundStart')).toEqual([]);
  });

  it('2x0: the match ends after two rounds; no third round starts', () => {
    const sim = createMatch();
    winRoundByKo(sim, 1);
    const events = winRoundByKo(sim, 1);
    expect(ofType(events, 'matchOver')[0]?.outcome).toMatchObject({
      winnerIndex: 1,
      roundWins: [0, 2],
    });
    // The final state stays (loser down, winner celebrates); nothing resets.
    expect(sim.fighters[0].isKnockedOut).toBe(true);
    stepFrames(sim, 60);
    expect(sim.match.currentRound).toBe(2);
    expect(sim.round.phase).toBe('finished');
  });

  it('only one matchOver per match (the victory screen shows once)', () => {
    const sim = createMatch();
    const events = [...winRoundByKo(sim, 0), ...winRoundByKo(sim, 0), ...stepFrames(sim, 200)];
    expect(ofType(events, 'matchOver')).toHaveLength(1);
    expect(ofType(events, 'roundOver')).toHaveLength(2);
  });

  it('a new round resets fighters, timer, hitstop and inputs, but keeps the meter', () => {
    const sim = createMatch({ ...FAST_TIMING, introFrames: 30 });
    const [a, b] = sim.fighters;
    const spawn = [a.position.x, b.position.x];
    while (sim.round.phase !== 'fight') sim.step([idle(), idle()]);
    stepFrames(sim, 40, press({ right: true })); // walk away from the spawn
    a.changeSpecialMeter(40);
    b.changeSpecialMeter(15);

    winRoundByKo(sim, 0);
    expect(sim.match.currentRound).toBe(2);
    expect(sim.round.phase).toBe('intro');
    expect(sim.round.secondsRemaining).toBe(99);
    expect(sim.isInHitstop).toBe(false);
    for (const [i, fighter] of [a, b].entries()) {
      expect(fighter.health).toBe(fighter.maxHealth);
      expect(fighter.position.x).toBe(spawn[i]);
      expect(fighter.position.y).toBe(partnerArena.groundY);
      expect(fighter.velocity).toEqual({ x: 0, y: 0 });
      expect(fighter.state).toBe('idle');
      expect(fighter.activeAttack).toBeNull();
    }
    expect([a.direction, b.direction]).toEqual([1, -1]);
    // Meter carried over: the round's KO punch added +10 to A (and +5 to the damaged B).
    expect(a.specialMeter).toBe(50);
    expect(b.specialMeter).toBe(20);

    // Nothing pressed before the reset leaks into the new round (buffers/trackers cleared).
    const intro = stepFrames(sim, 29);
    expect(intro).toEqual([]);
    expect(a.state).toBe('idle');
  });

  it('a new match always starts with zero meter', () => {
    const sim = createMatch();
    sim.fighters[0].changeSpecialMeter(80);
    winRoundByKo(sim, 0);
    winRoundByKo(sim, 0);
    const next = createMatch();
    expect(next.fighters.map((f) => f.specialMeter)).toEqual([0, 0]);
  });

  it('time over: more health wins the round', () => {
    const sim = createMatch({ ...FAST_TIMING, timeFrames: 60 });
    placeAtDistance(sim, 80);
    sim.fighters[1].health = 50;
    const events = stepFrames(sim, 120);
    expect(ofType(events, 'roundOver')[0]?.result).toEqual({ winnerIndex: 0, reason: 'timeout' });
    expect(sim.match.roundWins).toEqual([1, 0]);
  });

  it('time over with equal health: DRAW, no point, the round is replayed', () => {
    const sim = createMatch({ ...FAST_TIMING, timeFrames: 60 });
    const events = stepFrames(sim, 120);
    expect(ofType(events, 'roundDraw')).toEqual([{ type: 'roundDraw', roundNumber: 1 }]);
    expect(sim.match.roundWins).toEqual([0, 0]);
    expect(sim.match.currentRound).toBe(2);
    expect(sim.match.isOver).toBe(false);
  });

  it('is deterministic across rounds', () => {
    const play = () => {
      const sim = createMatch();
      const trace: string[] = [];
      for (const winner of [0, 1, 0] as const) {
        winRoundByKo(sim, winner);
        trace.push(sim.fighters.map((f) => `${f.state}:${f.position.x}:${f.health}`).join('|'));
      }
      return trace;
    };
    expect(play()).toEqual(play());
  });
});
