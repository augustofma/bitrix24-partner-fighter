import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: { BlendModes: { NORMAL: 0, ADD: 1 } } }));

import { combatSfx } from '../src/audio/combatSfx';
import { FightSimulation, type SimulationEvent } from '../src/core/FightSimulation';
import { augusto } from '../src/fighters/augusto';
import { fighterB } from '../src/fighters/fighterB';
import { filipe } from '../src/fighters/filipe';
import { isaqueFerreira } from '../src/fighters/isaqueFerreira';
import { joaoGuiotti } from '../src/fighters/joaoGuiotti';
import { romualdo } from '../src/fighters/romualdo';
import { aislan } from '../src/fighters/aislan';
import { dmitry } from '../src/fighters/dmitry';
import { gabrielMattozo } from '../src/fighters/gabrielMattozo';
import { gabriele } from '../src/fighters/gabriele';
import { collectFighterAssets, vfxTextureKey } from '../src/render/assets/fighterAssets';
import { SpecialEffects } from '../src/render/special/SpecialEffects';
import { partnerArena } from '../src/stages/partnerArena';
import type { FighterConfig } from '../src/types/fighter';
import { FAST_TIMING, idle, placeAtDistance, press, stepFrames } from './helpers';

/** A scene stand-in that records every game object the effects create. */
function fakeScene() {
  const created = { images: [] as Record<string, unknown>[], graphics: 0, texts: 0 };
  const chain = (state: Record<string, unknown> = {}): Record<string, unknown> => {
    const proxy: Record<string, unknown> = new Proxy(state, {
      get(target, key: string) {
        if (key in target) return target[key];
        return (...args: unknown[]) => {
          if (key === 'setVisible') target.visible = args[0];
          if (key === 'setTexture') target.texture = { key: args[0] };
          if (key === 'setScale') target.scale = args[0];
          if (key === 'setFlipX') target.flipX = args[0];
          return proxy;
        };
      },
    });
    return proxy;
  };
  const time = { now: 0 };
  const scene = {
    time,
    textures: { exists: (key: string) => key.startsWith('vfx:') },
    add: {
      graphics: () => {
        created.graphics++;
        return chain();
      },
      text: () => {
        created.texts++;
        return chain();
      },
      image: (_x: number, _y: number, key: string) => {
        const state: Record<string, unknown> = { visible: true, texture: { key } };
        created.images.push(state);
        return chain(state);
      },
    },
  };
  return { scene: scene as unknown as Phaser.Scene, created, time };
}

const visibleEmblems = (images: Record<string, unknown>[]) =>
  images
    .filter((image) => image.visible)
    .map((image) => (image.texture as { key: string }).key)
    .sort();

/** A real fight where `config` (side 0) throws its special at a still dummy. */
function specialFight(config: FighterConfig, distance: number) {
  const sim = new FightSimulation({
    fighters: [config, fighterB],
    stage: partnerArena,
    roundTiming: FAST_TIMING,
  });
  stepFrames(sim, 1);
  placeAtDistance(sim, distance);
  (sim.fighters[0] as unknown as { meter: number }).meter = 100;
  return sim;
}

describe('app-themed special VFX: configuration', () => {
  it('24ZAP uses the messaging theme with the 24zap emblem and its own sound', () => {
    const effect = augusto.assets.specialEffects?.['augusto.24zap'];
    expect(effect).toMatchObject({
      style: 'zapMessages',
      emblem: 'vfx/24zap-emblem.png',
      sound: 'special-zap',
    });
  });

  it('MINDHUB AGENT uses the AI theme with the Mindhub emblem, sigil and its own sound', () => {
    const effect = filipe.assets.specialEffects?.['filipe.mindhubAgent'];
    expect(effect).toMatchObject({
      style: 'mindNetwork',
      emblem: 'vfx/mindhub-emblem.png',
      glyph: 'vfx/mindhub-sigil.png',
      sound: 'special-mind',
    });
  });

  it('the emblem images exist and load through the roster pipeline (once each)', () => {
    for (const path of [
      'vfx/24zap-emblem.png',
      'vfx/mindhub-emblem.png',
      'vfx/mindhub-sigil.png',
    ]) {
      expect(existsSync(join(__dirname, '..', 'public', path)), path).toBe(true);
    }
    const keys = collectFighterAssets([augusto, filipe, augusto]).map((a) => a.key);
    expect(keys.filter((k) => k === vfxTextureKey('vfx/24zap-emblem.png'))).toHaveLength(1);
    expect(keys).toContain(vfxTextureKey('vfx/mindhub-sigil.png'));
  });

  it("the special start plays the move's themed sound (generic sound otherwise)", () => {
    const sim = specialFight(filipe, 140);
    const events = stepFrames(sim, 2, press({ special: true }));
    const start = events.find((e) => e.type === 'specialStart') as SimulationEvent;
    expect(combatSfx(start, sim.fighters)).toEqual(['special-mind']);
    expect(combatSfx(start)).toEqual(['special']);
  });
});

