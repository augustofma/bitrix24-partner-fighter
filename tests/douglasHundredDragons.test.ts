import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { attackHits, hitStepAt } from '../src/core/fighter/attackFrames';
import { specialReach } from '../src/core/fighter/specialMoves';
import { FightSimulation, type SimulationEvent } from '../src/core/FightSimulation';
import type { CombatEvent } from '../src/core/systems/CombatSystem';
import { combatSfx } from '../src/audio/combatSfx';
import { SFX } from '../src/config/audio';
import { STRINGS } from '../src/config/strings';
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
    /** Frames run before Douglas presses the special (to let a defender act first). */
    lead?: number;
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
  for (let f = -(options.lead ?? 0); f < 150; f++) {
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

describe('Douglas: CÓLERA DOS 100 DRAGÕES', () => {
  it('replaces OUTRA DIMENSÃO: one special, the new name, no trace of the old one', () => {
    expect(douglas.specials).toHaveLength(1);
    expect(move).toMatchObject({
      id: 'douglas.hundredDragons',
      displayName: 'CÓLERA DOS 100 DRAGÕES',
      level: 'mid',
      meterCost: 40,
      groundOnly: true,
      startupFrames: 16,
      activeFrames: 22,
      recoveryFrames: 28,
    });
    expect(Object.keys(douglas.assets.specialEffects ?? {})).toEqual([move.id]);
    expect(douglas.assets.specialEffects?.[move.id]).toMatchObject({
      style: 'hundredDragons',
      label: 'CÓLERA DOS 100 DRAGÕES',
      sound: 'special-dragons',
    });
    const texts = JSON.stringify([STRINGS, douglas]);
    expect(texts).not.toMatch(/OUTRA DIMENS|DIMENSION SHIFT|outraDimensao|dimensionRift/i);
    expect(Object.keys(SFX).some((id) => id.includes('dimension'))).toBe(false);
  });

  it('five real contacts (not a hundred): four light bites and the final dragon, 22 in all', () => {
    expect(hits).toHaveLength(5);
    expect(hits.map((h) => h.damage)).toEqual([3, 3, 3, 3, 10]);
    expect(hits.map((h) => h.chipDamage)).toEqual([1, 0, 1, 0, 2]);
    expect(hits[4]).toMatchObject({ hitstopFrames: 14, hitstunFrames: 28, blockstunFrames: 18 });
    expect(hits[4]!.knockback).toBeGreaterThan(hits[0]!.knockback * 5);
    // Each wave reaches a little farther: the onslaught travels forward.
    const reaches = hits.map((h) => h.hitbox.x + h.hitbox.width);
    expect(reaches).toEqual([...reaches].sort((a, b) => a - b));
    expect(specialReach(move)).toBe(280);
    expect(douglas.assets.specialEffects?.[move.id]?.hitSounds).toEqual([
      'special-hit',
      'special-dragon-bite',
      'special-dragon-bite',
      'special-dragon-bite',
      'special-dragon-impact',
    ]);
  });

  it('the lead dragon at frame 16, the waves at 4 / 7 / 10, the final dragon at 16', () => {
    expect(hitStepAt(move, move.startupFrames - 1)).toBe(-1);
    expect([0, 4, 7, 10, 16].map((f) => hitStepAt(move, move.startupFrames + f))).toEqual([
      0, 1, 2, 3, 4,
    ]);
  });

  it('cannot start without meter; with it, it starts and spends the cost', () => {
    const broke = fight(150, { meter: move.meterCost - 1 });
    expect(broke.events.some((e) => e.event.type === 'specialStart')).toBe(false);
    const paid = fight(150);
    expect(paid.events.filter((e) => e.event.type === 'specialStart')).toHaveLength(1);
    expect(paid.sim.fighters[0].specialMeter).toBe(0);
  });

  it('full hit: five contacts in one combo, 22 damage, the strong freeze on the final dragon', () => {
    const { sim, contacts, events } = fight(150);
    expect(contacts.map((c) => [c.type, c.hitIndex, c.hitCount])).toEqual([
      ['hit', 0, 5],
      ['hit', 1, 5],
      ['hit', 2, 5],
      ['hit', 3, 5],
      ['hit', 4, 5],
    ]);
    expect(sim.fighters[1].health).toBe(sim.fighters[1].maxHealth - 22);
    const final = events.find(
      (e) => e.event.type === 'hit' && (e.event as CombatEvent).hitIndex === 4,
    );
    expect(final?.hitstop).toBe(true);
  });

  it('blocked: the dragons keep coming but only scrape 4 chip, and it is punishable', () => {
    const { sim, contacts } = fight(150, { guard: true });
    expect(contacts.map((c) => c.type)).toEqual(['block', 'block', 'block', 'block', 'block']);
    expect(sim.fighters[1].health).toBe(sim.fighters[1].maxHealth - 4);
    const leftAfterFinal = move.activeFrames - 16 + move.recoveryFrames;
    expect(leftAfterFinal).toBeGreaterThan(hits[4]!.blockstunFrames);
  });

  it('partial hit from far: only the waves that travel that far connect', () => {
    const partial = fight(280);
    expect(partial.contacts.map((c) => c.hitIndex)).toEqual([3, 4]);
    expect(partial.sim.fighters[1].health).toBe(partial.sim.fighters[1].maxHealth - 13);
  });

  it('whiff: out of reach, nothing connects', () => {
    const far = fight(340);
    expect(far.contacts).toHaveLength(0);
    expect(far.sim.fighters[1].health).toBe(far.sim.fighters[1].maxHealth);
  });

  it('a jump clears the first dragons (partial); jumping over him clears them all', () => {
    const jumped = fight(160, { defender: (f) => press({ up: f === 4 }) });
    expect(jumped.contacts.map((c) => c.hitIndex)).toEqual([3, 4]);
    // Close cross-up: he lands behind Douglas and the dragons pour the other way.
    const crossed = fight(70, {
      lead: 8,
      defender: (f) => press({ up: f === -4, left: f >= -4 && f < 26 }),
    });
    expect(crossed.contacts).toHaveLength(0);
  });

  it('a KO with the final dragon uses the normal KO and ends the round', () => {
    const { events } = fight(150, { health: 13 });
    const types = events.map((e) => e.event.type);
    const ko = events.find((e) => e.event.type === 'koHit')?.event as CombatEvent | undefined;
    expect(ko?.hitIndex).toBe(4);
    expect(types.filter((t) => t === 'ko')).toHaveLength(1);
    expect(types).toContain('roundOver');
  });

  it('sounds: its own start, a special hit, three bites and the final dragon', () => {
    const { contacts, sim } = fight(150);
    expect(contacts.map((c) => combatSfx(c, sim.fighters)[0])).toEqual([
      'special-hit',
      'special-dragon-bite',
      'special-dragon-bite',
      'special-dragon-bite',
      'special-dragon-impact',
    ]);
  });

  it('first use loads nothing: boot SFX and a fully procedural VFX', () => {
    const bootKeys = SFX_ASSETS.map((a) => a.key);
    const ids = ['special-dragons', 'special-dragon-bite', 'special-dragon-impact', 'special-hit'];
    for (const id of ids as (keyof typeof SFX)[]) {
      expect(SFX[id]).toBeDefined();
      expect(bootKeys.some((key) => key.endsWith(id))).toBe(true);
      expect(() =>
        readFileSync(join(__dirname, '..', 'public', 'audio/sfx', `${id}.ogg`)),
      ).not.toThrow();
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
