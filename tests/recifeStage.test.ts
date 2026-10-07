import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import { FightSimulation, type SimulationEvent } from '../src/core/FightSimulation';
import { MatchSystem } from '../src/core/systems/MatchSystem';
import { fighterA } from '../src/fighters/fighterA';
import { fighterB } from '../src/fighters/fighterB';
import { ROSTER } from '../src/fighters/roster';
import { collectStageAssets, stageArtKeys } from '../src/render/assets/stageAssets';
import { crowdReaction } from '../src/render/stage/crowdReaction';
import { IllustratedStageView } from '../src/render/stage/IllustratedStageView';
import { StageFlyoverView } from '../src/render/stage/StageFlyoverView';
import {
  MOOD_EXCITEMENT,
  REACTION_EXCITEMENT,
  bannerWave,
  crowdColumnStyle,
  crowdGroupOffset,
  motionRates,
  visualRng,
} from '../src/render/stage/stageMotion';
import { partnerArena } from '../src/stages/partnerArena';
import { recife } from '../src/stages/recife';
import { DEFAULT_STAGE_ID, STAGES, getStageConfig } from '../src/stages/stageRegistry';
import { STORY_LOCATIONS, stageIdForLocation } from '../src/story/locations';
import { STORY_PROFILES, quickFightStageId, storyRouteFor } from '../src/story/storyProfiles';
import { legStageId } from '../src/story/storyProgress';
import type { AttackConfig } from '../src/types/fighter';
import type { StageConfig } from '../src/types/stage';
import { FAST_TIMING, press } from './helpers';
import { jpegSize, readRgbaPng } from './png';

const art = recife.art!;
const flyover = art.flyover!;
const publicPath = (path: string) => join(__dirname, '..', 'public', path);

/** Texture sizes the fake scene reports (the real files' sizes). */
function textureSize(key: string): { width: number; height: number } {
  if (key === art.background.key) return jpegSize(publicPath(art.background.path));
  const image = [flyover.plane, flyover.propeller, flyover.banner].find((i) => i.key === key);
  if (!image) return { width: 1, height: 1 };
  const png = readRgbaPng(publicPath(image.path));
  return { width: png.width, height: png.height };
}

/** A scene stand-in that records every game object created and destroyed. */
function fakeScene() {
  const stats = { created: 0, destroyed: 0 };
  const object = (key?: string): Record<string, unknown> => {
    const state: Record<string, unknown> = { visible: true, ...(key ? textureSize(key) : {}) };
    const proxy: Record<string, unknown> = new Proxy(state, {
      get(target, prop: string) {
        if (prop in target) return target[prop];
        return (...args: unknown[]) => {
          if (prop === 'destroy') stats.destroyed++;
          if (prop === 'setVisible') target.visible = args[0];
          if (prop === 'setPosition') [target.x, target.y] = args;
          return proxy;
        };
      },
    });
    stats.created++;
    return proxy;
  };
  const scene = {
    add: {
      image: (_x: number, _y: number, key: string) => object(key),
      graphics: () => object(),
    },
    textures: {
      exists: () => true,
      get: (key: string) => ({ getSourceImage: () => textureSize(key) }),
    },
  };
  return { scene: scene as unknown as Phaser.Scene, stats };
}

