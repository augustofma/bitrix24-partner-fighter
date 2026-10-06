import { describe, expect, it } from 'vitest';
import { AIController } from '../src/controllers/AIController';
import { NORMAL_AI, type AIProfile } from '../src/controllers/aiProfiles';
import { GUARD_COVERAGE, correctGuardFor, guardPostureOf } from '../src/core/fighter/fighterStates';
import { FightSimulation, type SimulationEvent } from '../src/core/FightSimulation';
import { createRng } from '../src/core/random';
import { fighterA } from '../src/fighters/fighterA';
import { fighterB } from '../src/fighters/fighterB';
import { filipe } from '../src/fighters/filipe';
import { partnerArena } from '../src/stages/partnerArena';
import type { AttackLevel, FighterConfig } from '../src/types/fighter';
import type { InputState } from '../src/types/input';
import { FAST_TIMING, idle, placeAtDistance, press } from './helpers';

const STAND = { block: true };
const CROUCH = { block: true, down: true };

function sim(attacker: FighterConfig = fighterA, distance = 80): FightSimulation {
  const s = new FightSimulation({
    fighters: [attacker, fighterB],
    stage: partnerArena,
    roundTiming: FAST_TIMING,
  });
  s.step([idle(), idle()]);
  placeAtDistance(s, distance);
  return s;
}

/** Player 1 runs `p1(frame)`, player 2 holds `guard`; returns the contact events. */
function contact(
  s: FightSimulation,
  p1: (f: number) => InputState,
  guard: Partial<InputState>,
  frames = 60,
): SimulationEvent['type'][] {
  const types: SimulationEvent['type'][] = [];
  for (let f = 0; f < frames; f++) {
    for (const e of s.step([p1(f), press(guard)])) {
      if (e.type === 'hit' || e.type === 'block') types.push(e.type);
    }
  }
  return types;
}

/** A copy of `base` whose `slot` attack has another level (geometry unchanged). */
function withLevel(base: FighterConfig, slot: 'punch' | 'kick', level: AttackLevel): FighterConfig {
  return { ...base, attacks: { ...base.attacks, [slot]: { ...base.attacks[slot], level } } };
}

describe('guard coverage table', () => {
  it('high/mid: both guards; low: crouching only; overhead: standing only', () => {
    expect(GUARD_COVERAGE).toEqual({
      high: ['standing', 'crouching'],
      mid: ['standing', 'crouching'],
      low: ['crouching'],
      overhead: ['standing'],
    });
    expect(correctGuardFor('low')).toBe('crouching');
    expect(correctGuardFor('overhead')).toBe('standing');
    expect(guardPostureOf('block')).toBe('standing');
    expect(guardPostureOf('crouchBlock')).toBe('crouching');
    expect(guardPostureOf('crouch')).toBeNull();
  });

  it('the shipped attacks keep their levels (air = overhead, sweep = low, low jab = mid)', () => {
    for (const config of [fighterA, fighterB, filipe]) {
      expect(config.attacks.airPunch.level).toBe('overhead');
      expect(config.attacks.airKick.level).toBe('overhead');
      expect(config.attacks.crouchKick.level).toBe('low');
      expect(config.attacks.crouchPunch.level).toBe('mid');
      expect(config.attacks.kick.level).toBe('mid');
      expect(config.attacks.punch.level).toBe('high');
    }
  });
});

