import { describe, expect, it } from 'vitest';
import { attackHits, hitStepAt } from '../src/core/fighter/attackFrames';
import { specialReach, specialWouldConnect } from '../src/core/fighter/specialMoves';
import { FightSimulation, type SimulationEvent } from '../src/core/FightSimulation';
import type { CombatEvent } from '../src/core/systems/CombatSystem';
import { combatSfx } from '../src/audio/combatSfx';
import { SFX } from '../src/config/audio';
import { amandaKonrad } from '../src/fighters/amandaKonrad';
import { fighterB } from '../src/fighters/fighterB';
import { gabriele } from '../src/fighters/gabriele';
import { SFX_ASSETS } from '../src/render/assets/audioAssets';
import { collectFighterAssets } from '../src/render/assets/fighterAssets';
import { partnerArena } from '../src/stages/partnerArena';
import { FAST_TIMING, idle, placeAtDistance, press } from './helpers';

const combo = amandaKonrad.specials[0]!;
const hits = attackHits(combo);

function fight(
  distance: number,
  options: {
    guard?: boolean;
    meter?: number;
    defender?: (f: number) => ReturnType<typeof idle>;
  } = {},
) {
  const sim = new FightSimulation({
    fighters: [amandaKonrad, fighterB],
    stage: partnerArena,
    roundTiming: FAST_TIMING,
  });
  sim.step([idle(), idle()]);
  placeAtDistance(sim, distance);
  sim.fighters[0].changeSpecialMeter(options.meter ?? combo.meterCost);
  const events: { frame: number; event: SimulationEvent }[] = [];
  for (let f = 0; f < 110; f++) {
    const defender = options.defender?.(f) ?? press({ block: options.guard ?? false });
    for (const event of sim.step([press({ special: f === 0 }), defender])) {
      events.push({ frame: f, event });
    }
  }
  const contacts = events
    .map((e) => e.event)
    .filter((e): e is CombatEvent => e.type === 'hit' || e.type === 'block' || e.type === 'koHit');
  return { sim, events, contacts };
}

