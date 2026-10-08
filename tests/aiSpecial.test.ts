import { describe, expect, it } from 'vitest';
import { AIController } from '../src/controllers/AIController';
import {
  EASY_AI,
  HARD_AI,
  NORMAL_AI,
  aiProfileFor,
  type AIProfile,
} from '../src/controllers/aiProfiles';
import { FightSimulation, type SimulationEvent } from '../src/core/FightSimulation';
import type { ReadonlyFighter } from '../src/core/fighter/ReadonlyFighter';
import {
  specialForPress,
  specialWouldConnect,
  usableSpecials,
} from '../src/core/fighter/specialMoves';
import { createRng } from '../src/core/random';
import { augusto } from '../src/fighters/augusto';
import { fighterA } from '../src/fighters/fighterA';
import { fighterB } from '../src/fighters/fighterB';
import { filipe } from '../src/fighters/filipe';
import { joaoGuiotti } from '../src/fighters/joaoGuiotti';
import { romualdo } from '../src/fighters/romualdo';
import { aislan } from '../src/fighters/aislan';
import { partnerArena } from '../src/stages/partnerArena';
import type { FighterConfig, SpecialMoveConfig } from '../src/types/fighter';
import type { InputState } from '../src/types/input';
import { FAST_TIMING, idle, placeAtDistance, stepFrames } from './helpers';

const MINDHUB = filipe.specials[0] as SpecialMoveConfig;

/** A CPU that throws the special whenever the rules allow it (no hesitation, no chance). */
const ALWAYS: AIProfile = {
  ...HARD_AI,
  aggression: 0,
  retreatChance: 0,
  guardChance: 0,
  blockChance: 0,
  jumpInChance: 0,
  special: {
    ...HARD_AI.special,
    useChance: 1,
    readyDelay: [0, 0],
    decisionCooldown: [0, 0],
    declineCooldown: [0, 0],
    spacingAwareness: 1,
  },
};
/** Never on its own: only the finisher / punish bonuses can make it throw. */
const BONUS_ONLY = (bonus: Partial<AIProfile['special']>): AIProfile => ({
  ...ALWAYS,
  special: { ...ALWAYS.special, useChance: 0, ...bonus },
});

function setMeter(fighter: unknown, meter: number): void {
  (fighter as { meter: number }).meter = meter;
}

/** CPU (side 0) vs a still opponent at `distance`; returns its inputs and the events. */
function runCpu(
  config: FighterConfig,
  profile: AIProfile,
  options: { meter: number; distance: number; frames: number; refill?: boolean; seed?: number },
) {
  const sim = new FightSimulation({
    fighters: [config, fighterB],
    stage: partnerArena,
    roundTiming: FAST_TIMING,
  });
  stepFrames(sim, 1);
  placeAtDistance(sim, options.distance);
  setMeter(sim.fighters[0], options.meter);
  const ai = new AIController(profile, createRng(options.seed ?? 7));
  const inputs: InputState[] = [];
  const events: { frame: number; event: SimulationEvent }[] = [];
  for (let frame = 0; frame < options.frames; frame++) {
    if (options.refill) setMeter(sim.fighters[0], options.meter);
    // The opponent is pinned so the distance stays what the test asks for.
    placeAtDistance(sim, options.distance);
    const input = ai.getInput({ self: sim.fighters[0], opponent: sim.fighters[1] });
    inputs.push(input);
    for (const event of sim.step([input, idle()])) events.push({ frame, event });
  }
  const starts = events.filter((e) => e.event.type === 'specialStart');
  return { sim, inputs, events, starts, pressed: inputs.filter((i) => i.special).length };
}

/** A view of a real fighter with some fields replaced (states the test needs to stage). */
function staged(
  fighter: ReadonlyFighter,
  overrides: Partial<Record<keyof ReadonlyFighter, unknown>>,
) {
  return new Proxy(fighter, {
    get(target, key: string) {
      if (key in overrides) return overrides[key as keyof ReadonlyFighter];
      const value = (target as unknown as Record<string, unknown>)[key];
      return typeof value === 'function' ? (value as () => unknown).bind(target) : value;
    },
  }) as ReadonlyFighter;
}

