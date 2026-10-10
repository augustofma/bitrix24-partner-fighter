import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Core: { Events: { STEP: 'step' } },
    Sound: { Events: { UNLOCKED: 'unlocked' } },
    Cache: { Events: { ADD: 'add' } },
  },
}));
vi.mock('../src/ui/hud/SpecialReadyEffect', () => ({
  SpecialReadyEffect: class {
    burst() {}
    discharge() {}
    update() {}
  },
}));

import { combatSfx, impactSfx } from '../src/audio/combatSfx';
import { gameAudio, gameSfx } from '../src/audio/gameAudio';
import { SfxManager, type SfxBackend } from '../src/audio/SfxManager';
import {
  SFX,
  SFX_DEDUP_MS,
  SFX_PITCH_VARIATION,
  SFX_UNLOCK_GRACE_MS,
  sfxFiles,
} from '../src/config/audio';
import { FightSimulation, type SimulationEvent } from '../src/core/FightSimulation';
import type { ReadonlyFighter } from '../src/core/fighter/ReadonlyFighter';
import { augusto } from '../src/fighters/augusto';
import { fighterA } from '../src/fighters/fighterA';
import { fighterB } from '../src/fighters/fighterB';
import { partnerArena } from '../src/stages/partnerArena';
import type { SfxId } from '../src/types/audio';
import { SpecialMeterBar } from '../src/ui/SpecialMeterBar';
import {
  FAST_TIMING,
  createFightingSim,
  idle,
  placeAtDistance,
  press,
  stepFrames,
} from './helpers';

/** All the sounds a run of frames makes (what FightScene would play). */
const soundsOf = (events: readonly SimulationEvent[]) =>
  events.flatMap((event) => combatSfx(event));
const count = (sounds: readonly SfxId[], id: SfxId) => sounds.filter((s) => s === id).length;

describe('combat sounds come from real simulation events', () => {
  it('a punch that connects sounds like a punch and the defender reacts (hurt)', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 70);
    const sounds = soundsOf(stepFrames(sim, 30, press({ punch: true })));
    expect(count(sounds, 'punch')).toBe(1);
    expect(count(sounds, 'hurt')).toBe(1);
  });

  it('a whiff makes no impact sound', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 400);
    const sounds = soundsOf(stepFrames(sim, 30, press({ punch: true })));
    for (const impact of ['punch', 'kick', 'hurt', 'block'] as const) {
      expect(count(sounds, impact)).toBe(0);
    }
  });

  it('kicks and punches have different impacts (and every attack has one)', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 80);
    const sounds = soundsOf(stepFrames(sim, 40, press({ kick: true })));
    expect(count(sounds, 'kick')).toBe(1);
    expect(count(sounds, 'punch')).toBe(0);
    expect(impactSfx('punch')).not.toBe(impactSfx('kick'));
    expect(impactSfx('crouchKick')).toBe('crouch-kick');
    expect(impactSfx('airPunch')).toBe('air-punch');
  });

  it('a blocked hit plays the block sound, not an impact', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 70);
    const sounds = soundsOf(stepFrames(sim, 30, press({ punch: true }), press({ block: true })));
    expect(count(sounds, 'block')).toBe(1);
    expect(count(sounds, 'punch')).toBe(0);
    expect(count(sounds, 'hurt')).toBe(0);
  });

  it('one jump: one jump sound when it leaves the ground, one landing on touchdown', () => {
    const sim = createFightingSim();
    const events: SimulationEvent[] = [];
    events.push(...sim.step([press({ up: true }), idle()]));
    const jumpFrame = events.filter((e) => e.type === 'jump');
    expect(jumpFrame).toEqual([{ type: 'jump', fighterIndex: 0 }]);
    let landedAt = -1;
    for (let frame = 1; frame < 120; frame++) {
      const step = sim.step([idle(), idle()]);
      if (step.some((e) => e.type === 'land') && landedAt < 0) landedAt = frame;
      events.push(...step);
    }
    const sounds = soundsOf(events);
    expect(count(sounds, 'jump')).toBe(1);
    expect(count(sounds, 'landing')).toBe(1);
    // The landing is the real contact: the fighter is on the ground from that frame on.
    expect(landedAt).toBeGreaterThan(10);
    expect(sim.fighters[0].isAirborne).toBe(false);
  });

  it('standing still never makes jump or landing sounds', () => {
    const sim = createFightingSim();
    const sounds = soundsOf(stepFrames(sim, 120));
    expect(sounds).toEqual([]);
  });

  it('the KO sounds once, however many frames follow', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 70);
    (sim.fighters[1] as unknown as { health: number }).health = 1;
    const sounds = soundsOf(stepFrames(sim, 400, press({ punch: true })));
    expect(count(sounds, 'ko')).toBe(1);
  });

  it('the special sounds when it really starts (meter paid), not on a press without meter', () => {
    const sim = new FightSimulation({
      fighters: [augusto, fighterB],
      stage: partnerArena,
      roundTiming: FAST_TIMING,
    });
    stepFrames(sim, 1);
    expect(count(soundsOf(stepFrames(sim, 30, press({ special: true }))), 'special')).toBe(0);
    sim.fighters[0].changeSpecialMeter(100);
    stepFrames(sim, 2); // release F: holding it never repeats a special
    const events = stepFrames(sim, 2, press({ special: true }));
    expect(events.filter((e) => e.type === 'specialStart')).toHaveLength(1);
    expect(count(soundsOf(events), 'special')).toBe(1);
  });

  it('round calls: FIGHT! on the fight start, victory on the winner pose', () => {
    // The stinger and the announcer's voice.
    expect(combatSfx({ type: 'fightStart' })).toEqual(['fight', 'voice-fight']);
    expect(combatSfx({ type: 'victoryPose', winnerIndex: 0 })).toEqual(['victory']);
  });

  it('sounds never change the simulation (same inputs, same events with or without audio)', () => {
    const run = () => {
      const sim = new FightSimulation({ fighters: [fighterA, fighterB], stage: partnerArena });
      const log: string[] = [];
      for (let f = 0; f < 600; f++) {
        const input = press({ right: f % 50 < 20, up: f % 90 === 0, punch: f % 13 === 0 });
        for (const e of sim.step([input, idle()])) {
          log.push(`${f}:${e.type}`);
          combatSfx(e);
        }
      }
      return log;
    };
    expect(run()).toEqual(run());
  });
});