describe('RECIFE stage config', () => {
  it('is registered with its place, and the default stage is unchanged', () => {
    expect(getStageConfig('recife')).toBe(recife);
    expect(STAGES).toContain(recife);
    expect(DEFAULT_STAGE_ID).toBe('partner-summit');
    expect(recife.displayName).toBe('RECIFE');
    expect(recife.location).toBe('MARCO ZERO - RECIFE, PE');
  });

  it('has exactly the same arena as the other stages (gameplay unchanged)', () => {
    const arena = ({ width, groundY, wallMargin }: StageConfig) => ({ width, groundY, wallMargin });
    expect(arena(recife)).toEqual(arena(partnerArena));
    const trace = (stage: StageConfig) => {
      const sim = new FightSimulation({
        fighters: [fighterA, fighterB],
        stage,
        roundTiming: FAST_TIMING,
      });
      const out: string[] = [];
      for (let f = 0; f < 240; f++) {
        sim.step([
          press({ right: f < 90, punch: f % 20 === 0, kick: f % 37 === 0 }),
          press({ left: f < 60, block: f > 120 }),
        ]);
        const [a, b] = sim.fighters;
        out.push(`${a.position.x},${a.health},${a.state}|${b.position.x},${b.health},${b.state}`);
      }
      return out;
    };
    expect(trace(recife)).toEqual(trace(partnerArena));
  });

  it('ships its art: background at the display size, plane, propeller and banner with alpha', () => {
    expect(jpegSize(publicPath(art.background.path))).toEqual({ width: 1075, height: 605 });
    for (const image of [flyover.plane, flyover.propeller, flyover.banner]) {
      expect(existsSync(publicPath(image.path)), image.path).toBe(true);
      const png = readRgbaPng(publicPath(image.path));
      // Transparent around the shape, opaque inside it.
      expect(png.alpha(0, 0), image.path).toBe(0);
      expect(png.alpha(Math.floor(png.width / 2), Math.floor(png.height / 2))).toBeGreaterThan(200);
    }
    // The source and its reproducible preparation are versioned with the stage.
    expect(existsSync(join(__dirname, '..', 'scripts/stage-art/recife/source.png'))).toBe(true);
    expect(existsSync(join(__dirname, '..', 'scripts/stage-art/recife/prepare_recife.py'))).toBe(
      true,
    );
  });

  it('loads every Recife image at boot (and needs them all to draw the art)', () => {
    const keys = collectStageAssets(STAGES).map((asset) => asset.key);
    const expected = [art.background, flyover.plane, flyover.propeller, flyover.banner].map(
      (image) => image.key,
    );
    for (const key of expected) expect(keys.filter((k) => k === key)).toHaveLength(1);
    expect(stageArtKeys(recife).sort()).toEqual([...expected].sort());
  });

  it('keeps the crowd above the barrier and the bands inside the art', () => {
    const crowd = art.crowd!;
    const { width, height } = jpegSize(publicPath(art.background.path));
    for (const band of crowd.bands) {
      expect(band.x + band.width).toBeLessThanOrEqual(width);
      // The barrier copy covers every column's base, so its bounce never shows.
      expect(band.y + band.height).toBeGreaterThan(crowd.barrier.y);
      expect(band.y + band.height).toBeLessThanOrEqual(crowd.barrier.y + crowd.barrier.height);
    }
    expect(crowd.barrier.y + crowd.barrier.height).toBeLessThan(height);
    // Fighters stand on the Marco Zero floor, in front of the barrier.
    expect(art.top + crowd.barrier.y + crowd.barrier.height).toBeLessThan(recife.groundY);
  });
});

describe('RECIFE is picked by place, never by fighter', () => {
  it('a fight in Recife (story leg or location) uses the RECIFE stage', () => {
    expect(STORY_LOCATIONS.find((l) => l.id === 'recife')?.stageId).toBe('recife');
    expect(stageIdForLocation('recife')).toBe('recife');
    expect(legStageId({ opponent: 'romualdo', destination: 'recife' })).toBe('recife');
    // Places without their own stage use the default; an explicit leg stage still wins.
    for (const place of ['sao-paulo', 'joinville', 'portugal', 'russia']) {
      expect(stageIdForLocation(place)).toBe(DEFAULT_STAGE_ID);
    }
    expect(
      legStageId({ opponent: 'filipe', destination: 'recife', stageId: 'partner-arena' }),
    ).toBe('partner-arena');
  });

  it('every campaign fight takes its stage from where it happens', () => {
    for (const profile of STORY_PROFILES) {
      for (const leg of storyRouteFor(profile.fighterId) ?? []) {
        expect(legStageId(leg)).toBe(stageIdForLocation(leg.destination));
      }
    }
  });

  it('quick fights: the rival’s home stage, else the player’s home stage', () => {
    // FIGHTER_B (the quick-fight CPU) has no home: the player's city decides.
    expect(quickFightStageId('augusto', 'fighter-b')).toBe('recife');
    expect(quickFightStageId('filipe', 'fighter-b')).toBe('recife');
    expect(quickFightStageId('joao-guiotti', 'fighter-b')).toBe(DEFAULT_STAGE_ID);
    expect(quickFightStageId('fighter-a', 'fighter-b')).toBe(DEFAULT_STAGE_ID);
    // A rival from Recife brings the fight to Recife.
    expect(quickFightStageId('joao-guiotti', 'filipe')).toBe('recife');
  });

  it('no stage code or config mentions a fighter id', () => {
    const ids = ROSTER.map((fighter) => fighter.id);
    const dirs = ['src/stages', 'src/render/stage'];
    for (const dir of dirs) {
      for (const file of readdirSync(join(__dirname, '..', dir))) {
        const source = readFileSync(join(__dirname, '..', dir, file), 'utf8');
        for (const id of ids) expect(source, `${dir}/${file}`).not.toContain(`'${id}'`);
      }
    }
  });
});

