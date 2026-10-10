import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: { BlendModes: { ADD: 1, NORMAL: 0 } } }));

import type { ReadonlyFighter } from '../src/core/fighter/ReadonlyFighter';
import { douglas } from '../src/fighters/douglas';
import { DRAGON_THEME } from '../src/render/special/dragonTheme';
import type { MoveFrame } from '../src/render/special/specialTheme';

/** A Graphics stand-in: counts draw calls and checks every number is finite. */
function recorder(worldView?: { x: number; y: number; width: number; height: number }) {
  let calls = 0;
  const g: Record<string, unknown> = new Proxy(
    { scene: worldView ? { cameras: { main: { worldView } } } : undefined },
    {
      get(target, key: string) {
        if (key in target) return (target as Record<string, unknown>)[key];
        return (...args: unknown[]) => {
          calls++;
          for (const value of args) {
            if (typeof value === 'number') expect(Number.isFinite(value), key).toBe(true);
          }
          return g;
        };
      },
    },
  );
  return { g, count: () => calls };
}

const move = douglas.specials[0]!;
const noImage = { available: false, show: () => {} };
const total = move.startupFrames + move.activeFrames + move.recoveryFrames;

function frameAt(frame: number, g: unknown, glow: unknown, direction: 1 | -1 = 1): MoveFrame {
  const phase =
    frame < move.startupFrames
      ? 'startup'
      : frame < move.startupFrames + move.activeFrames
        ? 'active'
        : 'recovery';
  const start =
    phase === 'startup'
      ? 0
      : phase === 'active'
        ? move.startupFrames
        : move.startupFrames + move.activeFrames;
  const length =
    phase === 'startup'
      ? move.startupFrames
      : phase === 'active'
        ? move.activeFrames
        : move.recoveryFrames;
  const fighter = { position: { x: 400, y: 470 }, direction } as unknown as ReadonlyFighter;
  return {
    g: g as MoveFrame['g'],
    glow: glow as MoveFrame['glow'],
    fighter,
    attack: move,
    phase,
    frame,
    t: Math.min(1, (frame - start + 1) / length),
    direction,
    hand: { x: 400 + direction * 30, y: 370 },
    front: { x: 400 + direction * 190, y: 370 },
    box: { left: 430, right: 590, top: 320, bottom: 420 },
    emblem: noImage,
    glyph: noImage,
    impacting: false,
  };
}

describe('CÓLERA DOS 100 DRAGÕES VFX', () => {
  it('draws every frame of the move, both directions, with or without a camera', () => {
    for (const view of [undefined, { x: 0, y: 0, width: 960, height: 540 }]) {
      for (const dir of [1, -1] as const) {
        for (let f = 0; f < total; f++) {
          DRAGON_THEME.drawMove(frameAt(f, recorder(view).g, recorder(view).g, dir));
        }
      }
    }
  });

  it('stays cheap: a bounded number of draw calls per frame (pooled Graphics, no objects)', () => {
    let worst = 0;
    for (let f = 0; f < total; f++) {
      const g = recorder();
      const glow = recorder();
      DRAGON_THEME.drawMove(frameAt(f, g.g, glow.g));
      worst = Math.max(worst, g.count() + glow.count());
    }
    expect(worst).toBeGreaterThan(200); // many dragons on screen at the peak
    expect(worst).toBeLessThan(2500);
  });

  it('the flood is on screen during the active window and gone by the end of recovery', () => {
    const at = (f: number) => {
      const g = recorder();
      const glow = recorder();
      DRAGON_THEME.drawMove(frameAt(f, g.g, glow.g));
      return g.count() + glow.count();
    };
    expect(at(move.startupFrames + 8)).toBeGreaterThan(at(1) * 2);
    expect(at(total - 1)).toBeLessThan(at(move.startupFrames + 8) / 4);
  });

  it('impacts: bites, the final dragon (bigger on a KO), hit or blocked', () => {
    for (const hit of [0, 1, 4]) {
      for (const blocked of [false, true]) {
        for (const ko of [false, true]) {
          for (const t of [0, 0.1, 0.5, 0.99]) {
            const g = recorder();
            DRAGON_THEME.drawImpact({
              g: g.g as unknown as MoveFrame['g'],
              glow: recorder().g as unknown as MoveFrame['glow'],
              x: 600,
              y: 380,
              direction: -1,
              t,
              blocked,
              hit,
              hits: 5,
              ko,
              emblem: noImage,
            });
          }
        }
      }
    }
  });
});
