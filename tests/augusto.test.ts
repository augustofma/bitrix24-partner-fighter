import type { MatchRules } from '../src/core/systems/MatchSystem';
import { describe, expect, it } from 'vitest';
import { AIController } from '../src/controllers/AIController';
import { NORMAL_AI } from '../src/controllers/aiProfiles';
import { FightSimulation } from '../src/core/FightSimulation';
import { attackWouldConnect } from '../src/core/fighter/attackGeometry';
import { createRng } from '../src/core/random';
import { augusto } from '../src/fighters/augusto';
import { fighterA } from '../src/fighters/fighterA';
import { fighterB } from '../src/fighters/fighterB';
import {
  getFighterConfig,
  getSelectableFighters,
  pickCpuOpponent,
  ROSTER,
} from '../src/fighters/roster';
import { collectFighterAssets } from '../src/render/assets/fighterAssets';
import { selectSpriteAssets } from '../src/render/sprite/spriteValidation';
import { partnerArena } from '../src/stages/partnerArena';
import { NORMAL_ATTACK_STATES as ATTACK_STATES } from '../src/types/fighter';
import { FAST_TIMING, idle, placeAtDistance, press, stepFrames, SINGLE_ROUND } from './helpers';

function createSim(timeFrames = FAST_TIMING.timeFrames, matchRules?: MatchRules): FightSimulation {
  const sim = new FightSimulation({
    ...(matchRules ? { matchRules } : {}),
    fighters: [augusto, fighterB],
    stage: partnerArena,
    roundTiming: { ...FAST_TIMING, timeFrames },
  });
  stepFrames(sim, 1);
  return sim;
}

describe('Augusto roster and data', () => {
  it('is selectable and matches against the CPU-only fighter through roster rules', () => {
    expect(getFighterConfig('augusto')).toBe(augusto);
    expect(getSelectableFighters()).toContain(augusto);
    expect(ROSTER).toEqual(expect.arrayContaining([fighterA, fighterB, augusto]));
    expect(pickCpuOpponent(augusto.id)).toBe(fighterB);
    expect(pickCpuOpponent(fighterA.id)).toBe(fighterB);
    expect(pickCpuOpponent(fighterB.id)).not.toBe(fighterB);
    expect(augusto.description).toBe('Arrecife Digital');
    expect(augusto.stats.maxHealth).toBe(100);
    expect(augusto.specials).toHaveLength(1);
    expect(Object.keys(augusto.attacks).sort()).toEqual([...ATTACK_STATES].sort());
  });

  it.each(ATTACK_STATES)('%s has independent, valid frame data and a matching state', (slot) => {
    const attack = augusto.attacks[slot];
    expect(attack).not.toBe(fighterA.attacks[slot]);
    expect(attack.hitbox).not.toBe(fighterA.attacks[slot].hitbox);
    expect(attack.state).toBe(slot);
    for (const value of [
      attack.startupFrames,
      attack.activeFrames,
      attack.recoveryFrames,
      attack.hitstunFrames,
      attack.blockstunFrames,
      attack.hitstopFrames,
    ]) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    }
    expect(attack.damage).toBeGreaterThan(attack.chipDamage);
    expect(attack.chipDamage).toBeGreaterThanOrEqual(0);
    expect(attack.hitbox.width).toBeGreaterThan(0);
    expect(attack.hitbox.height).toBeGreaterThan(0);
  });

  it('uses attack levels consistent with standing and crouching geometry', () => {
    expect(ATTACK_STATES.map((slot) => augusto.attacks[slot].level)).toEqual([
      'high',
      'mid',
      'mid',
      'low',
      'overhead',
      'overhead',
    ]);
    const sim = createSim();
    placeAtDistance(sim, 70);
    stepFrames(sim, 1, idle(), press({ down: true }));
    const [a, b] = sim.fighters;
    const connects = (slot: (typeof ATTACK_STATES)[number]) =>
      attackWouldConnect(augusto.attacks[slot], a.position, a.direction, b.getHurtbox());
    expect(connects('punch')).toBe(false);
    for (const slot of ['kick', 'crouchPunch', 'crouchKick'] as const) {
      expect(connects(slot)).toBe(true);
    }
    expect(augusto.attacks.crouchKick.hitbox.y).toBe(-28);
  });

  it('loads its art through the shared pipeline and falls back when the sheet is unavailable', () => {
    expect(collectFighterAssets([augusto])).toHaveLength(2);
    expect(selectSpriteAssets(augusto, null)).toBeNull();
    expect(selectSpriteAssets(augusto, 40)).toBe(augusto.assets.sprite);
    expect(selectSpriteAssets(augusto, 39)).toBeNull();
    const animations = augusto.assets.sprite!.animations;
    expect(
      Object.entries(animations)
        .filter(([state]) => state !== 'special')
        .flatMap(([, animation]) => animation.frames),
    ).toEqual(Array.from({ length: 40 }, (_, index) => index));
    for (const slot of ATTACK_STATES) {
      expect(animations[slot]?.attackPhases).toEqual({ startup: 1, active: 1, recovery: 1 });
    }
    expect(animations.jump?.jumpPhases).toEqual({ rise: 1, apex: 1, fall: 1 });
  });

  it('keeps the core, controllers, scenes and renderer unaware of the character ID', () => {
    const sources = import.meta.glob<string>(
      [
        '../src/core/**/*.ts',
        '../src/controllers/**/*.ts',
        '../src/scenes/**/*.ts',
        '../src/render/**/*.ts',
      ],
      { query: '?raw', import: 'default', eager: true },
    );
    expect(Object.keys(sources).length).toBeGreaterThan(0);
    for (const [file, source] of Object.entries(sources)) {
      expect(source, file).not.toMatch(/augusto/i);
    }
  });
});

