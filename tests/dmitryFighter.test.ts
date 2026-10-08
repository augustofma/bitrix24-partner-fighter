import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AIController } from '../src/controllers/AIController';
import { aiProfileFor } from '../src/controllers/aiProfiles';
import { FightSimulation } from '../src/core/FightSimulation';
import { createRng } from '../src/core/random';
import { dmitry } from '../src/fighters/dmitry';
import { augusto } from '../src/fighters/augusto';
import { ROSTER } from '../src/fighters/roster';
import { partnerSummit } from '../src/stages/partnerSummit';
import { AI_DIFFICULTIES } from '../src/types/match';
import { FAST_TIMING } from './helpers';

describe('Dmitry fighter integration', () => {
  it('has unique ids, a balanced standard-body profile and one boss special', () => {
    expect(new Set(ROSTER.map((f) => f.id)).size).toBe(ROSTER.length);
    expect(dmitry.stats).toEqual({
      maxHealth: 108,
      walkSpeed: 3.0,
      backWalkSpeed: 2.4,
      jumpForce: 16.5,
      jumpHorizontalSpeed: 3.9,
    });
    expect(dmitry.specials.map((s) => s.id)).toEqual(['dmitry.alaioStrike']);
    expect(Object.values(dmitry.attacks).map((a) => a.damage)).toEqual([8, 12, 6, 10, 8, 11]);
  });
  it.each(AI_DIFFICULTIES)('completes the same seeded CPU match on %s twice', (difficulty) => {
    const play = () => {
      const sim = new FightSimulation({
        fighters: [augusto, dmitry],
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

it('keeps boss identity out of the simulation and controllers', () => {
  const inspect = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) inspect(file);
      else expect(readFileSync(file, 'utf8'), file).not.toMatch(/dmitry/i);
    }
  };
  inspect(join(__dirname, '../src/core'));
  inspect(join(__dirname, '../src/controllers'));
});
