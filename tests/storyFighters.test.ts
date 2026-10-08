import { describe, expect, it } from 'vitest';
import { AIController } from '../src/controllers/AIController';
import { aiProfileFor } from '../src/controllers/aiProfiles';
import { FightSimulation } from '../src/core/FightSimulation';
import { createRng } from '../src/core/random';
import { augusto } from '../src/fighters/augusto';
import { joaoGuiotti } from '../src/fighters/joaoGuiotti';
import { romualdo } from '../src/fighters/romualdo';
import { aislan } from '../src/fighters/aislan';
import { isaqueFerreira } from '../src/fighters/isaqueFerreira';
import { ROSTER, getFighterConfig } from '../src/fighters/roster';
import { partnerArena } from '../src/stages/partnerArena';
import { AI_DIFFICULTIES } from '../src/types/match';
import type { FighterConfig, FighterStateId } from '../src/types/fighter';
import type { InputState } from '../src/types/input';
import { FAST_TIMING, idle, press } from './helpers';

const NEW_FIGHTERS = [joaoGuiotti, romualdo] as const;

describe('João Guiotti and Romualdo', () => {
  it('are in the roster with their names and origins', () => {
    expect(getFighterConfig('joao-guiotti')).toBe(joaoGuiotti);
    expect(getFighterConfig('romualdo')).toBe(romualdo);
    expect(ROSTER).toContain(joaoGuiotti);
    expect(ROSTER).toContain(romualdo);
    expect(joaoGuiotti.displayName).toBe('JOÃO GUIOTTI');
    expect(joaoGuiotti.description).toBe('São Paulo - SP');
    expect(romualdo.displayName).toBe('ROMUALDO');
    expect(romualdo.description).toBe('Joinville - SC');
  });

  it('are complete fighters: six normals, no specials yet, own palette, independent visuals', () => {
    for (const config of NEW_FIGHTERS) {
      expect(Object.keys(config.attacks).sort()).toEqual(
        ['airKick', 'airPunch', 'crouchKick', 'crouchPunch', 'kick', 'punch'].sort(),
      );
      expect(config.specials).toEqual([]);
    }
    expect(joaoGuiotti.assets.sprite).toBeDefined();
    expect(romualdo.assets.sprite).toBeDefined();
    const palettes = ROSTER.map((config) => config.palette.body);
    expect(new Set(palettes).size).toBe(palettes.length);
  });

  it('keep their profiles: João quicker, Romualdo heavier (harder hits, longer recovery)', () => {
    const total = (c: FighterConfig, key: 'damage' | 'recoveryFrames') =>
      Object.values(c.attacks).reduce((sum, attack) => sum + attack[key], 0);
    expect(joaoGuiotti.stats.walkSpeed).toBeGreaterThan(romualdo.stats.walkSpeed);
    expect(joaoGuiotti.attacks.punch.startupFrames).toBeLessThan(
      romualdo.attacks.punch.startupFrames,
    );
    expect(total(romualdo, 'damage')).toBeGreaterThan(total(joaoGuiotti, 'damage'));
    expect(total(romualdo, 'recoveryFrames')).toBeGreaterThan(total(joaoGuiotti, 'recoveryFrames'));
    expect(joaoGuiotti.stats.maxHealth).toBe(romualdo.stats.maxHealth);
  });

  it.each([...NEW_FIGHTERS, isaqueFerreira, aislan])(
    '$id goes through every state in a real simulation',
    (config) => {
      const sim = new FightSimulation({
        fighters: [config, augusto],
        stage: partnerArena,
        roundTiming: FAST_TIMING,
      });
      const [self, other] = sim.fighters;
      const seen = new Set<FighterStateId>();
      const run = (
        frames: number,
        input: InputState | ((frame: number) => InputState) = idle(),
        cpu: InputState = idle(),
      ) => {
        for (let f = 0; f < frames; f++) {
          sim.step([typeof input === 'function' ? input(f) : input, cpu]);
          seen.add(self.state);
        }
      };
      run(2);
      run(10, press({ right: true }));
      run(50, (f: number) => press({ up: f < 2 }));
      run(50, (f: number) => press({ up: f < 2, punch: f === 12 }));
      run(50, (f: number) => press({ up: f < 2, kick: f === 12 }));
      run(6, press({ down: true }));
      run(30, (f: number) => press({ down: true, punch: f === 0 }));
      run(40, (f: number) => press({ down: true, kick: f === 0 }));
      run(30, (f: number) => press({ punch: f === 0 }));
      run(40, (f: number) => press({ kick: f === 0 }));
      run(4, press({ block: true }));
      run(4, press({ block: true, down: true }));
      run(10);
      // Get hit, then knocked out, then let the other side win.
      other.position.x = self.position.x + 70;
      run(40, idle(), press({ punch: true }));
      self.health = 1;
      run(30, idle(), press({ kick: true }));
      for (const state of [
        'walk',
        'jump',
        'crouch',
        'punch',
        'kick',
        'crouchPunch',
        'crouchKick',
        'airPunch',
        'airKick',
        'block',
        'crouchBlock',
        'hurt',
        'knockout',
      ] as const) {
        expect(seen, state).toContain(state);
      }
      // And they can win (victory pose).
      const win = new FightSimulation({
        fighters: [config, augusto],
        stage: partnerArena,
        roundTiming: FAST_TIMING,
      });
      win.step([idle(), idle()]);
      win.fighters[1].health = 1;
      win.fighters[1].position.x = win.fighters[0].position.x + 70;
      const states = new Set<FighterStateId>();
      for (let f = 0; f < 120; f++) {
        win.step([press({ punch: f % 2 === 0 }), idle()]);
        states.add(win.fighters[0].state);
      }
      expect(states).toContain('victory');
    },
  );

  it.each(AI_DIFFICULTIES)(
    'the CPU plays both on %s, best of three to the end, meter charging, deterministically',
    (difficulty) => {
      const play = () => {
        const sim = new FightSimulation({
          fighters: [joaoGuiotti, romualdo],
          stage: partnerArena,
          roundTiming: FAST_TIMING,
        });
        const ais = [
          new AIController(aiProfileFor(difficulty), createRng(5)),
          new AIController(aiProfileFor(difficulty), createRng(6)),
        ];
        const [a, b] = sim.fighters;
        const trace: string[] = [];
        let outcome = null;
        let meterCharged = false;
        for (let f = 0; f < 60 * 60 * 8 && !outcome; f++) {
          for (const e of sim.step([
            ais[0]!.getInput({ self: a, opponent: b }),
            ais[1]!.getInput({ self: b, opponent: a }),
          ])) {
            if (e.type === 'roundStart') ais.forEach((ai) => ai.reset());
            if (e.type === 'matchOver') outcome = e.outcome;
          }
          meterCharged ||= a.specialMeter > 0 && b.specialMeter > 0;
          if (f % 30 === 0)
            trace.push(
              `${a.position.x},${a.health},${a.specialMeter}|${b.position.x},${b.health},${b.specialMeter}`,
            );
        }
        return { trace, outcome, meterCharged };
      };
      const first = play();
      expect(first.outcome).not.toBeNull();
      expect(Math.max(...first.outcome!.roundWins)).toBeGreaterThanOrEqual(1);
      // The special meter charges for both (they have no specials yet, but the meter works).
      expect(first.meterCharged).toBe(true);
      expect(play()).toEqual(first);
    },
  );
});
