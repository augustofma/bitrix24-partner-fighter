import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: { BlendModes: { ADD: 1, NORMAL: 0 } } }));

import { attackHits, hitStepAt } from '../src/core/fighter/attackFrames';
import { specialReach } from '../src/core/fighter/specialMoves';
import { FightSimulation, type SimulationEvent } from '../src/core/FightSimulation';
import type { CombatEvent } from '../src/core/systems/CombatSystem';
import type { ReadonlyFighter } from '../src/core/fighter/ReadonlyFighter';
import { combatSfx } from '../src/audio/combatSfx';
import { SFX } from '../src/config/audio';
import { juliana } from '../src/fighters/juliana';
import { fighterB } from '../src/fighters/fighterB';
import { SFX_ASSETS } from '../src/render/assets/audioAssets';
import { collectFighterAssets } from '../src/render/assets/fighterAssets';
import type { MoveFrame } from '../src/render/special/specialTheme';
import { GOLD_THEME } from '../src/render/special/goldTheme';
import { partnerArena } from '../src/stages/partnerArena';
import type { InputState } from '../src/types/input';
import { FAST_TIMING, idle, placeAtDistance, press } from './helpers';

const move = juliana.specials[0]!;
const hits = attackHits(move);

function fight(
  distance: number,
  options: {
    guard?: boolean;
    meter?: number;
    defender?: (f: number) => InputState;
    health?: number;
    /** Frames run before Juliana presses the special (to let a defender act first). */
    lead?: number;
  } = {},
) {
  const sim = new FightSimulation({
    fighters: [juliana, fighterB],
    stage: partnerArena,
    roundTiming: FAST_TIMING,
  });
  sim.step([idle(), idle()]);
  placeAtDistance(sim, distance);
  sim.fighters[0].changeSpecialMeter(options.meter ?? move.meterCost);
  if (options.health !== undefined) sim.fighters[1].health = options.health;
  const events: { frame: number; event: SimulationEvent; hitstop: boolean }[] = [];
  for (let f = -(options.lead ?? 0); f < 140; f++) {
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

describe('Juliana: GOLD PARTNER!', () => {
  it('is a ground-only mid special: 40 meter, bronze + silver + gold, 20 damage in all', () => {
    expect(move).toMatchObject({
      id: 'juliana.goldPartner',
      displayName: 'GOLD PARTNER!',
      level: 'mid',
      meterCost: 40,
      groundOnly: true,
      advanceSpeed: 0,
      startupFrames: 12,
      activeFrames: 16,
      recoveryFrames: 30,
    });
    expect(hits.map((h) => h.damage)).toEqual([4, 5, 11]);
    expect(hits.map((h) => h.chipDamage)).toEqual([1, 1, 2]);
    expect(hits[2]).toMatchObject({ hitstopFrames: 14, hitstunFrames: 28, blockstunFrames: 17 });
    expect(juliana.assets.specialEffects?.[move.id]).toEqual({
      style: 'goldPartner',
      label: 'GOLD PARTNER!',
      labelColor: 0xffd24a,
      sound: 'special-gold',
      hitLabels: ['BRONZE', 'SILVER', 'GOLD!'],
      hitSounds: ['special-gold-tier', 'special-gold-tier', 'special-gold-final'],
    });
    expect(juliana.assets.sprite?.animations.special?.frames).toEqual([39, 15, 16]);
  });

  it('bronze at frame 12, silver 5 frames later, gold at 11', () => {
    expect(hitStepAt(move, move.startupFrames - 1)).toBe(-1);
    expect([0, 5, 11].map((f) => hitStepAt(move, move.startupFrames + f))).toEqual([0, 1, 2]);
  });

  it('cannot start without meter; with it, it starts and spends the cost', () => {
    const broke = fight(120, { meter: move.meterCost - 1 });
    expect(broke.events.some((e) => e.event.type === 'specialStart')).toBe(false);
    const paid = fight(120);
    expect(paid.events.filter((e) => e.event.type === 'specialStart')).toHaveLength(1);
    expect(paid.sim.fighters[0].specialMeter).toBe(0);
  });

  it('hits: bronze, silver and gold in one combo, 20 damage, the strong freeze on gold', () => {
    const { sim, contacts, events } = fight(120);
    expect(contacts.map((c) => [c.type, c.hitIndex, c.hitCount])).toEqual([
      ['hit', 0, 3],
      ['hit', 1, 3],
      ['hit', 2, 3],
    ]);
    expect(sim.fighters[1].health).toBe(sim.fighters[1].maxHealth - 20);
    const gold = events.find(
      (e) => e.event.type === 'hit' && (e.event as CombatEvent).hitIndex === 2,
    );
    expect(gold?.hitstop).toBe(true);
  });

  it('blocked: only chip (4 in all), and very punishable', () => {
    const { sim, contacts } = fight(120, { guard: true });
    expect(contacts.map((c) => c.type)).toEqual(['block', 'block', 'block']);
    expect(sim.fighters[1].health).toBe(sim.fighters[1].maxHealth - 4);
    expect(move.activeFrames - 11 + move.recoveryFrames).toBeGreaterThan(
      hits[2]!.blockstunFrames + 10,
    );
  });

  it('close range: it whiffs from mid range', () => {
    expect(specialReach(move)).toBe(160);
    for (const distance of [50, 120, 170]) {
      expect(fight(distance).contacts, `${distance}`).toHaveLength(3);
    }
    for (const distance of [210, 260]) {
      const { contacts, sim } = fight(distance);
      expect(contacts, `${distance}`).toHaveLength(0);
      expect(sim.fighters[1].health).toBe(sim.fighters[1].maxHealth);
    }
  });

  it('a golden reversal: the tall pillar catches a rival jumping in', () => {
    const jumpIn = fight(220, {
      lead: 20,
      defender: (f) => press({ up: f === -10, left: f >= -10 && f < 20 }),
    });
    expect(jumpIn.contacts.map((c) => c.hitIndex)).toEqual([0, 1, 2]);
    const hop = fight(120, { defender: (f) => press({ up: f === 4 }) });
    expect(hop.contacts).toHaveLength(3);
  });

  it('a KO with gold ends the round normally', () => {
    const { events } = fight(120, { health: 10 });
    const types = events.map((e) => e.event.type);
    expect((events.find((e) => e.event.type === 'koHit')?.event as CombatEvent).hitIndex).toBe(2);
    expect(types.filter((t) => t === 'ko')).toHaveLength(1);
    expect(types).toContain('roundOver');
  });

  it('sounds: its own start, a medal clang per tier, the fanfare on gold', () => {
    const { contacts, sim } = fight(120);
    expect(contacts.map((c) => combatSfx(c, sim.fighters)[0])).toEqual([
      'special-gold-tier',
      'special-gold-tier',
      'special-gold-final',
    ]);
  });

  it('first use loads nothing: boot SFX and a fully procedural VFX', () => {
    const bootKeys = SFX_ASSETS.map((a) => a.key);
    for (const id of ['special-gold', 'special-gold-tier', 'special-gold-final'] as const) {
      expect(SFX[id]).toBeDefined();
      expect(bootKeys.some((key) => key.endsWith(id))).toBe(true);
    }
    const effect = juliana.assets.specialEffects?.[move.id];
    expect(effect?.emblem).toBeUndefined();
    expect(effect?.glyph).toBeUndefined();
    expect(collectFighterAssets([juliana]).some((a) => a.path.startsWith('vfx/'))).toBe(false);
  });

  it('deterministic: the same inputs give the same fight', () => {
    const run = () => {
      const { events, sim } = fight(120);
      return JSON.stringify([
        events.map((e) => `${e.frame}:${e.event.type}`),
        sim.fighters.map((f) => [f.health, f.position.x, f.specialMeter]),
      ]);
    };
    expect(run()).toBe(run());
  });

  it('VFX: draws every frame and impact with finite numbers, both directions', () => {
    const g: Record<string, unknown> = new Proxy(
      {},
      {
        get:
          () =>
          (...args: unknown[]) => {
            for (const v of args) if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true);
            return g;
          },
      },
    );
    const noImage = { available: false, show: () => {} };
    const total = move.startupFrames + move.activeFrames + move.recoveryFrames;
    for (const direction of [1, -1] as const) {
      const fighter = { position: { x: 400, y: 470 }, direction } as unknown as ReadonlyFighter;
      for (let frame = 0; frame < total; frame++) {
        const phase =
          frame < move.startupFrames
            ? 'startup'
            : frame < total - move.recoveryFrames
              ? 'active'
              : 'recovery';
        GOLD_THEME.drawMove({
          g: g as unknown as MoveFrame['g'],
          glow: g as unknown as MoveFrame['glow'],
          fighter,
          attack: move,
          phase,
          frame,
          t: (frame % 10) / 10,
          direction,
          hand: { x: 490, y: 380 },
          front: { x: 720, y: 380 },
          box: { left: 490, right: 720, top: 345, bottom: 450 },
          emblem: noImage,
          glyph: noImage,
          impacting: false,
        });
      }
      for (const hit of [0, 1, 2]) {
        for (const blocked of [false, true]) {
          for (const t of [0, 0.1, 0.5, 0.99]) {
            GOLD_THEME.drawImpact({
              g: g as unknown as MoveFrame['g'],
              glow: g as unknown as MoveFrame['glow'],
              x: 600,
              y: 380,
              direction,
              t,
              blocked,
              hit,
              hits: 3,
              ko: false,
              emblem: noImage,
            });
          }
        }
      }
    }
  });
});
