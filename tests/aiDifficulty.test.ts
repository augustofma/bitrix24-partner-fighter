import { describe, expect, it } from 'vitest';
import { DEFAULT_AI_DIFFICULTY } from '../src/config/match';
import { AIController } from '../src/controllers/AIController';
import {
  AI_PROFILES,
  EASY_AI,
  HARD_AI,
  NORMAL_AI,
  aiProfileFor,
  type AIProfile,
} from '../src/controllers/aiProfiles';
import { FightSimulation } from '../src/core/FightSimulation';
import { createRng } from '../src/core/random';
import { augusto } from '../src/fighters/augusto';
import { fighterA } from '../src/fighters/fighterA';
import { fighterB } from '../src/fighters/fighterB';
import { filipe } from '../src/fighters/filipe';
import { partnerArena } from '../src/stages/partnerArena';
import type { FighterConfig } from '../src/types/fighter';
import type { InputState } from '../src/types/input';
import { AI_DIFFICULTIES, isAIDifficulty, type AIDifficulty } from '../src/types/match';
import { FAST_TIMING, SINGLE_ROUND, idle, placeAtDistance, press } from './helpers';

/** Only reactions: no attacks, retreats or pre-emptive guard, and it always tries to block. */
function reactiveOnly(profile: AIProfile, overrides: Partial<AIProfile> = {}): AIProfile {
  return {
    ...profile,
    blockChance: 1,
    aggression: 0,
    retreatChance: 0,
    guardChance: 0,
    jumpInChance: 0,
    ...overrides,
  };
}

function sim(distance: number, fighters: [FighterConfig, FighterConfig] = [fighterA, fighterB]) {
  const s = new FightSimulation({ fighters, stage: partnerArena, roundTiming: FAST_TIMING });
  s.step([idle(), idle()]);
  placeAtDistance(s, distance);
  return s;
}

/** The player runs `p1(frame)` against the CPU; returns the CPU's guard inputs and the contacts. */
function cpuDefends(p1: (f: number) => InputState, profile: AIProfile, distance: number, seed = 4) {
  const s = sim(distance);
  const [player, cpu] = s.fighters;
  const ai = new AIController(profile, createRng(seed));
  const guards: InputState[] = [];
  const types: string[] = [];
  for (let f = 0; f < 60; f++) {
    const input = ai.getInput({ self: cpu, opponent: player });
    if (input.block) guards.push(input);
    for (const e of s.step([p1(f), input]))
      if (e.type === 'hit' || e.type === 'block') types.push(e.type);
  }
  return { guards, types };
}

const sweep = (f: number) => press({ down: true, kick: f === 0 });
const jumpInKick = (f: number) => press({ up: f === 0, right: f < 40, kick: f === 12 });

describe('difficulty registry', () => {
  it('easy, normal and hard return their profiles; normal is NORMAL_AI', () => {
    expect(AI_DIFFICULTIES).toEqual(['easy', 'normal', 'hard']);
    expect(aiProfileFor('easy')).toBe(EASY_AI);
    expect(aiProfileFor('normal')).toBe(NORMAL_AI);
    expect(aiProfileFor('hard')).toBe(HARD_AI);
    expect(AI_PROFILES.normal).toBe(NORMAL_AI);
    expect(DEFAULT_AI_DIFFICULTY).toBe('normal');
    expect(isAIDifficulty('hard')).toBe(true);
    expect(isAIDifficulty('nightmare')).toBe(false);
    expect(isAIDifficulty(undefined)).toBe(false);
  });

  it('reaction: hard < normal < easy', () => {
    expect(HARD_AI.reactionFrames).toBeLessThan(NORMAL_AI.reactionFrames);
    expect(NORMAL_AI.reactionFrames).toBeLessThan(EASY_AI.reactionFrames);
  });

  it('hard blocks, notices low postures and reads guards better than normal; easy worse', () => {
    for (const key of ['blockChance', 'lowPostureAwareness', 'guardReadChance'] as const) {
      expect(HARD_AI[key]).toBeGreaterThan(NORMAL_AI[key]);
      expect(EASY_AI[key]).toBeLessThan(NORMAL_AI[key]);
    }
  });

  it('easy is more permissive and hard applies more pressure across the board', () => {
    expect(EASY_AI.aggression).toBeLessThan(NORMAL_AI.aggression);
    expect(HARD_AI.aggression).toBeGreaterThan(NORMAL_AI.aggression);
    expect(EASY_AI.jumpInChance).toBeLessThan(NORMAL_AI.jumpInChance);
    expect(HARD_AI.jumpInAttackChance).toBeGreaterThan(NORMAL_AI.jumpInAttackChance);
    expect(EASY_AI.attackCooldown[0]).toBeGreaterThan(NORMAL_AI.attackCooldown[0]);
    expect(EASY_AI.attackCooldown[1]).toBeGreaterThan(NORMAL_AI.attackCooldown[1]);
    expect(HARD_AI.attackCooldown[1]).toBeLessThan(NORMAL_AI.attackCooldown[1]);
    expect(EASY_AI.waitFrames[0]).toBeGreaterThan(NORMAL_AI.waitFrames[0]);
    expect(HARD_AI.waitFrames[1]).toBeLessThan(NORMAL_AI.waitFrames[1]);
    // Easy still reacts (it is permissive, not inert).
    expect(EASY_AI.blockChance).toBeGreaterThan(0);
    expect(EASY_AI.guardReadChance).toBeGreaterThan(0);
  });
});