class FakeBackend implements SfxBackend {
  locked = false;
  time = 1000;
  loaded = new Set<SfxId>(Object.keys(SFX) as SfxId[]);
  readonly played: { id: SfxId; volume: number; rate: number }[] = [];
  play(id: SfxId, volume: number, rate: number) {
    this.played.push({ id, volume, rate });
  }
  isLoaded(id: SfxId) {
    return this.loaded.has(id);
  }
  now() {
    return this.time;
  }
}

describe('SfxManager', () => {
  const setup = (random = () => 0.5) => {
    const backend = new FakeBackend();
    return { backend, sfx: new SfxManager(backend, random) };
  };

  it('plays each effect at its configured level', () => {
    const { backend, sfx } = setup();
    expect(sfx.play('ko')).toBe(true);
    expect(backend.played[0]).toEqual({ id: 'ko', volume: SFX.ko.volume, rate: 1 });
  });

  it('the same effect twice in the same moment plays once (keyboard + tap)', () => {
    const { backend, sfx } = setup();
    sfx.play('menu-confirm');
    sfx.play('menu-confirm');
    backend.time += SFX_DEDUP_MS - 1;
    sfx.play('menu-confirm');
    sfx.play('menu-move'); // a different effect is not blocked
    backend.time += SFX_DEDUP_MS;
    sfx.play('menu-confirm');
    expect(backend.played.map((p) => p.id)).toEqual(['menu-confirm', 'menu-move', 'menu-confirm']);
  });

  it('nothing plays before the browser unlocks audio, and old requests never play late', () => {
    const { backend, sfx } = setup();
    backend.locked = true;
    expect(sfx.play('punch')).toBe(false);
    backend.locked = false;
    backend.time += SFX_UNLOCK_GRACE_MS + 1;
    sfx.unlocked();
    expect(backend.played).toHaveLength(0);
    expect(sfx.play('punch')).toBe(true);
  });

  it('the tap that unlocks audio still gets its sound (only the last, only if fresh)', () => {
    const { backend, sfx } = setup();
    backend.locked = true;
    sfx.play('menu-move');
    sfx.play('menu-confirm');
    backend.locked = false;
    backend.time += 40;
    sfx.unlocked();
    sfx.unlocked();
    expect(backend.played.map((p) => p.id)).toEqual(['menu-confirm']);
  });

  it('mute stops new effects; unmute brings them back', () => {
    const { backend, sfx } = setup();
    sfx.setMuted(true);
    expect(sfx.play('kick')).toBe(false);
    sfx.setMuted(false);
    expect(sfx.play('kick')).toBe(true);
    expect(backend.played).toHaveLength(1);
  });

  it('volume scales every effect and is clamped', () => {
    const { backend, sfx } = setup();
    sfx.setVolume(0.5);
    sfx.play('ko');
    expect(backend.played[0]?.volume).toBeCloseTo(SFX.ko.volume * 0.5);
    sfx.setVolume(4);
    expect(sfx.sfxVolume).toBe(1);
    sfx.setVolume(0);
    backend.time += 1000;
    expect(sfx.play('ko')).toBe(false);
  });

  it('hits vary a little in pitch and level; UI sounds stay exact', () => {
    const { backend, sfx } = setup(() => 1);
    sfx.play('punch');
    sfx.play('menu-move');
    const [punch, menu] = backend.played;
    expect(punch?.rate).toBeCloseTo(1 + SFX_PITCH_VARIATION);
    expect(punch?.volume).toBeLessThan(SFX.punch.volume);
    expect(menu).toEqual({ id: 'menu-move', volume: SFX['menu-move'].volume, rate: 1 });
  });

  it('effects still loading are skipped, not queued', () => {
    const { backend, sfx } = setup();
    backend.loaded.delete('fight');
    expect(sfx.play('fight')).toBe(false);
    backend.loaded.add('fight');
    expect(backend.played).toHaveLength(0);
  });
});

