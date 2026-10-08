import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: { BlendModes: { NORMAL: 0, ADD: 1 } } }));

import { FightSimulation } from '../src/core/FightSimulation';
import { augusto } from '../src/fighters/augusto';
import { fighterB } from '../src/fighters/fighterB';
import { filipe } from '../src/fighters/filipe';
import { isaqueFerreira } from '../src/fighters/isaqueFerreira';
import { joaoGuiotti } from '../src/fighters/joaoGuiotti';
import { romualdo } from '../src/fighters/romualdo';
import { collectFighterAssets, vfxTextureKey } from '../src/render/assets/fighterAssets';
import { SpecialEffects } from '../src/render/special/SpecialEffects';
import { chatBubble, disc, easeOutBack, pixelBox } from '../src/render/special/vfxShapes';
import { partnerArena } from '../src/stages/partnerArena';
import type { FighterConfig } from '../src/types/fighter';
import { FAST_TIMING, idle, placeAtDistance, press, stepFrames } from './helpers';

/*
 * Regression for the ~1 s freeze on the first specials: the 24zap "typing" bubbles were drawn
 * as rounded paths with negative / tiny sizes (easeOutBack dipped below 0), and Phaser's path
 * triangulation (earcut) took hundreds of ms on those degenerate shapes. The VFX now draw only
 * rectangles / triangles / strokes, sizes are never negative, and nothing is loaded or created
 * while a special plays.
 */

/** Graphics calls that go through path triangulation (the cause of the freeze). */
const TRIANGULATED = ['fillRoundedRect', 'fillCircle', 'fillEllipse', 'fillPath', 'fillPoints'];

interface Recorder {
  calls: string[];
  negative: number;
}

/** A Graphics stand-in that records every drawing call. */
function recordingGraphics(recorder: Recorder) {
  const g: Record<string, unknown> = new Proxy(
    {},
    {
      get(_target, key: string) {
        return (...args: unknown[]) => {
          recorder.calls.push(key);
          if (key === 'fillRect' && ((args[2] as number) < 0 || (args[3] as number) < 0)) {
            recorder.negative++;
          }
          return g;
        };
      },
    },
  );
  return g;
}

/** A scene whose loader and texture factory fail the test if anything touches them. */
function strictScene(recorder: Recorder) {
  const forbidden = (what: string) => () => {
    throw new Error(`runtime ${what} during a special`);
  };
  const created = { objects: 0 };
  const chain = (): Record<string, unknown> => {
    const proxy: Record<string, unknown> = new Proxy(
      {},
      { get: (_t, key: string) => (key === 'texture' ? { key: '' } : () => proxy) },
    );
    return proxy;
  };
  const time = { now: 0 };
  const scene = {
    time,
    load: new Proxy({}, { get: (_t, key: string) => forbidden(`load.${key}`) }),
    textures: {
      exists: (key: string) => key.startsWith('vfx:'),
      addImage: forbidden('texture creation'),
      addCanvas: forbidden('texture creation'),
      generate: forbidden('texture creation'),
    },
    make: new Proxy({}, { get: () => forbidden('object creation') }),
    add: {
      graphics: () => {
        created.objects++;
        return recordingGraphics(recorder);
      },
      text: () => {
        created.objects++;
        return chain();
      },
      image: () => {
        created.objects++;
        return chain();
      },
    },
  };
  return { scene: scene as unknown as Phaser.Scene, created, time };
}

/**
 * Ten specials in a row by side 0 against a still dummy, each from the same spacing. Returns
 * the drawing calls of each use, the meter spent and the damage dealt per use.
 */
function tenSpecials(config: FighterConfig, distance: number) {
  const recorder: Recorder = { calls: [], negative: 0 };
  const { scene, created, time } = strictScene(recorder);
  const effects = new SpecialEffects(scene);
  const objectsAfterSetup = created.objects;
  const sim = new FightSimulation({
    fighters: [config, fighterB],
    stage: partnerArena,
    roundTiming: FAST_TIMING,
  });
  stepFrames(sim, 1);
  const [attacker, dummy] = sim.fighters;
  const uses: { calls: string[]; meterSpent: number; damage: number; hits: number }[] = [];
  for (let use = 0; use < 10; use++) {
    // Same starting point for every use: idle, same spacing, full meter and health.
    stepFrames(sim, 90);
    placeAtDistance(sim, distance);
    (attacker as unknown as { meter: number }).meter = 100;
    (dummy as unknown as { health: number }).health = dummy.maxHealth;
    recorder.calls = [];
    let damage = 0;
    let hits = 0;
    for (let frame = 0; frame < 110; frame++) {
      const before = dummy.health;
      const events = sim.step([frame === 0 ? press({ special: true }) : idle(), idle()]);
      for (const event of events) {
        if (event.type === 'hit' || event.type === 'koHit' || event.type === 'block') {
          effects.impact(event, sim.fighters[event.attackerIndex]);
          hits++;
        }
      }
      damage += before - dummy.health;
      time.now += 1000 / 60;
      effects.sync(sim.fighters);
    }
    uses.push({ calls: recorder.calls, meterSpent: 100 - attacker.specialMeter, damage, hits });
  }
  return { uses, recorder, createdDuringPlay: created.objects - objectsAfterSetup };
}

