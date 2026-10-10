import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: { BlendModes: { ADD: 1, NORMAL: 0 } } }));

import { dmitry } from '../src/fighters/dmitry';
import { LIGHTNING_THEME } from '../src/render/special/lightningTheme';
import type { MoveFrame } from '../src/render/special/specialTheme';
import type { ReadonlyFighter } from '../src/core/fighter/ReadonlyFighter';

/** A Graphics stand-in that records the bolts' segments (lineBetween) and any other call. */
function recorder(worldView?: { x: number; y: number; width: number; height: number }) {
  const lines: [number, number, number, number][] = [];
  const g: Record<string, unknown> = new Proxy(
    { scene: worldView ? { cameras: { main: { worldView } } } : undefined },
    {
      get(target, key: string) {
        if (key in target) return (target as Record<string, unknown>)[key];
        return (...args: number[]) => {
          if (key === 'lineBetween') lines.push(args as [number, number, number, number]);
          for (const value of args) {
            if (typeof value === 'number') expect(Number.isFinite(value), key).toBe(true);
          }
          return g;
        };
      },
    },
  );
  return { g, lines };
}

const strike = dmitry.specials[0]!;
const noImage = { available: false, show: () => {} };

function frame(phase: MoveFrame['phase'], t: number, g: unknown, glow: unknown): MoveFrame {
  const fighter = { position: { x: 300, y: 470 }, direction: 1 } as unknown as ReadonlyFighter;
  return {
    g: g as unknown as MoveFrame['g'],
    glow: glow as MoveFrame['glow'],
    fighter,
    attack: strike,
    phase,
    frame: strike.startupFrames + 2,
    t,
    direction: 1,
    // What SpecialEffects passes for this hitbox: far off-stage, which the theme must ignore.
    hand: { x: -1300, y: -30 },
    front: { x: 1900, y: -30 },
    box: { left: -1300, right: 1900, top: -530, bottom: 470 },
    emblem: noImage,
    glyph: noImage,
    impacting: false,
  };
}

describe('ALAIO STRIKE! storm VFX', () => {
  it('rains lightning over the whole visible stage (the camera view), not around the hitbox', () => {
    const view = { x: 240, y: 0, width: 960, height: 540 };
    const { g, lines } = recorder(view);
    LIGHTNING_THEME.drawMove(frame('active', 0.5, g, recorder(view).g));
    const xs = lines.flatMap(([x0, , x1]) => [x0, x1]);
    // Bolts from the left quarter to the right quarter of the screen, all inside the view.
    expect(Math.min(...xs)).toBeLessThan(view.x + view.width * 0.2);
    expect(Math.max(...xs)).toBeGreaterThan(view.x + view.width * 0.8);
    expect(Math.min(...xs)).toBeGreaterThan(view.x - 80);
    expect(Math.max(...xs)).toBeLessThan(view.x + view.width + 80);
    // They reach the floor.
    expect(Math.max(...lines.flatMap(([, y0, , y1]) => [y0, y1]))).toBeGreaterThanOrEqual(469);
  });

  it('draws every phase and the impact with finite numbers, with or without a camera', () => {
    for (const view of [undefined, { x: 0, y: 0, width: 960, height: 540 }]) {
      for (const phase of ['startup', 'active', 'recovery'] as const) {
        for (const t of [0, 0.5, 1]) {
          LIGHTNING_THEME.drawMove(frame(phase, t, recorder(view).g, recorder(view).g));
        }
      }
      for (const blocked of [false, true]) {
        for (const t of [0, 0.3, 0.99]) {
          const { g } = recorder(view);
          LIGHTNING_THEME.drawImpact({
            g: g as unknown as MoveFrame['g'],
            glow: recorder(view).g as unknown as MoveFrame['glow'],
            x: 600,
            y: 380,
            direction: -1,
            t,
            blocked,
            hit: 0,
            hits: 1,
            emblem: noImage,
          });
        }
      }
    }
  });
});