describe('attack level vs guard (real attacks, real geometry)', () => {
  const sweep = (f: number) => press({ down: true, kick: f === 0 });
  const kick = (f: number) => press({ kick: f === 0 });
  const lowJab = (f: number) => press({ down: true, punch: f === 0 });
  const punch = (f: number) => press({ punch: f === 0 });

  it('low (crouchKick) vs block -> HIT; vs crouchBlock -> BLOCK', () => {
    expect(contact(sim(fighterA, 110), sweep, STAND)).toEqual(['hit']);
    expect(contact(sim(fighterA, 110), sweep, CROUCH)).toEqual(['block']);
  });

  it('mid (kick, crouchPunch) is blocked by both guards', () => {
    for (const guard of [STAND, CROUCH]) {
      expect(contact(sim(), kick, guard)).toEqual(['block']);
      expect(contact(sim(), lowJab, guard)).toEqual(['block']);
    }
  });

  it('high (punch) is blocked standing; against a crouch guard it whiffs (geometry)', () => {
    expect(contact(sim(), punch, STAND)).toEqual(['block']);
    expect(contact(sim(), punch, CROUCH)).toEqual([]);
  });

  it('high that DOES touch a crouching guard is blocked by it', () => {
    // Same kick geometry (reaches crouchers), relabelled as high.
    const highKick = withLevel(fighterA, 'kick', 'high');
    expect(contact(sim(highKick), kick, CROUCH)).toEqual(['block']);
    expect(contact(sim(highKick), kick, STAND)).toEqual(['block']);
  });

  /** Neutral jump next to the defender; the air attack is thrown once low enough on the way down. */
  function jumpIn(button: 'punch' | 'kick', below: number, guard: Partial<InputState>) {
    const s = sim(fighterA, 60);
    const [player] = s.fighters;
    const height = () => partnerArena.groundY - player.position.y;
    let thrown = false;
    return contact(
      s,
      (f) => {
        const throwNow = !thrown && f > 0 && player.velocity.y > 0 && height() < below;
        if (throwNow) thrown = true;
        return press({ up: f === 0, [button]: throwNow });
      },
      guard,
    );
  }

  it('overhead (airKick) vs block -> BLOCK; vs crouchBlock -> HIT', () => {
    expect(jumpIn('kick', 150, STAND)).toEqual(['block']);
    expect(jumpIn('kick', 150, CROUCH)).toEqual(['hit']);
  });

  it('overhead (airPunch) vs block -> BLOCK; vs crouchBlock never BLOCK (hit when it reaches)', () => {
    expect(jumpIn('punch', 110, STAND)).toEqual(['block']);
    // Its chest-high hitbox only reaches a crouching body in a narrow window just before
    // landing (otherwise it passes over). Whenever it does touch, the low guard cannot stop it.
    const results = [110, 90, 80, 70, 60, 50, 40, 30].map((below) =>
      jumpIn('punch', below, CROUCH),
    );
    expect(results.flat()).not.toContain('block');
    expect(results.flat()).toContain('hit');
  });

  it('a special follows its level too (mid MINDHUB AGENT: both; a low special: crouching only)', () => {
    const fire = (f: number) => press({ special: f === 0 });
    const charged = (config: FighterConfig) => {
      const s = sim(config, 150);
      s.fighters[0].changeSpecialMeter(100);
      return s;
    };
    expect(contact(charged(filipe), fire, STAND)).toEqual(['block']);
    expect(contact(charged(filipe), fire, CROUCH)).toEqual(['block']);
    const lowAgent: FighterConfig = {
      ...filipe,
      specials: [{ ...filipe.specials[0]!, level: 'low' }],
    };
    expect(contact(charged(lowAgent), fire, STAND)).toEqual(['hit']); // wrong guard
    expect(contact(charged(lowAgent), fire, CROUCH)).toEqual(['block']);
  });
});

describe('CPU guard choice (reacts to attacks already started)', () => {
  // Reacts to every seen attack with the right posture; no attacks, retreats or pre-emptive
  // guard, so every guard input observed is a reaction.
  const PERFECT: AIProfile = {
    ...NORMAL_AI,
    blockChance: 1,
    guardReadChance: 1,
    aggression: 0,
    retreatChance: 0,
    guardChance: 0,
  };

  /** Player attacks; returns the CPU's guard inputs and the contact result. */
  function cpuDefends(p1: (f: number) => InputState, profile: AIProfile, distance: number) {
    const s = sim(fighterA, distance);
    const [player, cpu] = s.fighters;
    const ai = new AIController(profile, createRng(4));
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

  it('uses ↓ + D (crouchBlock) against a low', () => {
    const r = cpuDefends((f) => press({ down: true, kick: f === 0 }), PERFECT, 110);
    expect(r.guards.length).toBeGreaterThan(0);
    expect(r.guards.every((g) => g.down)).toBe(true);
    expect(r.types).toEqual(['block']);
  });

  it('uses standing D against an overhead (jump-in)', () => {
    const r = cpuDefends(
      (f) => press({ up: f === 0, right: f < 40, kick: f === 12 }),
      PERFECT,
      120,
    );
    expect(r.guards.length).toBeGreaterThan(0);
    expect(r.guards.every((g) => !g.down)).toBe(true);
    expect(r.types).toEqual(['block']);
  });

  it('a wrong read (guardReadChance 0) guards the other way and gets hit', () => {
    const r = cpuDefends(
      (f) => press({ down: true, kick: f === 0 }),
      { ...PERFECT, guardReadChance: 0 },
      110,
    );
    expect(r.guards.every((g) => !g.down)).toBe(true);
    expect(r.types).toEqual(['hit']);
  });

  it('never guards before the attack started + reactionFrames (no future reading)', () => {
    const s = sim(fighterA, 110);
    const [player, cpu] = s.fighters;
    const ai = new AIController(PERFECT, createRng(4));
    for (let f = 0; f < 30; f++) {
      const input = ai.getInput({ self: cpu, opponent: player });
      const attackFrame = player.activeAttack ? player.stateFrame : -1;
      if (input.block) expect(attackFrame).toBeGreaterThanOrEqual(PERFECT.reactionFrames);
      // The attack is pressed only at frame 10: nothing about it exists before.
      s.step([press({ down: true, kick: f === 10 }), input]);
    }
  });
});