describe('special VFX: no freeze on use', () => {
  it('every special image is part of the roster assets loaded before the fight', () => {
    const configs = [augusto, filipe, joaoGuiotti, isaqueFerreira, romualdo];
    const keys = new Set(collectFighterAssets(configs).map((asset) => asset.key));
    for (const config of configs) {
      for (const effect of Object.values(config.assets.specialEffects ?? {})) {
        for (const path of [effect.emblem, effect.glyph]) {
          if (path) expect(keys.has(vfxTextureKey(path)), path).toBe(true);
        }
      }
    }
  });

  it.each([
    ['24ZAP', augusto, 70, 'augusto.24zap'],
    ['MINDHUB AGENT', filipe, 140, 'filipe.mindhubAgent'],
    ['ALAIO VIBECODE! (João)', joaoGuiotti, 120, 'joao-guiotti.alaioVibecode'],
    ['ALAIO VIBECODE! (Isaque)', isaqueFerreira, 120, 'isaque-ferreira.alaioVibecode'],
    ['GPTMAKER!', romualdo, 120, 'romualdo.gptMaker'],
  ] as const)(
    '%s: ten uses in a row, no loading, no triangulated shapes, same flow every time',
    (_name, config, distance, moveId) => {
      const move = config.specials.find((m) => m.id === moveId);
      expect(move).toBeDefined();
      // strictScene throws on any load / texture creation / factory call.
      const { uses, recorder, createdDuringPlay } = tenSpecials(config, distance);
      expect(createdDuringPlay).toBe(0);
      expect(recorder.negative).toBe(0);
      const first = uses[0]!;
      expect(first.calls.length).toBeGreaterThan(0);
      for (const name of TRIANGULATED) expect(first.calls).not.toContain(name);
      uses.forEach((use, i) => {
        // The first use draws exactly what the later ones draw (no warm-up path).
        expect(use.calls, `use ${i + 1}`).toEqual(first.calls);
        // Gameplay untouched: meter cost and damage of the move, one hit per use.
        expect(use.meterSpent, `use ${i + 1}`).toBe(move!.meterCost);
        expect(use.hits, `use ${i + 1}`).toBe(1);
        expect(use.damage, `use ${i + 1}`).toBe(move!.damage);
      });
    },
  );

  it('gameplay numbers of the specials are unchanged', () => {
    expect(augusto.specials[0]).toMatchObject({
      meterCost: 30,
      damage: 18,
      startupFrames: 9,
      activeFrames: 5,
      recoveryFrames: 28,
      hitbox: { x: 24, y: -126, width: 108, height: 56 },
    });
    const mind = filipe.specials.find((m) => m.id === 'filipe.mindhubAgent');
    expect(mind?.meterCost).toBeGreaterThan(0);
  });
});

describe('special VFX shapes', () => {
  it('the pop-in ease never goes below zero (no negative sizes)', () => {
    for (let i = 0; i <= 100; i++) expect(easeOutBack(i / 100)).toBeGreaterThanOrEqual(0);
    expect(easeOutBack(1)).toBeCloseTo(1);
  });

  it('bubbles, boxes and discs use only rectangles/triangles and skip degenerate sizes', () => {
    const recorder: Recorder = { calls: [], negative: 0 };
    const g = recordingGraphics(recorder) as unknown as Phaser.GameObjects.Graphics;
    for (const size of [-5, 0, 0.5, 2, 8, 24]) {
      chatBubble(g, 100, 100, size, size / 2, { fill: 0xffffff, alpha: 1, tail: 1 });
      pixelBox(g, 0, 0, size, size, 0xffffff, 1);
      disc(g, 50, 50, size, 0xffffff, 1);
    }
    expect(recorder.negative).toBe(0);
    for (const name of TRIANGULATED) expect(recorder.calls).not.toContain(name);
    // Only the visible sizes drew something.
    expect(recorder.calls).toContain('fillRect');
    const tiny: Recorder = { calls: [], negative: 0 };
    const tg = recordingGraphics(tiny) as unknown as Phaser.GameObjects.Graphics;
    chatBubble(tg, 0, 0, -3, -2, { fill: 0, alpha: 1, tail: -1 });
    pixelBox(tg, 0, 0, 1, 1, 0, 1);
    disc(tg, 0, 0, 0.5, 0, 1);
    expect(tiny.calls).toEqual([]);
  });
});
