import { describe, expect, it } from 'vitest';
import { AIController } from '../src/controllers/AIController';
import { aiProfileFor } from '../src/controllers/aiProfiles';
import { FightSimulation } from '../src/core/FightSimulation';
import { createRng } from '../src/core/random';
import { isaqueFerreira } from '../src/fighters/isaqueFerreira';
import { augusto } from '../src/fighters/augusto';
import { ROSTER } from '../src/fighters/roster';
import { partnerSummit } from '../src/stages/partnerSummit';
import { AI_DIFFICULTIES } from '../src/types/match';
import { FAST_TIMING } from './helpers';

describe('Isaque fighter integration', () => {
  it('has unique ids and a balanced standard-body profile without a special', () => {
    expect(new Set(ROSTER.map((f) => f.id)).size).toBe(ROSTER.length);
    expect(isaqueFerreira.stats).toEqual({
      maxHealth: 100,
      walkSpeed: 3.1,
      backWalkSpeed: 2.5,
      jumpForce: 16.5,
      jumpHorizontalSpeed: 3.9,
    });
    expect(isaqueFerreira.specials).toEqual([]);
    expect(Object.values(isaqueFerreira.attacks).map((a) => a.damage)).toEqual([
      7, 11, 5, 9, 7, 10,
    ]);
  });
  it.each(AI_DIFFICULTIES)('completes the same seeded CPU match on %s twice', (difficulty) => {
    const play = () => {
      const sim = new FightSimulation({
        fighters: [augusto, isaqueFerreira],
        stage: partnerSummit,
        roundTiming: FAST_TIMING,
      });
      const ais = [
        new AIController(aiProfileFor(difficulty), createRng(41)),
        new AIController(aiProfileFor(difficulty), createRng(91)),
      ];
      const trace: string[] = [];
      for (let frame = 0; frame < 28000 && !sim.match.isOver; frame++) {
        const [a, b] = sim.fighters;
        const events = sim.step([
          ais[0]!.getInput({ self: a, opponent: b }),
          ais[1]!.getInput({ self: b, opponent: a }),
        ]);
        if (events.some((e) => e.type === 'roundStart')) ais.forEach((ai) => ai.reset());
        if (frame % 30 === 0)
          trace.push(
            JSON.stringify(
              sim.fighters.map((f) => [
                f.state,
                f.position.x,
                f.position.y,
                f.health,
                f.specialMeter,
              ]),
            ),
          );
      }
      return { trace, result: sim.match.result };
    };
    const first = play();
    expect(first.result).not.toBeNull();
    expect(play()).toEqual(first);
  });
});
