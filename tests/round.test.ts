import { describe, expect, it } from 'vitest';
import { RoundSystem, type RoundEvent } from '../src/core/systems/RoundSystem';

const timing = { timeFrames: 120, introFrames: 10, victoryPoseDelayFrames: 5, outroFrames: 10 };

function run(round: RoundSystem, frames: number, health: [number, number]): RoundEvent[] {
  const events: RoundEvent[] = [];
  for (let i = 0; i < frames; i++) events.push(...round.step(health));
  return events;
}

describe('RoundSystem', () => {
  it('goes from intro to fight', () => {
    const round = new RoundSystem(timing);
    expect(round.phase).toBe('intro');
    const events = run(round, 10, [100, 100]);
    expect(events).toContainEqual({ type: 'fightStart' });
    expect(round.phase).toBe('fight');
    expect(round.secondsRemaining).toBe(2);
  });

  it('time over: the fighter with more health wins', () => {
    const round = new RoundSystem(timing);
    const events = run(round, 200, [80, 50]);
    expect(events.find((e) => e.type === 'timeUp')).toMatchObject({
      result: { winnerIndex: 0, reason: 'timeout' },
    });
    expect(round.phase).toBe('finished');
  });

  it('time over with equal health is a draw', () => {
    const round = new RoundSystem(timing);
    run(round, 200, [60, 60]);
    expect(round.result).toEqual({ winnerIndex: null, reason: 'timeout' });
  });

  it('KO ends the fight immediately', () => {
    const round = new RoundSystem(timing);
    run(round, 10, [100, 100]);
    const events = run(round, 1, [0, 40]);
    expect(events).toContainEqual({ type: 'ko', result: { winnerIndex: 1, reason: 'ko' } });
  });
});
