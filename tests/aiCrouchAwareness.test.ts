import { describe, expect, it } from 'vitest';
import { AIController } from '../src/controllers/AIController';
import { NORMAL_AI, type AIProfile } from '../src/controllers/aiProfiles';
import { isLowPosture } from '../src/core/fighter/fighterStates';
import type { FightSimulation } from '../src/core/FightSimulation';
import type { CombatEvent } from '../src/core/systems/CombatSystem';
import { createRng } from '../src/core/random';
import { FIGHTER_STATES, type FighterStateId } from '../src/types/fighter';
import type { InputState } from '../src/types/input';
import { createFightingSim, idle, placeAtDistance, press, stepFrames } from './helpers';

/** Always attacks when possible, never blocks/retreats/jumps: isolates the attack choice. */
const DECISIVE: AIProfile = {
  ...NORMAL_AI,
  aggression: 1,
  blockChance: 0,
  retreatChance: 0,
  guardChance: 0,
  jumpInChance: 0,
  lowPostureAwareness: 1,
};
const only = (slot: keyof AIProfile['lowPostureAttackWeights']): AIProfile => ({
  ...DECISIVE,
  lowPostureAttackWeights: { punch: 0, kick: 0, crouchPunch: 0, crouchKick: 0, [slot]: 1 },
});

/** Player (index 0) holds `pose` for a few frames so its state settles. */
function playerHolds(sim: FightSimulation, pose: Partial<InputState>): void {
  stepFrames(sim, 3, press(pose));
}

/** The CPU's input on its next decision (fresh controller => decides immediately). */
function firstInput(sim: FightSimulation, profile: AIProfile, seed = 1): InputState {
  const [player, cpu] = sim.fighters;
  return new AIController(profile, createRng(seed)).getInput({ self: cpu, opponent: player });
}

/** Runs the CPU against a player holding `pose`, counting the CPU's attack starts by state. */
function cpuAttacksAgainst(
  pose: Partial<InputState>,
  profile: AIProfile,
  seed: number,
  frames = 600,
  distance = 90,
) {
  const sim = createFightingSim();
  placeAtDistance(sim, distance);
  const [player, cpu] = sim.fighters;
  playerHolds(sim, pose); // the CPU's first decision already sees the settled posture
  const ai = new AIController(profile, createRng(seed));
  const starts = new Map<FighterStateId, number>();
  const events = [];
  let previous: FighterStateId = cpu.state;
  for (let i = 0; i < frames; i++) {
    events.push(...sim.step([press(pose), ai.getInput({ self: cpu, opponent: player })]));
    if (cpu.activeAttack && cpu.state !== previous) {
      starts.set(cpu.state, (starts.get(cpu.state) ?? 0) + 1);
    }
    previous = cpu.state;
  }
  return { starts, events, player, cpu };
}

describe('isLowPosture', () => {
  it('crouch, crouchBlock, crouchPunch and crouchKick are low; nothing else is', () => {
    const low = FIGHTER_STATES.filter(isLowPosture);
    expect(low.sort()).toEqual(['crouch', 'crouchBlock', 'crouchKick', 'crouchPunch'].sort());
  });
});

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

