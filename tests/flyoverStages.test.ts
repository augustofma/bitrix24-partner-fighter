import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import { FightSimulation } from '../src/core/FightSimulation';
import { fighterA } from '../src/fighters/fighterA';
import { fighterB } from '../src/fighters/fighterB';
import { collectStageAssets, stageArtKeys } from '../src/render/assets/stageAssets';
import { IllustratedStageView } from '../src/render/stage/IllustratedStageView';
import { StageFlyoverView } from '../src/render/stage/StageFlyoverView';
import { joinville } from '../src/stages/joinville';
import { joinvilleZopu } from '../src/stages/joinvilleZopu';
import { partnerArena } from '../src/stages/partnerArena';
import { recife } from '../src/stages/recife';
import { russia } from '../src/stages/russia';
import { STAGES, getStageConfig } from '../src/stages/stageRegistry';
import { stageIdForLocation } from '../src/story/locations';
import { quickFightStageId, storyRouteFor } from '../src/story/storyProfiles';
import {
  arriveForFight,
  recordStoryMatch,
  startStoryOn,
  storyMatchSetup,
} from '../src/story/storyProgress';
import type { StageConfig } from '../src/types/stage';
import { FAST_TIMING, press } from './helpers';
import { jpegSize, readRgbaPng } from './png';

/*
 * Every illustrated stage with a plane flyover (Recife, Joinville) follows the same rules:
 * same arena as the other stages, art loaded at boot, the plane flies behind the skyline
 * occluder, crowd columns hidden by the barrier, nothing created per frame.
 */

const publicPath = (path: string) => join(__dirname, '..', 'public', path);
const FLYOVER_STAGES = [recife, joinville, joinvilleZopu, russia] as const;

function images(stage: StageConfig) {
  const art = stage.art!;
  const f = art.flyover!;
  return [art.background, f.plane, f.propeller!, f.banner, f.skyline];
}

function textureSize(stage: StageConfig, key: string) {
  const image = images(stage).find((i) => i.key === key);
  if (!image) return { width: 1, height: 1 };
  if (image.path.endsWith('.jpg')) return jpegSize(publicPath(image.path));
  const png = readRgbaPng(publicPath(image.path));
  return { width: png.width, height: png.height };
}

function fakeScene(stage: StageConfig) {
  const stats = { created: 0, destroyed: 0, imageKeys: [] as string[] };
  const object = (key?: string): Record<string, unknown> => {
    const state: Record<string, unknown> = key ? { ...textureSize(stage, key) } : {};
    const proxy: Record<string, unknown> = new Proxy(state, {
      get(target, prop: string) {
        if (prop in target) return target[prop];
        return () => {
          if (prop === 'destroy') stats.destroyed++;
          return proxy;
        };
      },
    });
    stats.created++;
    return proxy;
  };
  const scene = {
    add: {
      image: (_x: number, _y: number, key: string) => {
        stats.imageKeys.push(key);
        return object(key);
      },
      graphics: () => object(),
    },
    textures: {
      exists: () => true,
      get: (key: string) => ({ getSourceImage: () => textureSize(stage, key) }),
    },
  };
  return { scene: scene as unknown as Phaser.Scene, stats };
}

