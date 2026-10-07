import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FightSimulation } from '../src/core/FightSimulation';
import { collectStageAssets, stageArtKeys } from '../src/render/assets/stageAssets';
import {
  CALM_MOTION,
  CHEER_MOTION,
  MOOD_EXCITEMENT,
  approach,
  crowdOffset,
  handAngle,
  headPose,
  motionRates,
} from '../src/render/stage/stageMotion';
import { fighterA } from '../src/fighters/fighterA';
import { fighterB } from '../src/fighters/fighterB';
import { partnerArena } from '../src/stages/partnerArena';
import { partnerSummit } from '../src/stages/partnerSummit';
import { DEFAULT_STAGE_ID, STAGES, getStageConfig } from '../src/stages/stageRegistry';
import type { StageConfig } from '../src/types/stage';
import { FAST_TIMING, press } from './helpers';
import { jpegSize, readRgbaPng } from './png';

const art = partnerSummit.art!;
const publicPath = (path: string) => `public/${path}`;

describe('Partner Summit stage config', () => {
  it('is the default stage and keeps PARTNER ARENA registered as a fallback', () => {
    expect(DEFAULT_STAGE_ID).toBe('partner-summit');
    expect(getStageConfig('partner-summit')).toBe(partnerSummit);
    expect(STAGES).toContain(partnerArena);
  });

  it('has exactly the same arena as PARTNER ARENA (gameplay unchanged)', () => {
    const arena = ({ width, groundY, wallMargin }: StageConfig) => ({ width, groundY, wallMargin });
    expect(arena(partnerSummit)).toEqual(arena(partnerArena));
  });

  it('a fight plays out identically on both stages', () => {
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
    expect(trace(partnerSummit)).toEqual(trace(partnerArena));
  });
});

describe('Partner Summit art', () => {
  const background = jpegSize(publicPath(art.background.path));
  const inside = (x: number, y: number) =>
    x >= 0 && y >= 0 && x <= background.width && y <= background.height;

  it('every declared image exists; the art is wider than the screen and reaches the floor', () => {
    for (const asset of collectStageAssets([partnerSummit])) {
      expect(existsSync(publicPath(asset.path))).toBe(true);
    }
    expect(background.width).toBeGreaterThan(960);
    expect(art.top + background.height).toBeGreaterThanOrEqual(540);
    expect(art.top + background.height).toBeGreaterThan(partnerSummit.groundY);
  });

  it('crowd bands, barrier and performer pivots lie inside the background', () => {
    const crowd = art.crowd!;
    for (const r of [...crowd.bands, crowd.barrier]) {
      expect(inside(r.x, r.y) && inside(r.x + r.width, r.y + r.height)).toBe(true);
    }
    for (const p of art.performers ?? []) expect(inside(p.pivotX, p.pivotY)).toBe(true);
  });

  it('the barrier always hides the base of a bouncing crowd column, even when cheering', () => {
    const { bands, barrier } = art.crowd!;
    for (const band of bands) {
      const highestBase = band.y + band.height - CHEER_MOTION.crowdAmplitude;
      expect(highestBase).toBeGreaterThan(barrier.y);
      expect(band.y + band.height).toBeLessThanOrEqual(barrier.y + barrier.height);
    }
  });

  it('performer layers are cut-outs (clear corners, opaque middle)', () => {
    for (const performer of art.performers ?? []) {
      const png = readRgbaPng(publicPath(performer.image.path));
      // Tiny downscaled cut-outs: the feathered edge leaves a few units of alpha at most.
      expect(png.alpha(0, 0)).toBeLessThan(16);
      expect(png.alpha(Math.floor(png.width / 2), Math.floor(png.height / 2))).toBeGreaterThan(200);
    }
  });

  it('asset collection has no duplicates and the procedural stage needs no textures', () => {
    const keys = collectStageAssets(STAGES).map((asset) => asset.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(stageArtKeys(partnerSummit)).toHaveLength(1 + (art.performers?.length ?? 0));
    expect(stageArtKeys(partnerArena)).toEqual([]);
  });
});

describe('stage motion', () => {
  it('celebrating is faster and bigger than fighting', () => {
    expect(MOOD_EXCITEMENT).toEqual({ fight: 0, celebrate: 1, victory: 1.5 });
    expect(motionRates(0)).toEqual(CALM_MOTION);
    expect(motionRates(1)).toEqual(CHEER_MOTION);
    for (const key of Object.keys(CALM_MOTION) as (keyof typeof CALM_MOTION)[]) {
      expect(CHEER_MOTION[key]).toBeGreaterThan(CALM_MOTION[key]);
      const mid = motionRates(0.5)[key];
      expect(mid).toBeGreaterThan(CALM_MOTION[key]);
      expect(mid).toBeLessThan(CHEER_MOTION[key]);
    }
  });

  it('excitement eases toward the mood instead of jumping', () => {
    expect(approach(0, 1, 0.1, 2.5)).toBeCloseTo(0.25);
    expect(approach(0.9, 1, 0.1, 2.5)).toBe(1);
    expect(approach(1, 0, 0.1, 2.5)).toBeCloseTo(0.75);
  });

  it('crowd columns only bounce upward, within the amplitude, as a wave', () => {
    const offsets = [0, 1, 2, 3].map((column) => crowdOffset(0.2, column, 3));
    for (const value of offsets) {
      expect(value).toBeLessThanOrEqual(0);
      expect(value).toBeGreaterThanOrEqual(-3);
    }
    expect(new Set(offsets.map((v) => v.toFixed(3))).size).toBeGreaterThan(1);
  });

  it('the head looks one way then the other, never squashed to a sliver, while nodding', () => {
    expect(Math.sign(headPose(0.25, 0, 3).scaleX)).toBe(1);
    expect(Math.sign(headPose(0.75, 0, 3).scaleX)).toBe(-1);
    for (let phase = 0; phase < 1; phase += 0.005) {
      expect(Math.abs(headPose(phase, 0, 3).scaleX)).toBeGreaterThanOrEqual(0.7);
    }
    expect(headPose(0.25, 0.25, 3).angle).toBeCloseTo(3);
  });

  it('the hand rocks within its range', () => {
    expect(handAngle(0.25, 10)).toBeCloseTo(10);
    expect(handAngle(0.75, 28)).toBeCloseTo(-28);
  });
});