describe('AI attack choice vs posture', () => {
  it('1. still punches a standing opponent up close', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 80);
    expect(firstInput(sim, DECISIVE)).toMatchObject({ punch: true, down: false });
  });

  it('2 + 7. crouchPunch against a crouching opponent is sent as ↓ + A', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 80);
    playerHolds(sim, { down: true });
    expect(firstInput(sim, only('crouchPunch'))).toMatchObject({ punch: true, down: true });
  });

  it('3 + 8. crouchKick against a crouching opponent is sent as ↓ + S', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 120);
    playerHolds(sim, { down: true });
    expect(firstInput(sim, only('crouchKick'))).toMatchObject({ kick: true, down: true });
  });

  it('5. never picks an attack that would not reach (crouchPunch from mid range)', () => {
    const balanced = {
      ...DECISIVE,
      lowPostureAttackWeights: { punch: 1, kick: 1, crouchPunch: 1, crouchKick: 1 },
    };
    for (let seed = 1; seed <= 60; seed++) {
      const sim = createFightingSim();
      placeAtDistance(sim, 125); // beyond crouchPunch reach, inside crouchKick / kick reach
      playerHolds(sim, { down: true });
      const input = firstInput(sim, balanced, seed);
      expect(input.punch, `seed ${seed}`).toBe(false); // neither punch (high) nor crouchPunch
      expect(input.kick).toBe(true);
    }
  });

  it('6. approaches when no suitable attack reaches', () => {
    // In attack range of the sweep, but the profile only wants the short jab: walk in instead.
    const sim = createFightingSim();
    placeAtDistance(sim, 125);
    playerHolds(sim, { down: true });
    const input = firstInput(sim, only('crouchPunch'));
    expect(input).toMatchObject({ left: true, punch: false, kick: false });

    // Out of range of everything: approach (no jump with jumpInChance 0).
    const far = createFightingSim();
    placeAtDistance(far, 300);
    playerHolds(far, { down: true });
    expect(firstInput(far, DECISIVE)).toMatchObject({ left: true, punch: false, kick: false });
  });

  it('4. against a player holding ↓ the CPU almost never throws the useless standing punch', () => {
    let punches = 0;
    let lowHits = 0;
    let attacks = 0;
    for (const seed of SEEDS) {
      const { starts } = cpuAttacksAgainst({ down: true }, NORMAL_AI, seed);
      punches += starts.get('punch') ?? 0;
      lowHits += (starts.get('crouchPunch') ?? 0) + (starts.get('crouchKick') ?? 0);
      for (const n of starts.values()) attacks += n;
    }
    expect(attacks).toBeGreaterThan(10);
    expect(lowHits).toBeGreaterThan(punches * 3);
    expect(punches / attacks).toBeLessThan(0.2);

    // Control: with awareness off, the same situation produces many whiffing punches.
    let unawarePunches = 0;
    for (const seed of SEEDS) {
      const { starts } = cpuAttacksAgainst(
        { down: true },
        { ...NORMAL_AI, lowPostureAwareness: 0 },
        seed,
      );
      unawarePunches += starts.get('punch') ?? 0;
    }
    expect(unawarePunches).toBeGreaterThan(punches * 2);
  });

  it('uses varied low attacks (not only the sweep)', () => {
    const { starts } = cpuAttacksAgainst({ down: true }, NORMAL_AI, 11, 1500);
    expect(starts.get('crouchPunch') ?? 0).toBeGreaterThan(0);
    expect(starts.get('crouchKick') ?? 0).toBeGreaterThan(0);
  });

  it('a player crouching next to the CPU for several seconds gets hit by a fitting attack', () => {
    const { events, player } = cpuAttacksAgainst({ down: true }, NORMAL_AI, 7, 5 * 60);
    const cpuHits = events.filter(
      (e): e is CombatEvent => e.type === 'hit' && e.attackerIndex === 1,
    );
    expect(cpuHits.length).toBeGreaterThan(0);
    expect(player.health).toBeLessThan(player.maxHealth);
    for (const hit of cpuHits) expect(hit.attack.level).not.toBe('high');
  });

  it('keeps pressuring a player holding ↓ + D as much as a standing guard, with attacks that connect', () => {
    const pressure = (pose: Partial<InputState>) => {
      let attacks = 0;
      let blocked = 0;
      for (const seed of SEEDS) {
        const { starts, events, player } = cpuAttacksAgainst(pose, NORMAL_AI, seed);
        for (const n of starts.values()) attacks += n;
        blocked += events.filter((e) => e.type === 'block' && e.attackerIndex === 1).length;
        expect(player.isBlocking).toBe(true);
      }
      return { attacks, blocked };
    };
    const low = pressure({ down: true, block: true });
    const high = pressure({ block: true });
    // Same attack rate as against a standing guard...
    expect(low.attacks).toBeGreaterThanOrEqual(high.attacks * 0.8);
    // ...and most of them actually reach the low guard (only "unaware" punches pass over).
    expect(low.blocked / low.attacks).toBeGreaterThan(0.7);
  });

  it('rapidly alternating crouch / stand does not neutralise the CPU', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 90);
    const [player, cpu] = sim.fighters;
    const ai = new AIController(NORMAL_AI, createRng(21));
    for (let i = 0; i < 600; i++) {
      const pose = Math.floor(i / 10) % 2 === 0 ? press({ down: true }) : idle();
      sim.step([pose, ai.getInput({ self: cpu, opponent: player })]);
    }
    expect(player.health).toBeLessThan(player.maxHealth);
  });

  it('9. jump-in still works against a crouching opponent', () => {
    const profile = { ...NORMAL_AI, jumpInChance: 1, jumpInAttackChance: 1 };
    const { starts } = cpuAttacksAgainst({ down: true }, profile, 5, 120, 260);
    expect(starts.get('airKick') ?? 0).toBeGreaterThan(0);
  });

  it('10. deterministic: same seed, same fight', () => {
    const trace = () => {
      const sim = createFightingSim();
      placeAtDistance(sim, 100);
      const [player, cpu] = sim.fighters;
      const ai = new AIController(NORMAL_AI, createRng(99));
      const out: string[] = [];
      for (let i = 0; i < 900; i++) {
        const pose = i % 47 < 30 ? press({ down: true }) : idle();
        sim.step([pose, ai.getInput({ self: cpu, opponent: player })]);
        out.push(`${cpu.state}:${cpu.position.x}:${player.health}`);
      }
      return out;
    };
    expect(trace()).toEqual(trace());
  });

  it('11. the AI has no character-specific code', () => {
    // Raw sources of every controller file (Vite feature, no Node APIs needed).
    const sources = import.meta.glob<string>('../src/controllers/*.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    });
    expect(Object.keys(sources).length).toBeGreaterThan(0);
    for (const [file, source] of Object.entries(sources)) {
      expect(source, file).not.toMatch(/fighter-[a-z]|FIGHTER_[A-Z]|fighter[AB]\b|augusto/i);
    }
  });
});