describe.each(FLYOVER_STAGES)('$displayName stage', (stage) => {
  const art = stage.art!;
  const flyover = art.flyover!;

  it('is registered and has exactly the same arena (gameplay unchanged)', () => {
    expect(getStageConfig(stage.id)).toBe(stage);
    const arena = ({ width, groundY, wallMargin }: StageConfig) => ({ width, groundY, wallMargin });
    expect(arena(stage)).toEqual(arena(partnerArena));
    const trace = (s: StageConfig) => {
      const sim = new FightSimulation({
        fighters: [fighterA, fighterB],
        stage: s,
        roundTiming: FAST_TIMING,
      });
      const out: string[] = [];
      for (let f = 0; f < 200; f++) {
        sim.step([press({ right: f < 90, punch: f % 20 === 0 }), press({ left: f < 60 })]);
        out.push(sim.fighters.map((x) => `${x.position.x},${x.health},${x.state}`).join('|'));
      }
      return out;
    };
    expect(trace(stage)).toEqual(trace(partnerArena));
  });

  it('ships and loads every layer at boot (background, plane, propeller, banner, skyline)', () => {
    expect(jpegSize(publicPath(art.background.path))).toEqual({ width: 1075, height: 605 });
    const keys = collectStageAssets(STAGES).map((a) => a.key);
    for (const image of images(stage)) {
      expect(existsSync(publicPath(image.path)), image.path).toBe(true);
      expect(keys.filter((k) => k === image.key)).toHaveLength(1);
    }
    expect(stageArtKeys(stage).sort()).toEqual(
      images(stage)
        .map((i) => i.key)
        .sort(),
    );
  });

  it('covers the whole art (no gap at the bottom of the screen) and keeps feet on the floor', () => {
    expect(art.top + 605).toBeGreaterThanOrEqual(540);
    const crowd = art.crowd!;
    expect(art.top + crowd.barrier.y + crowd.barrier.height).toBeLessThan(stage.groundY);
    for (const band of crowd.bands) {
      // The barrier copy hides every column's base while it bounces.
      expect(band.y + band.height).toBeGreaterThan(crowd.barrier.y);
      expect(band.y + band.height).toBeLessThanOrEqual(crowd.barrier.y + crowd.barrier.height);
      expect(band.x).toBeGreaterThanOrEqual(crowd.barrier.x);
      expect(band.x + band.width).toBeLessThanOrEqual(crowd.barrier.x + crowd.barrier.width);
    }
    expect(crowd.style).toBe('groups');
  });

  it('the plane flies behind the skyline: sky clear, architecture opaque, flight inside it', () => {
    const skyline = readRgbaPng(publicPath(flyover.skyline.path));
    expect(skyline.alpha(Math.floor(skyline.width / 2), 2)).toBe(0);
    let opaqueAtBottom = 0;
    for (let x = 0; x < skyline.width; x++)
      if (skyline.alpha(x, skyline.height - 1) > 0) opaqueAtBottom++;
    expect(opaqueAtBottom).toBeGreaterThan(skyline.width * 0.1);
    const banner = readRgbaPng(publicPath(flyover.banner.path));
    const lowest =
      flyover.y + (Math.max(0, flyover.bannerOffsetY) + banner.height) * flyover.scale + 4;
    expect(lowest).toBeLessThan(art.top + skyline.height);
    expect(flyover.y).toBeGreaterThan(90); // under the HUD
    expect(flyover.scale).toBeLessThan(1);
  });

  it('draw order: background < plane and banner < skyline < crowd; nothing per frame', () => {
    const { scene, stats } = fakeScene(stage);
    const view = new IllustratedStageView(scene, stage, art);
    const order = stats.imageKeys;
    expect(order.indexOf(art.background.key)).toBe(0);
    const lastFlyover = Math.max(
      order.indexOf(flyover.plane.key),
      order.lastIndexOf(flyover.banner.key),
    );
    const skylineAt = order.indexOf(flyover.skyline.key);
    expect(skylineAt).toBeGreaterThan(lastFlyover);
    expect(order.indexOf(art.background.key, skylineAt)).toBeGreaterThan(skylineAt);
    const created = stats.created;
    for (let t = 0; t < 60_000; t += 16) {
      if (t === 9000) view.react('ko');
      if (t === 12_000) view.setMood('victory');
      view.update(t);
    }
    expect(stats.created).toBe(created);
    view.destroy();
    expect(stats.destroyed).toBe(created);
  });

  it('flies in, crosses, leaves and comes back every ~15-30 s, reusing the same objects', () => {
    const { scene, stats } = fakeScene(stage);
    const view = new StageFlyoverView(scene, flyover, stage.id, stage.width - 960);
    const created = stats.created;
    const starts: number[] = [];
    let flying = false;
    for (let t = 0; t <= 150_000; t += 50) {
      view.update(t);
      if (view.isFlying && !flying) starts.push(t);
      flying = view.isFlying;
    }
    expect(stats.created).toBe(created);
    expect(starts.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < starts.length; i++) {
      const period = (starts[i]! - starts[i - 1]!) / 1000;
      expect(period).toBeGreaterThanOrEqual(15);
      expect(period).toBeLessThanOrEqual(30);
    }
  });
});

describe('JOINVILLE is picked by place', () => {
  it('Joinville fights use it: Augusto meets Romualdo there, at the gate', () => {
    expect(stageIdForLocation('joinville')).toBe('joinville');
    // Augusto: Recife -> Portugal -> Russia -> Joinville (Romualdo).
    let progress = startStoryOn('augusto', storyRouteFor('augusto')!);
    while (progress.opponent !== 'romualdo') {
      progress = recordStoryMatch(arriveForFight(progress), true);
    }
    const fight = arriveForFight(progress);
    expect(fight).toMatchObject({ currentLocation: 'joinville', opponent: 'romualdo' });
    expect(storyMatchSetup(fight, 'normal').stageId).toBe('joinville');
  });

  it('quick fights: a rival (or player) from Joinville brings the fight to the gate', () => {
    expect(quickFightStageId('joao-guiotti', 'romualdo')).toBe('joinville');
    expect(quickFightStageId('romualdo', 'fighter-b')).toBe('joinville');
  });
});
