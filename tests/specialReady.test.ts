import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => {
  class Circle {
    constructor(
      public x: number,
      public y: number,
      public radius: number,
    ) {}
    static Contains() {
      return true;
    }
  }
  const Phaser = { Geom: { Circle }, Core: { Events: { BLUR: 'blur' } } };
  return { default: Phaser };
});

import { augusto } from '../src/fighters/augusto';
import { filipe } from '../src/fighters/filipe';
import { getFighterConfig } from '../src/fighters/roster';
import {
  SPECIAL_BUTTON_IDLE,
  SPECIAL_BUTTON_READY,
  SpecialReadyTracker,
  isSpecialReady,
  specialButtonStyle,
  specialReadyThreshold,
} from '../src/ui/hud/specialReady';
import { TouchControls } from '../src/ui/TouchControls';
import type { FighterConfig, SpecialMoveConfig } from '../src/types/fighter';

const withCosts = (...costs: number[]): Pick<FighterConfig, 'specials'> => ({
  specials: costs.map((meterCost) => ({ ...filipe.specials[0]!, meterCost }) as SpecialMoveConfig),
});

describe('SPECIAL READY threshold (from the configured specials)', () => {
  it("uses each fighter's real special cost, not a full bar", () => {
    expect(specialReadyThreshold(filipe)).toBe(35); // MINDHUB AGENT
    expect(specialReadyThreshold(augusto)).toBe(30); // 24ZAP COMBO
  });

  it('below the cost is not ready; at or above it is', () => {
    expect(isSpecialReady(filipe, 34)).toBe(false);
    expect(isSpecialReady(filipe, 35)).toBe(true);
    expect(isSpecialReady(filipe, 80)).toBe(true);
    expect(isSpecialReady(augusto, 29)).toBe(false);
    expect(isSpecialReady(augusto, 30)).toBe(true);
  });

  it('with several specials, the cheapest one decides', () => {
    expect(specialReadyThreshold(withCosts(60, 25, 40))).toBe(25);
    expect(isSpecialReady(withCosts(60, 25), 25)).toBe(true);
  });

  it('a special that can never be paid (cost above the meter) does not count', () => {
    expect(specialReadyThreshold(withCosts(150))).toBeNull();
    expect(specialReadyThreshold(withCosts(150, 50))).toBe(50);
  });

  it('fighters without specials are never ready, even with a full meter', () => {
    for (const id of ['fighter-a', 'fighter-b']) {
      const config = getFighterConfig(id);
      expect(specialReadyThreshold(config), id).toBeNull();
      expect(isSpecialReady(config, 100), id).toBe(false);
    }
  });
});

describe('SPECIAL READY transitions', () => {
  it('fires "ready" once when crossing the threshold, not every frame', () => {
    const tracker = new SpecialReadyTracker();
    const meters = [0, 10, 34, 35, 40, 50, 60, 100];
    const changes = meters.map((m) => tracker.update(isSpecialReady(filipe, m)));
    expect(changes.filter((c) => c === 'ready')).toHaveLength(1);
    expect(changes.indexOf('ready')).toBe(meters.indexOf(35));
    expect(tracker.ready).toBe(true);
  });

  it('spending the special below the cost ends READY at once (discharge)', () => {
    const tracker = new SpecialReadyTracker();
    tracker.update(isSpecialReady(filipe, 40));
    expect(tracker.update(isSpecialReady(filipe, 40 - 35))).toBe('discharged');
    expect(tracker.ready).toBe(false);
    // Paying with enough left over keeps it READY (no discharge).
    tracker.update(isSpecialReady(filipe, 100));
    expect(tracker.update(isSpecialReady(filipe, 100 - 35))).toBeNull();
    expect(tracker.ready).toBe(true);
  });

  it('a fresh tracker (new round/match) starts not ready', () => {
    const tracker = new SpecialReadyTracker();
    tracker.update(true);
    tracker.reset();
    expect(tracker.ready).toBe(false);
    expect(tracker.update(true)).toBe('ready');
  });
});

describe('touch ESP button', () => {
  function fakeScene() {
    const made: Record<string, unknown>[] = [];
    const object = (x = 0, y = 0) => {
      const state: Record<string, unknown> = { x, y, visible: true, alpha: 1, stroke: null };
      const proxy: Record<string, unknown> = new Proxy(state, {
        get(target, key: string) {
          if (key in target) return target[key];
          return (...args: unknown[]) => {
            if (key === 'setStrokeStyle') target.stroke = args;
            if (key === 'setVisible') target.visible = args[0];
            if (key === 'setAlpha') target.alpha = args[0];
            return proxy;
          };
        },
      });
      made.push(state);
      return proxy;
    };
    const tweens = { add: vi.fn(), killTweensOf: vi.fn() };
    const scene = {
      add: { circle: object, text: object, graphics: object },
      input: { on: vi.fn(), off: vi.fn() },
      game: { events: { on: vi.fn(), off: vi.fn() } },
      events: { once: vi.fn() },
      tweens,
    };
    return { scene: scene as unknown as Phaser.Scene, made, tweens };
  }

  it('lights up with a pulsing ring while READY and goes back to normal after', () => {
    const { scene, made, tweens } = fakeScene();
    const touch = new TouchControls(scene);
    const before = made.length;
    touch.setSpecialReady(true);
    expect(touch.isSpecialReady).toBe(true);
    const ring = made[before]!;
    expect(ring.visible).toBe(true);
    expect(tweens.add).toHaveBeenCalledTimes(1);
    const espStroke = made.find(
      (o) => Array.isArray(o.stroke) && o.stroke[1] === SPECIAL_BUTTON_READY.strokeColor,
    );
    expect(espStroke).toBeDefined();

    // Calling every frame with the same state does nothing new.
    touch.setSpecialReady(true);
    expect(tweens.add).toHaveBeenCalledTimes(1);

    touch.setSpecialReady(false);
    expect(ring.visible).toBe(false);
    expect(espStroke!.stroke).toEqual([
      SPECIAL_BUTTON_IDLE.strokeWidth,
      SPECIAL_BUTTON_IDLE.strokeColor,
      SPECIAL_BUTTON_IDLE.strokeAlpha,
    ]);
  });

  it('style: lit border and glow only when ready', () => {
    expect(specialButtonStyle(true).glow).toBe(true);
    expect(specialButtonStyle(false).glow).toBe(false);
    expect(specialButtonStyle(true).strokeWidth).toBeGreaterThan(
      specialButtonStyle(false).strokeWidth,
    );
  });
});
