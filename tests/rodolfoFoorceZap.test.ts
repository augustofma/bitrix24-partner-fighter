import { describe, expect, it } from 'vitest';
import { specialReach } from '../src/core/fighter/specialMoves';
import { FightSimulation, type SimulationEvent } from '../src/core/FightSimulation';
import type { CombatEvent } from '../src/core/systems/CombatSystem';
import { combatSfx } from '../src/audio/combatSfx';
import { SFX } from '../src/config/audio';
import { rodolfo } from '../src/fighters/rodolfo';
import { fighterB } from '../src/fighters/fighterB';
import { SFX_ASSETS } from '../src/render/assets/audioAssets';
import { collectFighterAssets } from '../src/render/assets/fighterAssets';
import { partnerArena } from '../src/stages/partnerArena';
import type { InputState } from '../src/types/input';
import { FAST_TIMING, idle, placeAtDistance, press } from './helpers';

const move = rodolfo.specials[0]!;

function fight(
  distance: number,
  options: {
    guard?: boolean;
    meter?: number;
    defender?: (f: number) => InputState;
    health?: number;
  } = {},
) {
  const sim = new FightSimulation({
    fighters: [rodolfo, fighterB],
    stage: partnerArena,
    roundTiming: FAST_TIMING,
  });
  sim.step([idle(), idle()]);
  placeAtDistance(sim, distance);
  sim.fighters[0].changeSpecialMeter(options.meter ?? move.meterCost);
  if (options.health !== undefined) sim.fighters[1].health = options.health;
  const events: { frame: number; event: SimulationEvent; hitstop: boolean }[] = [];
  for (let f = 0; f < 120; f++) {
    const defender = options.defender?.(f) ?? press({ block: options.guard ?? false });
    for (const event of sim.step([press({ special: f === 0 }), defender])) {
      events.push({ frame: f, event, hitstop: sim.isInHitstop });
    }
  }
  const contacts = events
    .map((e) => e.event)
    .filter((e): e is CombatEvent => e.type === 'hit' || e.type === 'block' || e.type === 'koHit');
  return { sim, events, contacts };
}

describe('Rodolfo: FOORCE ZAP', () => {
  it('is a ground-only mid dash punch: 35 meter, 19 damage, one strong contact', () => {
    expect(move).toMatchObject({
      id: 'rodolfo.foorceZap',
      displayName: 'FOORCE ZAP',
      level: 'mid',
      meterCost: 35,
      groundOnly: true,
      advanceSpeed: 7,
      damage: 19,
      chipDamage: 2,
      startupFrames: 12,
      activeFrames: 6,
      recoveryFrames: 24,
      hitstopFrames: 12,
    });
    expect(move.hits).toBeUndefined();
    expect(rodolfo.assets.specialEffects?.[move.id]).toEqual({
      style: 'forceZap',
      label: 'FOORCE ZAP',
      sound: 'special-foorce-zap',
    });
    expect(rodolfo.assets.sprite?.animations.special?.frames).toEqual([39, 15, 16]);
  });

  it('cannot start without meter; with it, it starts and spends the cost', () => {
    const broke = fight(150, { meter: move.meterCost - 1 });
    expect(broke.events.some((e) => e.event.type === 'specialStart')).toBe(false);
    const paid = fight(150);
    expect(paid.events.filter((e) => e.event.type === 'specialStart')).toHaveLength(1);
    expect(paid.sim.fighters[0].specialMeter).toBe(0);
  });

  it('hits once for 19 with the strong hitstop', () => {
    const { sim, contacts, events } = fight(150);
    expect(contacts.map((c) => c.type)).toEqual(['hit']);
    expect(sim.fighters[1].health).toBe(sim.fighters[1].maxHealth - 19);
    expect(events.find((e) => e.event.type === 'hit')?.hitstop).toBe(true);
  });

  it('blocked: only chip, and punishable', () => {
    const { sim, contacts } = fight(150, { guard: true });
    expect(contacts.map((c) => c.type)).toEqual(['block']);
    expect(sim.fighters[1].health).toBe(sim.fighters[1].maxHealth - 2);
    expect(move.recoveryFrames).toBeGreaterThan(move.blockstunFrames);
  });

  it('medium reach thanks to the dash: misses from far away', () => {
    expect(specialReach(move)).toBe(224);
    const far = fight(340);
    expect(far.contacts).toHaveLength(0);
    expect(far.sim.fighters[1].health).toBe(far.sim.fighters[1].maxHealth);
  });

  it('a jump read early escapes it; once the dash is on its way, it is too late', () => {
    const early = fight(150, { defender: (f) => press({ up: f === 1 }) });
    expect(early.contacts).toHaveLength(0);
    const late = fight(150, { defender: (f) => press({ up: f === 6 }) });
    expect(late.contacts.map((c) => c.type)).toEqual(['hit']);
  });

  it('a KO with the special ends the round normally', () => {
    const { events } = fight(150, { health: 10 });
    const types = events.map((e) => e.event.type);
    expect(types).toContain('koHit');
    expect(types.filter((t) => t === 'ko')).toHaveLength(1);
    expect(types).toContain('roundOver');
  });

  it('sounds: its own start and the special impact', () => {
    const { contacts, sim } = fight(150);
    expect(contacts.map((c) => combatSfx(c, sim.fighters)[0])).toEqual(['special-hit']);
  });

  it('first use loads nothing: boot SFX and a fully procedural VFX', () => {
    const bootKeys = SFX_ASSETS.map((a) => a.key);
    for (const id of ['special-foorce-zap', 'special-hit'] as const) {
      expect(SFX[id]).toBeDefined();
      expect(bootKeys.some((key) => key.endsWith(id))).toBe(true);
    }
    const effect = rodolfo.assets.specialEffects?.[move.id];
    expect(effect?.emblem).toBeUndefined();
    expect(effect?.glyph).toBeUndefined();
    expect(collectFighterAssets([rodolfo]).some((a) => a.path.startsWith('vfx/'))).toBe(false);
  });

  it('deterministic: the same inputs give the same fight', () => {
    const run = () => {
      const { events, sim } = fight(160);
      return JSON.stringify([
        events.map((e) => `${e.frame}:${e.event.type}`),
        sim.fighters.map((f) => [f.health, f.position.x, f.specialMeter]),
      ]);
    };
    expect(run()).toBe(run());
  });
});