describe('guard choice per difficulty', () => {
  it('with a high guardReadChance the CPU uses ↓ + D against a low and D against an overhead', () => {
    const profile = reactiveOnly(HARD_AI, { guardReadChance: 1 });
    const low = cpuDefends(sweep, profile, 110);
    expect(low.guards.length).toBeGreaterThan(0);
    expect(low.guards.every((g) => g.down)).toBe(true);
    expect(low.types).toEqual(['block']);

    const overhead = cpuDefends(jumpInKick, profile, 120);
    expect(overhead.guards.length).toBeGreaterThan(0);
    expect(overhead.guards.every((g) => !g.down)).toBe(true);
    expect(overhead.types).toEqual(['block']);
  });

  it('over many seeds, hard reads the sweep right more often than normal, normal than easy', () => {
    const correctReads = (difficulty: AIDifficulty) => {
      let correct = 0;
      for (let seed = 1; seed <= 60; seed++) {
        const r = cpuDefends(sweep, reactiveOnly(aiProfileFor(difficulty)), 110, seed);
        if (r.guards.length > 0 && r.guards.every((g) => g.down)) correct++;
      }
      return correct;
    };
    const easy = correctReads('easy');
    const normal = correctReads('normal');
    const hard = correctReads('hard');
    expect(hard).toBeGreaterThan(normal);
    expect(normal).toBeGreaterThan(easy);
    expect(easy).toBeGreaterThan(0);
  });

  it.each(AI_DIFFICULTIES)(
    '%s never guards before the attack started + reactionFrames',
    (difficulty) => {
      const profile = reactiveOnly(aiProfileFor(difficulty));
      const s = sim(110);
      const [player, cpu] = s.fighters;
      const ai = new AIController(profile, createRng(9));
      let guarded = false;
      for (let f = 0; f < 40; f++) {
        const input = ai.getInput({ self: cpu, opponent: player });
        const attackFrame = player.activeAttack ? player.stateFrame : -1;
        if (input.block) {
          guarded = true;
          expect(attackFrame).toBeGreaterThanOrEqual(profile.reactionFrames);
        }
        // The sweep is pressed only at frame 10: nothing about it exists before.
        s.step([press({ down: true, kick: f === 10 }), input]);
      }
      expect(guarded).toBe(true);
    },
  );
});

/** CPU vs CPU, both on `difficulty`; returns a per-frame trace and the hits landed. */
function cpuVsCpu(difficulty: AIDifficulty, seed: number, frames = 60 * 40) {
  const s = new FightSimulation({
    fighters: [augusto, filipe],
    stage: partnerArena,
    roundTiming: FAST_TIMING,
    matchRules: SINGLE_ROUND,
  });
  const rng = createRng(seed);
  const profile = aiProfileFor(difficulty);
  const ais = [new AIController(profile, rng), new AIController(profile, rng)] as const;
  const [a, b] = s.fighters;
  const trace: string[] = [];
  let hits = 0;
  for (let f = 0; f < frames; f++) {
    const inputs = [
      ais[0].getInput({ self: a, opponent: b }),
      ais[1].getInput({ self: b, opponent: a }),
    ] as const;
    for (const e of s.step(inputs)) if (e.type === 'hit' || e.type === 'koHit') hits++;
    trace.push(`${a.position.x},${a.health},${a.state}|${b.position.x},${b.health},${b.state}`);
  }
  return { trace, hits, damage: a.maxHealth - a.health + (b.maxHealth - b.health) };
}

describe('CPU vs CPU per difficulty', () => {
  it.each(AI_DIFFICULTIES)('%s: same difficulty + same seed = same fight', (difficulty) => {
    expect(cpuVsCpu(difficulty, 21, 60 * 15).trace).toEqual(
      cpuVsCpu(difficulty, 21, 60 * 15).trace,
    );
  });

  it.each(AI_DIFFICULTIES)('%s: a fight runs without errors and deals damage', (difficulty) => {
    const result = cpuVsCpu(difficulty, 7);
    expect(result.hits).toBeGreaterThan(0);
    expect(result.damage).toBeGreaterThan(0);
  });
});