describe('SPECIAL READY sound', () => {
  /** Minimal display stand-in: every call chains. */
  function fakeScene() {
    const object = (): Record<string, unknown> =>
      new Proxy({}, { get: () => () => object() }) as Record<string, unknown>;
    return { add: { graphics: object, text: object } } as unknown as Phaser.Scene;
  }
  const fighterWith = (meter: number) =>
    ({ config: augusto, specialMeter: meter }) as unknown as ReadonlyFighter;

  it('plays on NOT READY -> READY only, not every frame while READY', () => {
    const onReady = vi.fn();
    const bar = new SpecialMeterBar(fakeScene(), 0, 0, 100, false, onReady);
    for (const meter of [0, 10, 29, 30, 30, 45, 60, 60, 100, 100]) bar.update(fighterWith(meter));
    expect(onReady).toHaveBeenCalledTimes(1);
    bar.update(fighterWith(0)); // special used
    bar.update(fighterWith(30)); // charged again
    expect(onReady).toHaveBeenCalledTimes(2);
  });

  it('fighters without specials never trigger it', () => {
    const onReady = vi.fn();
    const bar = new SpecialMeterBar(fakeScene(), 0, 0, 100, false, onReady);
    const noSpecials = { config: fighterB, specialMeter: 100 } as unknown as ReadonlyFighter;
    bar.update(noSpecials);
    expect(onReady).not.toHaveBeenCalled();
  });
});

describe('shared audio services', () => {
  const listeners = { step: 0, unlocked: 0, cache: 0, keydown: 0 };
  beforeEach(() => {
    Object.assign(listeners, { step: 0, unlocked: 0, cache: 0, keydown: 0 });
    vi.stubGlobal('window', {
      addEventListener: () => listeners.keydown++,
      localStorage: { getItem: () => null, setItem: () => {} },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  function fakeGame() {
    const played: string[] = [];
    const game = {
      events: { on: () => listeners.step++ },
      sound: {
        locked: false,
        mute: false,
        on: () => listeners.unlocked++,
        play: (key: string) => played.push(key),
      },
      cache: { audio: { exists: () => true, events: { on: () => listeners.cache++ } } },
    };
    return { game, played };
  }
  const sceneOf = (game: unknown) => ({ game }) as unknown as Phaser.Scene;

  it('one set of services and listeners per game, however many scenes ask', () => {
    const { game, played } = fakeGame();
    const scenes = [sceneOf(game), sceneOf(game), sceneOf(game)];
    const first = gameAudio(scenes[0]!);
    for (const scene of scenes) {
      expect(gameAudio(scene)).toBe(first);
      expect(gameSfx(scene)).toBe(first.sfx);
    }
    expect(listeners).toEqual({ step: 1, unlocked: 1, cache: 1, keydown: 1 });
    gameSfx(scenes[2]!).play('menu-confirm');
    expect(played).toEqual(['sfx:menu-confirm']);
  });

  it('mute covers music and effects together', () => {
    const { game, played } = fakeGame();
    const audio = gameAudio(sceneOf(game));
    audio.setMuted(true);
    expect(audio.music.isMuted).toBe(true);
    expect(audio.sfx.play('punch')).toBe(false);
    audio.setMuted(false);
    expect(audio.sfx.play('punch')).toBe(true);
    expect(played).toEqual(['sfx:punch']);
  });
});

describe('sound effect files', () => {
  it.each(Object.keys(SFX) as SfxId[])('%s exists as Ogg and MP3', (id) => {
    for (const file of sfxFiles(id)) {
      expect(existsSync(join(__dirname, '..', 'public', file)), file).toBe(true);
    }
  });

  it('levels follow the mix: KO and special loudest, movement and UI quiet', () => {
    expect(SFX.ko.volume).toBeGreaterThan(SFX.punch.volume);
    expect(SFX.kick.volume).toBeGreaterThan(SFX.punch.volume);
    expect(SFX.jump.volume).toBeLessThan(SFX.landing.volume);
    for (const id of ['menu-move', 'menu-confirm', 'menu-back'] as const) {
      expect(SFX[id].volume).toBeLessThanOrEqual(0.5);
    }
  });
});
