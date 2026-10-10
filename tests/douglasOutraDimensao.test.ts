import { describe, expect, it } from 'vitest';
import { attackHits, hitStepAt } from '../src/core/fighter/attackFrames';
import { specialReach } from '../src/core/fighter/specialMoves';
import { FightSimulation, type SimulationEvent } from '../src/core/FightSimulation';
import type { CombatEvent } from '../src/core/systems/CombatSystem';
import { combatSfx } from '../src/audio/combatSfx';
import { SFX } from '../src/config/audio';
import { douglas } from '../src/fighters/douglas';
import { fighterB } from '../src/fighters/fighterB';
import { SFX_ASSETS } from '../src/render/assets/audioAssets';
import { collectFighterAssets } from '../src/render/assets/fighterAssets';
import { partnerArena } from '../src/stages/partnerArena';
import type { InputState } from '../src/types/input';
import { FAST_TIMING, idle, placeAtDistance, press } from './helpers';

const move = douglas.specials[0]!;
const hits = attackHits(move);

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
    fighters: [douglas, fighterB],
    stage: partnerArena,
    roundTiming: FAST_TIMING,
  });
  sim.step([idle(), idle()]);
  placeAtDistance(sim, distance);
  sim.fighters[0].changeSpecialMeter(options.meter ?? move.meterCost);
  if (options.health !== undefined) sim.fighters[1].health = options.health;
  const events: { frame: number; event: SimulationEvent; hitstop: boolean }[] = [];
  for (let f = 0; f < 140; f++) {
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

describe('Douglas: OUTRA DIMENSÃO', () => {
  it('is a ground-only mid special: 40 meter, pull + collapse, 22 damage in all', () => {
    expect(move).toMatchObject({
      id: 'douglas.outraDimensao',
      displayName: 'OUTRA DIMENSÃO',
      level: 'mid',
      meterCost: 40,
      groundOnly: true,
      startupFrames: 16,
      activeFrames: 8,
      recoveryFrames: 28,
    });
    expect(hits.map((h) => h.damage)).toEqual([6, 16]);
    expect(hits.map((h) => h.chipDamage)).toEqual([1, 2]);
    // The collapse is the strong one: long freeze, strong stun, real push back.
    expect(hits[1]).toMatchObject({ hitstopFrames: 13, hitstunFrames: 26, blockstunFrames: 16 });
    expect(douglas.assets.specialEffects?.[move.id]).toEqual({
      style: 'dimensionRift',
      label: 'OUTRA DIMENSÃO',
      sound: 'special-dimension',
      hitSounds: ['special-hit', 'special-dimension-impact'],
    });
    expect(douglas.assets.sprite?.animations.special?.frames).toEqual([14, 15, 16]);
  });

  it('the rift opens at frame 16, the collapse 6 frames later', () => {
    expect(hitStepAt(move, move.startupFrames - 1)).toBe(-1);
    expect(hitStepAt(move, move.startupFrames)).toBe(0);
    expect(hitStepAt(move, move.startupFrames + 6)).toBe(1);
  });

  it('cannot start without meter; with it, it starts and spends the cost', () => {
    const broke = fight(150, { meter: move.meterCost - 1 });
    expect(broke.events.some((e) => e.event.type === 'specialStart')).toBe(false);
    const paid = fight(150);
    expect(paid.events.filter((e) => e.event.type === 'specialStart')).toHaveLength(1);
    expect(paid.sim.fighters[0].specialMeter).toBe(0);
  });

  it('hits: pull then collapse, one combo, 22 damage, with the strong final hitstop', () => {
    const { sim, contacts, events } = fight(150);
    expect(contacts.map((c) => [c.type, c.hitIndex, c.hitCount])).toEqual([
      ['hit', 0, 2],
      ['hit', 1, 2],
    ]);
    expect(sim.fighters[1].health).toBe(sim.fighters[1].maxHealth - 22);
    // The collapse freezes the fight (13 frames).
    const collapse = events.find(
      (e) => e.event.type === 'hit' && (e.event as CombatEvent).hitIndex === 1,
    );
    expect(collapse?.hitstop).toBe(true);
  });

  it('blocked: only chip (3 in all), and punishable', () => {
    const { sim, contacts } = fight(150, { guard: true });
    expect(contacts.map((c) => c.type)).toEqual(['block', 'block']);
    expect(sim.fighters[1].health).toBe(sim.fighters[1].maxHealth - 3);
    expect(move.activeFrames - 6 + move.recoveryFrames).toBeGreaterThan(hits[1]!.blockstunFrames);
  });

  it('medium reach: misses from far away', () => {
    expect(specialReach(move)).toBe(210);
    const far = fight(330);
    expect(far.contacts).toHaveLength(0);
    expect(far.sim.fighters[1].health).toBe(far.sim.fighters[1].maxHealth);
  });

  it('a well-timed jump escapes it', () => {
    const { contacts } = fight(150, { defender: (f) => press({ up: f === 6 }) });
    expect(contacts).toHaveLength(0);
  });

  it('a KO with the special ends the round normally', () => {
    const types: string[] = [];
    const { events } = fight(150, { health: 10 });
    for (const e of events) types.push(e.event.type);
    expect(types).toContain('koHit');
    expect(types.filter((t) => t === 'ko')).toHaveLength(1);
    expect(types).toContain('roundOver');
  });

  it('sounds: its own start, a special hit and the cosmic collapse', () => {
    const { contacts, sim } = fight(150);
    expect(contacts.map((c) => combatSfx(c, sim.fighters)[0])).toEqual([
      'special-hit',
      'special-dimension-impact',
    ]);
  });

  it('first use loads nothing: boot SFX and a fully procedural VFX', () => {
    const bootKeys = SFX_ASSETS.map((a) => a.key);
    for (const id of ['special-dimension', 'special-dimension-impact', 'special-hit'] as const) {
      expect(SFX[id]).toBeDefined();
      expect(bootKeys.some((key) => key.endsWith(id))).toBe(true);
    }
    const effect = douglas.assets.specialEffects?.[move.id];
    expect(effect?.emblem).toBeUndefined();
    expect(effect?.glyph).toBeUndefined();
    expect(collectFighterAssets([douglas]).some((a) => a.path.startsWith('vfx/'))).toBe(false);
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