describe('CPU specials: the same rules as a human press', () => {
  it('1. a fighter without specials never tries one', () => {
    const { pressed, starts } = runCpu(fighterA, ALWAYS, {
      meter: 100,
      distance: 150,
      frames: 600,
    });
    expect(pressed).toBe(0);
    expect(starts).toHaveLength(0);
  });

  it('2. without enough meter it never tries', () => {
    const { pressed } = runCpu(filipe, ALWAYS, {
      meter: MINDHUB.meterCost - 1,
      distance: 150,
      frames: 600,
    });
    expect(pressed).toBe(0);
  });

  it('3/4/8. with the cost in meter (well below 100) it throws it, and pays for it', () => {
    const { starts, sim } = runCpu(filipe, ALWAYS, {
      meter: MINDHUB.meterCost,
      distance: 150,
      frames: 120,
    });
    expect(starts.length).toBeGreaterThanOrEqual(1);
    expect(sim.fighters[0].specialMeter).toBeLessThan(MINDHUB.meterCost);
    const paid = runCpu(filipe, ALWAYS, { meter: 50, distance: 150, frames: 60 });
    expect(paid.starts).toHaveLength(1);
    expect(paid.sim.fighters[0].specialMeter).toBe(50 - MINDHUB.meterCost);
  });

  it('5. groundOnly is respected: never pressed in the air (and a press there would not start it)', () => {
    const sim = new FightSimulation({
      fighters: [filipe, fighterB],
      stage: partnerArena,
      roundTiming: FAST_TIMING,
    });
    stepFrames(sim, 1);
    placeAtDistance(sim, 150);
    const self = staged(sim.fighters[0], { isAirborne: true, state: 'jump', specialMeter: 100 });
    const ai = new AIController(ALWAYS, createRng(3));
    for (let f = 0; f < 120; f++)
      expect(ai.getInput({ self, opponent: sim.fighters[1] }).special).toBe(false);
    expect(specialForPress(filipe, 100, true)).toBeUndefined();
    expect(specialForPress(filipe, 100, false)).toBe(MINDHUB);
  });

  it('6. distance: never from across the screen, yes where the move reaches', () => {
    expect(runCpu(filipe, ALWAYS, { meter: 100, distance: 500, frames: 600 }).pressed).toBe(0);
    expect(
      runCpu(filipe, ALWAYS, { meter: 100, distance: 160, frames: 60 }).starts.length,
    ).toBeGreaterThan(0);
    const sim = new FightSimulation({ fighters: [filipe, fighterB], stage: partnerArena });
    placeAtDistance(sim, 500);
    expect(
      specialWouldConnect(MINDHUB, sim.fighters[0].position, 1, sim.fighters[1].getHurtbox()),
    ).toBe(false);
  });

  it('7. never in hitstun, blockstun, during its own attack or KO', () => {
    const sim = new FightSimulation({
      fighters: [filipe, fighterB],
      stage: partnerArena,
      roundTiming: FAST_TIMING,
    });
    stepFrames(sim, 1);
    placeAtDistance(sim, 150);
    for (const state of ['hurt', 'block', 'crouchBlock', 'kick', 'punch', 'knockout'] as const) {
      const self = staged(sim.fighters[0], { state, specialMeter: 100 });
      const ai = new AIController(ALWAYS, createRng(5));
      for (let f = 0; f < 90; f++) {
        expect(ai.getInput({ self, opponent: sim.fighters[1] }).special, state).toBe(false);
      }
    }
  });

  it('12/13. it does not fire every frame: the cooldown spaces the specials out', () => {
    const cooldown: AIProfile = {
      ...ALWAYS,
      special: { ...ALWAYS.special, decisionCooldown: [100, 100] },
    };
    const { starts } = runCpu(filipe, cooldown, {
      meter: 100,
      distance: 150,
      frames: 900,
      refill: true,
    });
    expect(starts.length).toBeGreaterThan(1);
    const gaps = starts.slice(1).map((s, i) => s.frame - starts[i]!.frame);
    const move = MINDHUB.startupFrames + MINDHUB.activeFrames + MINDHUB.recoveryFrames;
    for (const gap of gaps) expect(gap).toBeGreaterThanOrEqual(move + 100);
    // A declined chance also waits before the next look.
    const declining: AIProfile = {
      ...ALWAYS,
      special: { ...ALWAYS.special, useChance: 0, declineCooldown: [60, 60] },
    };
    const looks = runCpu(filipe, declining, { meter: 100, distance: 150, frames: 600 });
    expect(looks.pressed).toBe(0);
  });

  it('14. a special that would finish the round gets priority', () => {
    const finisher = BONUS_ONLY({ finisherBias: 1 });
    const healthy = runCpu(filipe, finisher, { meter: 100, distance: 150, frames: 300 });
    expect(healthy.pressed).toBe(0);
    const sim = new FightSimulation({
      fighters: [filipe, fighterB],
      stage: partnerArena,
      roundTiming: FAST_TIMING,
    });
    stepFrames(sim, 1);
    placeAtDistance(sim, 150);
    setMeter(sim.fighters[0], 100);
    const low = staged(sim.fighters[1], { health: MINDHUB.damage });
    const ai = new AIController(finisher, createRng(9));
    const presses = Array.from(
      { length: 30 },
      () => ai.getInput({ self: sim.fighters[0], opponent: low }).special,
    );
    expect(presses).toContain(true);
    // The bias is ordered by difficulty.
    expect(EASY_AI.special.finisherBias).toBeLessThan(NORMAL_AI.special.finisherBias);
    expect(NORMAL_AI.special.finisherBias).toBeLessThan(HARD_AI.special.finisherBias);
  });

  it('11. whiff punishes only after reactionFrames, and only if the recovery leaves time', () => {
    const punisher: AIProfile = { ...BONUS_ONLY({ punishBonus: 1 }), reactionFrames: 6 };
    const sim = new FightSimulation({
      fighters: [filipe, fighterB],
      stage: partnerArena,
      roundTiming: FAST_TIMING,
    });
    stepFrames(sim, 1);
    placeAtDistance(sim, 150);
    setMeter(sim.fighters[0], 100);
    // A whiffed heavy attack with a long recovery: room to punish after seeing it.
    const kick = { ...fighterB.attacks.kick, recoveryFrames: 40 };
    const recoveryStart = kick.startupFrames + kick.activeFrames;
    const inRecovery = (seenFor: number) =>
      staged(sim.fighters[1], {
        activeAttack: kick,
        attackPhase: 'recovery',
        state: 'kick',
        stateFrame: recoveryStart + seenFor,
      });
    // Chance is capped below 1 on purpose, so look with several seeds.
    const firstLook = (opponent: ReadonlyFighter) =>
      [1, 2, 3, 4, 5].some(
        (seed) =>
          new AIController(punisher, createRng(seed)).getInput({ self: sim.fighters[0], opponent })
            .special,
      );
    expect(firstLook(inRecovery(punisher.reactionFrames - 1))).toBe(false); // not seen yet
    expect(firstLook(inRecovery(punisher.reactionFrames))).toBe(true);
    // Too late: less recovery left than the special's startup.
    expect(firstLook(inRecovery(kick.recoveryFrames - MINDHUB.startupFrames + 1))).toBe(false);
  });

  it('15. several specials: only the usable ones count, and the AI evaluates the one a press starts', () => {
    const heavy: SpecialMoveConfig = { ...MINDHUB, id: 'test.heavy', meterCost: 60 };
    const light: SpecialMoveConfig = { ...MINDHUB, id: 'test.light', meterCost: 30 };
    const airOk: SpecialMoveConfig = {
      ...MINDHUB,
      id: 'test.air',
      meterCost: 30,
      groundOnly: false,
    };
    const twoSpecials: FighterConfig = { ...filipe, id: 'test-two', specials: [heavy, light] };
    expect(usableSpecials(twoSpecials, 40, false).map((m) => m.id)).toEqual(['test.light']);
    expect(usableSpecials(twoSpecials, 70, false).map((m) => m.id)).toEqual([
      'test.heavy',
      'test.light',
    ]);
    expect(usableSpecials({ specials: [heavy, airOk] }, 100, true).map((m) => m.id)).toEqual([
      'test.air',
    ]);
    const cheap = runCpu(twoSpecials, ALWAYS, { meter: 40, distance: 150, frames: 60 });
    expect(cheap.starts).toHaveLength(1);
    expect(cheap.sim.fighters[0].specialMeter).toBe(40 - light.meterCost);
    const rich = runCpu(twoSpecials, ALWAYS, { meter: 70, distance: 150, frames: 60 });
    expect(rich.sim.fighters[0].specialMeter).toBe(70 - heavy.meterCost);
  });
});