describe('app-themed special VFX: timing and cleanup', () => {
  it.each([
    [augusto, 70, 'vfx:vfx/24zap-emblem.png'],
    [filipe, 140, 'vfx:vfx/mindhub-emblem.png'],
    [joaoGuiotti, 120, 'vfx:vfx/vibecode-emblem.png'],
    [isaqueFerreira, 120, 'vfx:vfx/vibecode-emblem.png'],
    [romualdo, 120, 'vfx:vfx/gptmaker-emblem.png'],
    [aislan, 120, 'vfx:vfx/fluidz-emblem.png'],
  ] as const)(
    '%s: shows on the move, impact on hit, nothing left after',
    (config, distance, emblem) => {
      const { scene, created, time } = fakeScene();
      const effects = new SpecialEffects(scene);
      const objectsAfterSetup = { ...created, images: created.images.length };
      const sim = specialFight(config, distance);
      let sawEmblem = false;
      let sawImpact = false;
      let frames = 0;
      stepFrames(sim, 1, press({ special: true }));
      for (; frames < 120; frames++) {
        for (const event of sim.step([idle(), idle()])) {
          if (event.type === 'hit' || event.type === 'koHit' || event.type === 'block') {
            effects.impact(event, sim.fighters[event.attackerIndex]);
            sawImpact = true;
          }
        }
        time.now += 1000 / 60;
        effects.sync(sim.fighters);
        if (visibleEmblems(created.images).includes(emblem)) sawEmblem = true;
      }
      expect(sawEmblem).toBe(true);
      expect(sawImpact).toBe(true);
      // The move is over and the impact has expired: every effect image is hidden again.
      expect(sim.fighters[0].state).not.toBe('special');
      expect(visibleEmblems(created.images)).toEqual([]);
      // Nothing was created while playing: every object was made once in the constructor.
      expect({ ...created, images: created.images.length }).toEqual(objectsAfterSetup);
    },
  );

  it('Dmitry ALAIO STRIKE!: hits across the stage, plays its thunder, creates nothing', () => {
    const { scene, created, time } = fakeScene();
    const effects = new SpecialEffects(scene);
    const objectsAfterSetup = { ...created, images: created.images.length };
    const sim = specialFight(dmitry, 600);
    const start = stepFrames(sim, 1, press({ special: true })).find(
      (e) => e.type === 'specialStart',
    ) as SimulationEvent;
    expect(combatSfx(start, sim.fighters)).toEqual(['special-alaio-strike']);
    let sawImpact = false;
    for (let frames = 0; frames < 140; frames++) {
      for (const event of sim.step([idle(), idle()])) {
        if (event.type === 'hit' || event.type === 'koHit') {
          effects.impact(event, sim.fighters[event.attackerIndex]);
          sawImpact = true;
        }
      }
      time.now += 1000 / 60;
      effects.sync(sim.fighters);
    }
    expect(sawImpact).toBe(true);
    expect(sim.fighters[0].state).not.toBe('special');
    expect({ ...created, images: created.images.length }).toEqual(objectsAfterSetup);
  });

  it('Gabriel Mattozo N8N!: hits, plays its sound, impact shown, creates nothing', () => {
    const { scene, created, time } = fakeScene();
    const effects = new SpecialEffects(scene);
    const objectsAfterSetup = { ...created, images: created.images.length };
    const sim = specialFight(gabrielMattozo, 150);
    const start = stepFrames(sim, 1, press({ special: true })).find(
      (e) => e.type === 'specialStart',
    ) as SimulationEvent;
    expect(combatSfx(start, sim.fighters)).toEqual(['special-n8n']);
    let sawImpact = false;
    for (let frames = 0; frames < 120; frames++) {
      for (const event of sim.step([idle(), idle()])) {
        if (event.type === 'hit' || event.type === 'koHit') {
          effects.impact(event, sim.fighters[event.attackerIndex]);
          sawImpact = true;
        }
      }
      time.now += 1000 / 60;
      effects.sync(sim.fighters);
    }
    expect(sawImpact).toBe(true);
    expect(sim.fighters[0].state).not.toBe('special');
    expect({ ...created, images: created.images.length }).toEqual(objectsAfterSetup);
  });

  it('Gabriele CHAMA O 190!: hits, plays its sound, impact shown, creates nothing', () => {
    const { scene, created, time } = fakeScene();
    const effects = new SpecialEffects(scene);
    const objectsAfterSetup = { ...created, images: created.images.length };
    const sim = specialFight(gabriele, 200);
    const start = stepFrames(sim, 1, press({ special: true })).find(
      (e) => e.type === 'specialStart',
    ) as SimulationEvent;
    expect(combatSfx(start, sim.fighters)).toEqual(['special-190']);
    let sawImpact = false;
    for (let frames = 0; frames < 120; frames++) {
      for (const event of sim.step([idle(), idle()])) {
        if (event.type === 'hit' || event.type === 'koHit') {
          effects.impact(event, sim.fighters[event.attackerIndex]);
          sawImpact = true;
        }
      }
      time.now += 1000 / 60;
      effects.sync(sim.fighters);
    }
    expect(sawImpact).toBe(true);
    expect(sim.fighters[0].state).not.toBe('special');
    expect({ ...created, images: created.images.length }).toEqual(objectsAfterSetup);
  });

  it.each([1, -1] as const)('police artwork faces %i and disappears on reset', (direction) => {
    const { scene, created } = fakeScene();
    const effects = new SpecialEffects(scene);
    const sim = specialFight(gabriele, 200);
    stepFrames(sim, 1, press({ special: true }));
    sim.fighters[0].direction = direction;
    effects.sync(sim.fighters);
    const car = created.images.find((image) => image.visible);
    expect(car).toMatchObject({
      texture: { key: vfxTextureKey('vfx/police-car.png') },
      flipX: direction < 0,
      scale: 0.56,
    });
    sim.fighters[0].resetForRound({ x: 300, y: partnerArena.groundY }, 1);
    effects.sync(sim.fighters);
    expect(visibleEmblems(created.images)).toEqual([]);
  });

  it('an interrupted special leaves nothing on screen (e.g. the round resets)', () => {
    const { scene, created } = fakeScene();
    const effects = new SpecialEffects(scene);
    const sim = specialFight(filipe, 140);
    stepFrames(sim, 1, press({ special: true }));
    stepFrames(sim, 8);
    effects.sync(sim.fighters);
    expect(visibleEmblems(created.images).length).toBeGreaterThan(0);
    sim.fighters[0].resetForRound({ x: 300, y: partnerArena.groundY }, 1);
    effects.sync(sim.fighters);
    expect(visibleEmblems(created.images)).toEqual([]);
  });

  it('normal attacks never trigger a themed impact', () => {
    const { scene, created } = fakeScene();
    const effects = new SpecialEffects(scene);
    const sim = specialFight(augusto, 70);
    for (const event of stepFrames(sim, 30, press({ punch: true }))) {
      if (event.type === 'hit') effects.impact(event, sim.fighters[0]);
    }
    effects.sync(sim.fighters);
    expect(visibleEmblems(created.images)).toEqual([]);
  });
});