describe('Recife crowd', () => {
  it('moves in groups: different loops, speeds, sizes and delays', () => {
    const styles = Array.from({ length: 54 }, (_, i) => crowdColumnStyle(i));
    expect(new Set(styles.map((s) => s.loop)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(styles.map((s) => s.speed.toFixed(2))).size).toBeGreaterThan(30);
    expect(new Set(styles.map((s) => s.phase.toFixed(2))).size).toBeGreaterThan(30);
    // Some people only join in on big moments.
    expect(styles.some((s) => s.joinAt > 0)).toBe(true);
    expect(styles.some((s) => s.joinAt === 0)).toBe(true);
  });

  it('only ever lifts columns (the barrier hides their base) and sways at most a pixel', () => {
    for (let i = 0; i < 54; i++) {
      const style = crowdColumnStyle(i);
      for (let phase = 0; phase < 2; phase += 0.05) {
        const offset = crowdGroupOffset(style, phase, 4, 1.5);
        expect(offset.y).toBeLessThanOrEqual(0);
        expect(Math.abs(offset.x)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('reacts more to bigger moments and celebrates the match winner the most', () => {
    expect(REACTION_EXCITEMENT.bigHit).toBeLessThan(REACTION_EXCITEMENT.special);
    expect(REACTION_EXCITEMENT.special).toBeLessThan(REACTION_EXCITEMENT.ko);
    expect(MOOD_EXCITEMENT.fight).toBeLessThan(MOOD_EXCITEMENT.celebrate);
    expect(MOOD_EXCITEMENT.celebrate).toBeLessThan(MOOD_EXCITEMENT.victory);
    expect(motionRates(MOOD_EXCITEMENT.victory).crowdAmplitude).toBeGreaterThan(
      motionRates(MOOD_EXCITEMENT.celebrate).crowdAmplitude,
    );
  });

  it('maps fight events to reactions: KO, special, strong hits; light hits do nothing', () => {
    const attack = (state: AttackConfig['state'], damage: number) =>
      ({ state, damage }) as AttackConfig;
    const hit = (a: AttackConfig) =>
      ({
        type: 'hit',
        attackerIndex: 0,
        defenderIndex: 1,
        attack: a,
        point: { x: 0, y: 0 },
      }) as SimulationEvent;
    expect(crowdReaction({ ...hit(attack('punch', 6)), type: 'koHit' } as SimulationEvent)).toBe(
      'ko',
    );
    expect(crowdReaction(hit(attack('special', 18)))).toBe('special');
    expect(crowdReaction(hit(attack('kick', 11)))).toBe('bigHit');
    expect(crowdReaction(hit(attack('punch', 6)))).toBeNull();
    expect(crowdReaction({ type: 'specialStart', fighterIndex: 0 })).toBe('special');
    expect(crowdReaction({ type: 'fightStart' })).toBeNull();
  });

  it('knows when a round also wins the match (bigger cheer), without changing the match', () => {
    const match = new MatchSystem({ roundsToWin: 2, maxRounds: 5 });
    expect(match.wouldWinMatch(0)).toBe(false);
    match.recordRound({ winnerIndex: 0, reason: 'ko', perfect: false } as never);
    expect(match.wouldWinMatch(0)).toBe(true);
    expect(match.wouldWinMatch(1)).toBe(false);
    expect(match.roundWins).toEqual([1, 0]);
  });
});

describe('Recife plane and banner', () => {
  it('has a valid flight: on-screen altitude, speed, pause range, strips', () => {
    expect(flyover.y).toBeGreaterThan(90); // below the HUD
    expect(flyover.y + 90).toBeLessThan(art.top + art.crowd!.bands[1]!.y); // above the crowd
    expect(flyover.speed).toBeGreaterThan(0);
    expect(flyover.pauseMs[0]).toBeGreaterThan(0);
    expect(flyover.pauseMs[1]).toBeGreaterThanOrEqual(flyover.pauseMs[0]);
    expect(flyover.bannerStrips).toBeGreaterThan(4);
    expect(flyover.scrollFactor).toBeGreaterThanOrEqual(0);
    expect(flyover.scrollFactor).toBeLessThan(1);
  });

  it('flies in, crosses, leaves, pauses and comes back, one flight every ~15-30 s', () => {
    const { scene, stats } = fakeScene();
    const view = new StageFlyoverView(scene, flyover, recife.id, recife.width - 960);
    const created = stats.created;
    const events: { at: number; flying: boolean }[] = [];
    let flying = false;
    for (let t = 0; t <= 120_000; t += 50) {
      view.update(t);
      if (view.isFlying !== flying) {
        flying = view.isFlying;
        events.push({ at: t, flying });
      }
    }
    expect(stats.created).toBe(created); // the same objects reused for every flight
    expect(events[0]).toEqual({ at: flyover.firstDelayMs, flying: true });
    const starts = events.filter((e) => e.flying).map((e) => e.at);
    expect(starts.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < starts.length; i++) {
      const period = (starts[i]! - starts[i - 1]!) / 1000;
      expect(period).toBeGreaterThanOrEqual(15);
      expect(period).toBeLessThanOrEqual(30);
    }
    // A flight takes long enough to read the banner.
    expect(view.flightSeconds).toBeGreaterThan(10);
  });

  it('banner waves like cloth: still by the tow lines, freer toward the tail', () => {
    const n = flyover.bannerStrips;
    for (let t = 0; t < 3; t += 0.1) {
      expect(Math.abs(bannerWave(t, 0, n, flyover.waveAmplitude))).toBe(0);
      expect(Math.abs(bannerWave(t, n - 1, n, flyover.waveAmplitude))).toBeLessThanOrEqual(
        flyover.waveAmplitude,
      );
    }
    const tail = Array.from({ length: 30 }, (_, i) => bannerWave(i * 0.1, n - 1, n, 3));
    expect(Math.max(...tail) - Math.min(...tail)).toBeGreaterThan(4);
  });

  it('visual timing uses its own seeded generator (same sequence every time)', () => {
    const a = visualRng(7);
    const b = visualRng(7);
    const seq = Array.from({ length: 5 }, () => a());
    expect(Array.from({ length: 5 }, () => b())).toEqual(seq);
    expect(seq.every((v) => v >= 0 && v < 1)).toBe(true);
  });
});

describe('Recife stage view lifecycle', () => {
  it('creates everything once, nothing per frame, and destroys it all on shutdown', () => {
    const { scene, stats } = fakeScene();
    const view = new IllustratedStageView(scene, recife, art);
    const created = stats.created;
    expect(view.objectCount).toBeGreaterThan(40); // background, crowd columns, barrier, flashes
    for (let t = 0; t < 60_000; t += 16) {
      if (t === 10_000) view.react('ko');
      if (t === 12_000) view.setMood('victory');
      if (t === 20_000) view.setMood('fight');
      view.update(t);
    }
    expect(stats.created).toBe(created);
    view.destroy();
    expect(stats.destroyed).toBe(created);
  });

  it('a restarted fight scene builds the same stage again (no duplicated crowd or plane)', () => {
    const counts = [0, 1, 2].map(() => {
      const { scene, stats } = fakeScene();
      const view = new IllustratedStageView(scene, recife, art);
      view.update(0);
      view.update(5000);
      view.destroy();
      return { created: stats.created, leftover: stats.created - stats.destroyed };
    });
    expect(new Set(counts.map((c) => c.created)).size).toBe(1);
    expect(counts.every((c) => c.leftover === 0)).toBe(true);
  });
});