describe('Augusto integration in FightSimulation', () => {
  it('walks forward and backward at configured speeds, and jumps', () => {
    const sim = createSim();
    const [a] = sim.fighters;
    const x = a.position.x;
    stepFrames(sim, 5, press({ right: true }));
    expect(a.position.x - x).toBeCloseTo(5 * augusto.stats.walkSpeed);
    const forwardX = a.position.x;
    stepFrames(sim, 5, press({ left: true }));
    expect(forwardX - a.position.x).toBeCloseTo(5 * augusto.stats.backWalkSpeed);
    stepFrames(sim, 1, press({ up: true }));
    expect(a.isAirborne).toBe(true);
    expect(a.position.y).toBeLessThan(partnerArena.groundY);
  });

  it.each(ATTACK_STATES)('executes %s and exposes its hitbox only during active frames', (slot) => {
    const sim = createSim();
    const [a] = sim.fighters;
    const aerial = slot.startsWith('air');
    const down = slot.startsWith('crouch');
    const button = slot.toLowerCase().endsWith('punch') ? 'punch' : 'kick';
    if (aerial) stepFrames(sim, 1, press({ up: true }));
    stepFrames(sim, 1, press({ down, [button]: true }));
    expect(a.state).toBe(slot);
    expect(a.getHitbox()).toBeNull();
    const attack = augusto.attacks[slot];
    stepFrames(sim, attack.startupFrames, press({ down }));
    expect(a.getHitbox()).not.toBeNull();
    stepFrames(sim, attack.activeFrames, press({ down }));
    expect(a.getHitbox()).toBeNull();
    stepFrames(sim, 80, press({ down }));
    expect(a.state).toBe(down ? 'crouch' : 'idle');
  });

  it.each([false, true])('blocks a real kick with crouching=%s', (down) => {
    const sim = createSim();
    placeAtDistance(sim, 80);
    const events = stepFrames(sim, 12, press({ down, block: true }), press({ kick: true }));
    expect(events.filter((event) => event.type === 'block')).toHaveLength(1);
    expect(sim.fighters[0].health).toBe(99);
    expect(sim.fighters[0].state).toBe(down ? 'crouchBlock' : 'block');
  });

  it('crosses over with an air kick, hits once, and turns after landing', () => {
    const sim = createSim();
    placeAtDistance(sim, 100);
    const [a, b] = sim.fighters;
    stepFrames(sim, 1, press({ up: true, right: true }));
    let hits = 0;
    for (let frame = 0; frame < 120 && a.isAirborne; frame++) {
      hits += sim
        .step([press({ right: true, kick: frame === 16 }), idle()])
        .filter((event) => event.type === 'hit').length;
      if (a.isAirborne) expect(a.direction).toBe(1);
    }
    expect(a.position.x).toBeGreaterThan(b.position.x);
    expect(hits).toBe(1);
    expect(b.health).toBe(100 - augusto.attacks.airKick.damage);
    stepFrames(sim, 1);
    expect(a.direction).toBe(-1);
    expect(b.direction).toBe(1);
  });

  it.each([0, 1] as const)('can win a full-health fight by KO with winner %s', (winner) => {
    const sim = createSim();
    for (let cycle = 0; cycle < 30 && sim.round.phase === 'fight'; cycle++) {
      placeAtDistance(sim, 70);
      stepFrames(
        sim,
        1,
        winner === 0 ? press({ kick: true }) : idle(),
        winner === 1 ? press({ kick: true }) : idle(),
      );
      stepFrames(sim, 65);
    }
    expect(sim.round.result).toMatchObject({ winnerIndex: winner, reason: 'ko' });
    expect(sim.fighters[winner === 0 ? 1 : 0].state).toBe('knockout');
    expect(sim.fighters[winner].state).toBe('victory');
  });

  it('wins by timeout after dealing damage', () => {
    const sim = createSim(120, SINGLE_ROUND);
    placeAtDistance(sim, 70);
    stepFrames(sim, 1, press({ punch: true }));
    stepFrames(sim, 180);
    expect(sim.round.result).toMatchObject({ winnerIndex: 0, reason: 'timeout' });
    expect(sim.fighters[0].state).toBe('victory');
  });

  it('supports the current CPU on both sides with deterministic decisions', () => {
    const run = () => {
      const sim = createSim();
      const controllers = [
        new AIController(NORMAL_AI, createRng(7)),
        new AIController(NORMAL_AI, createRng(8)),
      ] as const;
      const [a, b] = sim.fighters;
      const trace = [];
      for (let frame = 0; frame < 1800; frame++) {
        sim.step([
          controllers[0].getInput({ self: a, opponent: b }),
          controllers[1].getInput({ self: b, opponent: a }),
        ]);
        trace.push([a.state, b.state, a.health, b.health, a.position.x, b.position.x]);
      }
      // Both took damage at some point (rounds reset health, so not necessarily at the end).
      expect(Math.min(...trace.map((t) => Number(t[2])))).toBeLessThan(a.maxHealth);
      expect(Math.min(...trace.map((t) => Number(t[3])))).toBeLessThan(b.maxHealth);
      return trace;
    };
    expect(run()).toEqual(run());
  });
});