describe('Amanda Konrad: POWER COMBO', () => {
  it('is a ground-only mid special: 40 meter, POWERZAP x2 then POWERBOT, 20 damage in all', () => {
    expect(combo).toMatchObject({
      id: 'amanda-konrad.powerCombo',
      displayName: 'POWER COMBO',
      level: 'mid',
      meterCost: 40,
      groundOnly: true,
      startupFrames: 14,
      recoveryFrames: 26,
    });
    expect(hits.map((h) => h.damage)).toEqual([4, 4, 12]);
    expect(hits.reduce((sum, h) => sum + h.damage, 0)).toBe(20);
    expect(hits.map((h) => h.chipDamage)).toEqual([1, 1, 1]);
    // The finisher hits harder and freezes longer than the messages.
    expect(hits[2]!.hitstopFrames).toBeGreaterThan(hits[0]!.hitstopFrames);
    expect(amandaKonrad.assets.specialEffects?.[combo.id]).toMatchObject({
      style: 'powerCombo',
      label: 'POWER COMBO',
      sound: 'special-powerzap',
      hitLabels: ['POWERZAP', 'POWERZAP', 'POWERBOT'],
      hitSounds: ['special-hit', 'special-hit', 'special-powerbot'],
    });
    expect(amandaKonrad.assets.sprite?.animations.special?.frames).toEqual([39, 15, 16]);
  });

  it('steps open in order inside the active window', () => {
    const start = combo.startupFrames;
    expect(hitStepAt(combo, start - 1)).toBe(-1);
    expect(hitStepAt(combo, start)).toBe(0);
    expect(hitStepAt(combo, start + 6)).toBe(1);
    expect(hitStepAt(combo, start + 14)).toBe(2);
    expect(hitStepAt(combo, start + combo.activeFrames)).toBe(-1);
  });

  it('cannot start without meter, and spends it when it does', () => {
    const broke = fight(150, { meter: combo.meterCost - 1 });
    expect(broke.events.some((e) => e.event.type === 'specialStart')).toBe(false);
    expect(broke.sim.fighters[1].health).toBe(broke.sim.fighters[1].maxHealth);
    const paid = fight(150);
    expect(paid.events.filter((e) => e.event.type === 'specialStart')).toHaveLength(1);
    expect(paid.sim.fighters[0].specialMeter).toBe(0);
  });

  it('POWERZAP lands twice, then POWERBOT: one combo, 20 damage', () => {
    const { sim, events, contacts } = fight(150);
    const hitEvents = events.filter((e) => e.event.type === 'hit');
    expect(contacts.map((c) => [c.type, c.hitIndex, c.hitCount])).toEqual([
      ['hit', 0, 3],
      ['hit', 1, 3],
      ['hit', 2, 3],
    ]);
    // In order, POWERBOT last.
    const frames = hitEvents.map((e) => e.frame);
    expect(frames).toEqual([...frames].sort((a, b) => a - b));
    expect(sim.fighters[1].health).toBe(sim.fighters[1].maxHealth - 20);
    // A true combo: the rival never got out of hitstun between the hits.
    expect(contacts.every((c) => c.attack.id === combo.id)).toBe(true);
  });

  it('blocked: only the chip of each hit (3 in all), and still punishable', () => {
    const { sim, contacts } = fight(150, { guard: true });
    expect(contacts.map((c) => c.type)).toEqual(['block', 'block', 'block']);
    expect(sim.fighters[1].health).toBe(sim.fighters[1].maxHealth - 3);
    // Recovery after the finisher outlasts its blockstun.
    const afterFinisher = combo.activeFrames - 14 + combo.recoveryFrames;
    expect(afterFinisher).toBeGreaterThan(hits[2]!.blockstunFrames);
  });

  it('respects its reach: whiffs from far away, hits up to ~260 px', () => {
    expect(specialReach(combo)).toBe(260);
    const far = fight(380);
    expect(far.contacts).toHaveLength(0);
    expect(far.sim.fighters[1].health).toBe(far.sim.fighters[1].maxHealth);
    // Out of the messages' reach, only POWERBOT connects.
    const long = fight(270);
    expect(long.contacts.map((c) => c.hitIndex)).toEqual([2]);
    expect(long.sim.fighters[1].health).toBe(long.sim.fighters[1].maxHealth - 12);
  });

  it('can be jumped over: a rival in the air at the right time takes nothing', () => {
    // The rival jumps on reading the startup (14 frames): over the messages, and still high
    // when the scan fires. Jumping too early lands into POWERBOT.
    const { contacts } = fight(150, { defender: (f) => press({ up: f === 6 }) });
    expect(contacts).toHaveLength(0);
  });

  it('AI reach checks see every step (the far finisher counts)', () => {
    const origin = { x: 300, y: partnerArena.groundY };
    const target = { x: 300 + 240, y: partnerArena.groundY - 170, width: 40, height: 170 };
    expect(specialWouldConnect(combo, origin, 1, target)).toBe(true);
    expect(specialWouldConnect(combo, origin, 1, { ...target, x: 300 + 300 })).toBe(false);
  });

  it('each step sounds its own impact; normal single-hit specials are unchanged', () => {
    const { contacts, sim } = fight(150);
    expect(contacts.map((c) => combatSfx(c, sim.fighters)[0])).toEqual([
      'special-hit',
      'special-hit',
      'special-powerbot',
    ]);
    const police = fight(150).contacts[0]!;
    expect(police.hitCount).toBe(3);
    // A single-hit special: one contact, step 0 of 1.
    const sim2 = new FightSimulation({
      fighters: [gabriele, fighterB],
      stage: partnerArena,
      roundTiming: FAST_TIMING,
    });
    sim2.step([idle(), idle()]);
    placeAtDistance(sim2, 150);
    sim2.fighters[0].changeSpecialMeter(40);
    const single: CombatEvent[] = [];
    for (let f = 0; f < 80; f++) {
      for (const e of sim2.step([press({ special: f === 0 }), idle()])) {
        if (e.type === 'hit') single.push(e);
      }
    }
    expect(single.map((e) => [e.hitIndex, e.hitCount])).toEqual([[0, 1]]);
  });

  it('first use loads nothing: its sounds are boot SFX and the VFX needs no image', () => {
    const bootKeys = new Set(SFX_ASSETS.map((a) => a.key));
    for (const id of ['special-powerzap', 'special-hit', 'special-powerbot'] as const) {
      expect(SFX[id]).toBeDefined();
      expect([...bootKeys].some((key) => key.endsWith(id))).toBe(true);
    }
    const effect = amandaKonrad.assets.specialEffects?.[combo.id];
    expect(effect?.emblem).toBeUndefined();
    expect(effect?.glyph).toBeUndefined();
    // Nothing of hers depends on a VFX texture.
    expect(collectFighterAssets([amandaKonrad]).some((a) => a.path.startsWith('vfx/'))).toBe(false);
  });

  it('a KO mid-combo ends it there: the round ends normally, no hit on the fallen rival', () => {
    const sim = new FightSimulation({
      fighters: [amandaKonrad, fighterB],
      stage: partnerArena,
      roundTiming: FAST_TIMING,
    });
    sim.step([idle(), idle()]);
    placeAtDistance(sim, 150);
    sim.fighters[0].changeSpecialMeter(combo.meterCost);
    sim.fighters[1].health = 6;
    const types: string[] = [];
    for (let f = 0; f < 200; f++) {
      for (const e of sim.step([press({ special: f === 0 }), idle()])) {
        types.push(e.type === 'hit' || e.type === 'koHit' ? `${e.type}:${e.hitIndex}` : e.type);
      }
    }
    expect(types.filter((t) => /^(hit|koHit):/.test(t))).toEqual(['hit:0', 'koHit:1']);
    expect(types).toContain('ko');
    expect(types.filter((t) => t === 'ko')).toHaveLength(1);
    expect(types).toContain('roundOver');
  });

  it('deterministic: the same inputs give the same fight', () => {
    const run = () => {
      const { events, sim } = fight(170);
      return JSON.stringify([
        events.map((e) => `${e.frame}:${e.event.type}`),
        sim.fighters.map((f) => [f.health, f.position.x, f.specialMeter]),
      ]);
    };
    expect(run()).toBe(run());
  });
});