describe('CPU specials by difficulty', () => {
  /** Specials per minute of fighting for a CPU playing Filipe / Augusto against a NORMAL CPU. */
  function specialsPerMinute(config: FighterConfig, profile: AIProfile): number {
    let specials = 0;
    let frames = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const sim = new FightSimulation({ fighters: [config, fighterA], stage: partnerArena });
      const ais = [
        new AIController(profile, createRng(seed)),
        new AIController(NORMAL_AI, createRng(seed + 50)),
      ];
      const [a, b] = sim.fighters;
      for (let f = 0; f < 60 * 60 * 3; f++) {
        let over = false;
        for (const e of sim.step([
          ais[0]!.getInput({ self: a, opponent: b }),
          ais[1]!.getInput({ self: b, opponent: a }),
        ])) {
          if (e.type === 'roundStart') ais.forEach((ai) => ai.reset());
          if (e.type === 'specialStart' && e.fighterIndex === 0) specials++;
          if (e.type === 'matchOver') over = true;
        }
        if (sim.acceptsInput) frames++;
        if (over) break;
      }
    }
    return specials / (frames / 3600);
  }

  it.each([filipe, augusto, joaoGuiotti, romualdo, aislan])(
    '9/10. %s: Easy < Normal < Hard, and every level does use it',
    (config) => {
      const easy = specialsPerMinute(config, aiProfileFor('easy'));
      const normal = specialsPerMinute(config, aiProfileFor('normal'));
      const hard = specialsPerMinute(config, aiProfileFor('hard'));
      expect(easy).toBeGreaterThan(0);
      expect(easy).toBeLessThan(normal);
      expect(normal).toBeLessThan(hard);
    },
  );

  it('parameters follow the difficulty (chance up, cooldowns and hesitation down)', () => {
    const [e, n, h] = [EASY_AI, NORMAL_AI, HARD_AI].map((p) => p.special);
    expect(e!.useChance).toBeGreaterThanOrEqual(0.12);
    expect(e!.useChance).toBeLessThanOrEqual(0.2);
    expect(n!.useChance).toBeGreaterThanOrEqual(0.35);
    expect(n!.useChance).toBeLessThanOrEqual(0.5);
    expect(h!.useChance).toBeGreaterThanOrEqual(0.65);
    expect(h!.useChance).toBeLessThanOrEqual(0.8);
    expect(e!.decisionCooldown[0]).toBeGreaterThan(n!.decisionCooldown[0]);
    expect(n!.decisionCooldown[0]).toBeGreaterThan(h!.decisionCooldown[0]);
    expect(e!.readyDelay[0]).toBeGreaterThan(h!.readyDelay[1]);
  });

  it('16. deterministic: the same seeds give the same match', () => {
    const play = () => {
      const sim = new FightSimulation({ fighters: [filipe, augusto], stage: partnerArena });
      const ais = [
        new AIController(HARD_AI, createRng(11)),
        new AIController(NORMAL_AI, createRng(12)),
      ];
      const [a, b] = sim.fighters;
      const log: string[] = [];
      for (let f = 0; f < 60 * 60 * 2; f++) {
        for (const e of sim.step([
          ais[0]!.getInput({ self: a, opponent: b }),
          ais[1]!.getInput({ self: b, opponent: a }),
        ])) {
          if (e.type === 'roundStart') ais.forEach((ai) => ai.reset());
          if (e.type !== 'land' && e.type !== 'jump') log.push(`${f}:${e.type}`);
        }
      }
      return log;
    };
    const first = play();
    expect(first.some((entry) => entry.endsWith('specialStart'))).toBe(true);
    expect(play()).toEqual(first);
  });
});
