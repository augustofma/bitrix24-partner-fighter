import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: { BlendModes: { ADD: 1, NORMAL: 0 } } }));

import { attackHits, hitStepAt } from '../src/core/fighter/attackFrames';
import { specialReach } from '../src/core/fighter/specialMoves';
import { FightSimulation, type SimulationEvent } from '../src/core/FightSimulation';
import type { CombatEvent } from '../src/core/systems/CombatSystem';
import type { ReadonlyFighter } from '../src/core/fighter/ReadonlyFighter';
import { combatSfx } from '../src/audio/combatSfx';
import { SFX } from '../src/config/audio';
import { jonas } from '../src/fighters/jonas';
import { fighterB } from '../src/fighters/fighterB';
import { SFX_ASSETS } from '../src/render/assets/audioAssets';
import { collectFighterAssets } from '../src/render/assets/fighterAssets';
import type { MoveFrame } from '../src/render/special/specialTheme';
import { TRACKER_THEME } from '../src/render/special/trackerTheme';
import { partnerArena } from '../src/stages/partnerArena';
import type { InputState } from '../src/types/input';
import { FAST_TIMING, idle, placeAtDistance, press } from './helpers';

const move = jonas.specials[0]!;
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
    fighters: [jonas, fighterB],
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

describe('Jonas: TRACKEADO!', () => {
  it('is a ground-only mid zone special: 35 meter, click + lead + sale, 19 damage in all', () => {
    expect(move).toMatchObject({
      id: 'jonas.trackeado',
      displayName: 'TRACKEADO!',
      level: 'mid',
      meterCost: 35,
      groundOnly: true,
      advanceSpeed: 0,
      startupFrames: 15,
      activeFrames: 18,
      recoveryFrames: 26,
    });
    expect(hits.map((h) => h.damage)).toEqual([3, 4, 12]);
    expect(hits.map((h) => h.chipDamage)).toEqual([1, 1, 2]);
    expect(hits[2]).toMatchObject({ hitstopFrames: 13, hitstunFrames: 26, blockstunFrames: 16 });
    expect(jonas.assets.specialEffects?.[move.id]).toEqual({
      style: 'campaignTracker',
      label: 'TRACKEADO!',
      sound: 'special-track',
      hitLabels: ['CLIQUE', 'LEAD', 'VENDA!'],
      hitSounds: ['special-track-ping', 'special-track-ping', 'special-track-sale'],
    });
    expect(jonas.assets.sprite?.animations.special?.frames).toEqual([39, 15, 16]);
  });

  it('the click at frame 15, the lead 6 frames later, the sale at 13', () => {
    expect(hitStepAt(move, move.startupFrames - 1)).toBe(-1);
    expect([0, 6, 13].map((f) => hitStepAt(move, move.startupFrames + f))).toEqual([0, 1, 2]);
  });

  it('cannot start without meter; with it, it starts and spends the cost', () => {
    const broke = fight(200, { meter: move.meterCost - 1 });
    expect(broke.events.some((e) => e.event.type === 'specialStart')).toBe(false);
    const paid = fight(200);
    expect(paid.events.filter((e) => e.event.type === 'specialStart')).toHaveLength(1);
    expect(paid.sim.fighters[0].specialMeter).toBe(0);
  });

  it('hits: click, lead and sale in one combo, 19 damage, the strong freeze on the sale', () => {
    const { sim, contacts, events } = fight(200);
    expect(contacts.map((c) => [c.type, c.hitIndex, c.hitCount])).toEqual([
      ['hit', 0, 3],
      ['hit', 1, 3],
      ['hit', 2, 3],
    ]);
    expect(sim.fighters[1].health).toBe(sim.fighters[1].maxHealth - 19);
    const sale = events.find(
      (e) => e.event.type === 'hit' && (e.event as CombatEvent).hitIndex === 2,
    );
    expect(sale?.hitstop).toBe(true);
  });

  it('blocked: only chip (4 in all), and punishable', () => {
    const { sim, contacts } = fight(200, { guard: true });
    expect(contacts.map((c) => c.type)).toEqual(['block', 'block', 'block']);
    expect(sim.fighters[1].health).toBe(sim.fighters[1].maxHealth - 4);
    expect(move.activeFrames - 13 + move.recoveryFrames).toBeGreaterThan(hits[2]!.blockstunFrames);
  });

  it('a zone with a blind spot: long reach, but point-blank it whiffs', () => {
    expect(specialReach(move)).toBe(320);
    for (const distance of [80, 160, 250, 330]) {
      expect(fight(distance).contacts, `${distance}`).toHaveLength(3);
    }
    for (const distance of [40, 60, 380]) {
      const { contacts, sim } = fight(distance);
      expect(contacts, `${distance}`).toHaveLength(0);
      expect(sim.fighters[1].health).toBe(sim.fighters[1].maxHealth);
    }
  });

  it('a well-timed jump escapes it; an early or late one is caught in part', () => {
    expect(fight(200, { defender: (f) => press({ up: f === 8 }) }).contacts).toHaveLength(0);
    expect(
      fight(200, { defender: (f) => press({ up: f === 4 }) }).contacts.map((c) => c.hitIndex),
    ).toEqual([2]);
  });

  it('a KO with the sale ends the round normally', () => {
    const { events } = fight(200, { health: 8 });
    const types = events.map((e) => e.event.type);
    expect((events.find((e) => e.event.type === 'koHit')?.event as CombatEvent).hitIndex).toBe(2);
    expect(types.filter((t) => t === 'ko')).toHaveLength(1);
    expect(types).toContain('roundOver');
  });

  it('sounds: its own start, a ping on the click and the lead, the cha-ching on the sale', () => {
    const { contacts, sim } = fight(200);
    expect(contacts.map((c) => combatSfx(c, sim.fighters)[0])).toEqual([
      'special-track-ping',
      'special-track-ping',
      'special-track-sale',
    ]);
  });

  it('first use loads nothing: boot SFX and a fully procedural VFX', () => {
    const bootKeys = SFX_ASSETS.map((a) => a.key);
    for (const id of ['special-track', 'special-track-ping', 'special-track-sale'] as const) {
      expect(SFX[id]).toBeDefined();
      expect(bootKeys.some((key) => key.endsWith(id))).toBe(true);
    }
    const effect = jonas.assets.specialEffects?.[move.id];
    expect(effect?.emblem).toBeUndefined();
    expect(effect?.glyph).toBeUndefined();
    expect(collectFighterAssets([jonas]).some((a) => a.path.startsWith('vfx/'))).toBe(false);
  });

  it('deterministic: the same inputs give the same fight', () => {
    const run = () => {
      const { events, sim } = fight(200);
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
        TRACKER_THEME.drawMove({
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
            TRACKER_THEME.drawImpact({
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
