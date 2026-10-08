import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FightSimulation, type SimulationEvent } from '../src/core/FightSimulation';
import { fighterB } from '../src/fighters/fighterB';
import { isaqueFerreira } from '../src/fighters/isaqueFerreira';
import { joaoGuiotti } from '../src/fighters/joaoGuiotti';
import { romualdo } from '../src/fighters/romualdo';
import { aislan } from '../src/fighters/aislan';
import { partnerArena } from '../src/stages/partnerArena';
import type { FighterConfig } from '../src/types/fighter';
import type { InputState } from '../src/types/input';
import { FAST_TIMING, idle, placeAtDistance, press, stepFrames } from './helpers';

const FIGHTERS = [
  [joaoGuiotti, 'ALAIO VIBECODE!', 'vibeCode', 'vfx/vibecode-emblem.png', 'special-vibe'],
  [isaqueFerreira, 'ALAIO VIBECODE!', 'vibeCode', 'vfx/vibecode-emblem.png', 'special-vibe'],
  [romualdo, 'GPTMAKER!', 'agentBuilder', 'vfx/gptmaker-emblem.png', 'special-gpt'],
  [aislan, 'FLUIDZ!', 'liquidFlow', 'vfx/fluidz-emblem.png', 'special-fluidz'],
] as const;

const reach = (box: { x: number; width: number }) => box.x + box.width;

function setup(config: FighterConfig, distance: number): FightSimulation {
  const sim = new FightSimulation({
    fighters: [config, fighterB],
    stage: partnerArena,
    roundTiming: FAST_TIMING,
  });
  stepFrames(sim, 1);
  placeAtDistance(sim, distance);
  return sim;
}

function run(sim: FightSimulation, frames: number, p1: (f: number) => InputState, p2 = idle) {
  const events: SimulationEvent[] = [];
  for (let f = 0; f < frames; f++) events.push(...sim.step([p1(f), p2()]));
  return events;
}

describe.each(FIGHTERS)('%s special', (config, name, style, emblem, sound) => {
  const move = config.specials[0]!;
  /** Just beyond the kick, well inside the special. */
  const distance = reach(config.attacks.kick.hitbox) + 40;

  it(`is ${name}: ground-only mid special with its own VFX, emblem and sound`, () => {
    expect(config.specials).toHaveLength(1);
    expect(move).toMatchObject({
      displayName: name,
      state: 'special',
      level: 'mid',
      groundOnly: true,
    });
    expect(move.id.startsWith(`${config.id}.`)).toBe(true);
    expect(config.assets.specialEffects?.[move.id]).toMatchObject({
      style,
      label: name,
      emblem,
      sound,
    });
    expect(existsSync(join(__dirname, '..', 'public', emblem))).toBe(true);
    expect(config.assets.sprite?.animations.special).toBeDefined();
  });

  it('reaches past the normals but nowhere near the whole screen', () => {
    const normals = Object.values(config.attacks).map((a) => reach(a.hitbox));
    expect(reach(move.hitbox)).toBeGreaterThan(Math.max(...normals) * 1.4);
    expect(reach(move.hitbox)).toBeLessThan(partnerArena.width / 4);
    expect(distance).toBeLessThan(reach(move.hitbox));
  });

  it('pays its cost on startup and hits once beyond the kick for its damage', () => {
    const sim = setup(config, distance);
    const [a, b] = sim.fighters;
    a.changeSpecialMeter(move.meterCost);
    const events = run(sim, 90, (f) => press({ special: f === 0 }));
    expect(events.filter((e) => e.type === 'specialStart')).toHaveLength(1);
    expect(events.filter((e) => e.type === 'hit')).toHaveLength(1);
    expect(a.specialMeter).toBe(0);
    expect(b.health).toBe(b.maxHealth - move.damage);

    const kick = run(setup(config, distance), 40, (f) => press({ kick: f === 0 }));
    expect(kick.some((e) => e.type === 'hit')).toBe(false);
  });

  it('does nothing without enough meter', () => {
    const sim = setup(config, distance);
    sim.fighters[0].changeSpecialMeter(move.meterCost - 1);
    const events = run(sim, 40, (f) => press({ special: f === 0 }));
    expect(events.some((e) => e.type === 'specialStart')).toBe(false);
  });

  it('blocked: chip damage only, and the caster is left punishable', () => {
    const sim = setup(config, distance);
    const [a, b] = sim.fighters;
    a.changeSpecialMeter(move.meterCost);
    const events = run(
      sim,
      90,
      (f) => press({ special: f === 0 }),
      () => press({ block: true }),
    );
    expect(events.filter((e) => e.type === 'block')).toHaveLength(1);
    expect(b.health).toBe(b.maxHealth - move.chipDamage);
    expect(move.recoveryFrames).toBeGreaterThan(move.blockstunFrames);
  });
});

describe('ALAIO VIBECODE! and GPTMAKER! balance', () => {
  it('João and Isaque share the same move data under their own ids', () => {
    const { id: joaoId, ...joao } = joaoGuiotti.specials[0]!;
    const { id: isaqueId, ...isaque } = isaqueFerreira.specials[0]!;
    expect(joaoId).not.toBe(isaqueId);
    expect(joao).toEqual(isaque);
  });

  it('GPTMAKER! is the heavy one: more damage and cost, slower and more punishable', () => {
    const vibe = joaoGuiotti.specials[0]!;
    const gpt = romualdo.specials[0]!;
    expect(gpt.damage).toBeGreaterThan(vibe.damage);
    expect(gpt.meterCost).toBeGreaterThan(vibe.meterCost);
    expect(gpt.startupFrames).toBeGreaterThan(vibe.startupFrames);
    expect(gpt.recoveryFrames - gpt.blockstunFrames).toBeGreaterThan(
      vibe.recoveryFrames - vibe.blockstunFrames,
    );
  });
});
