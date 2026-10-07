import { describe, expect, it } from 'vitest';
import { PlayerController } from '../src/controllers/PlayerController';
import type { FightSimulation } from '../src/core/FightSimulation';
import {
  JOYSTICK_DEADZONE,
  JoystickTracker,
  JumpLatch,
  directionInputs,
  joystickDirection,
  joystickFrame,
  type JoystickDirection,
} from '../src/input/joystick';
import type { InputSource, InputState } from '../src/types/input';
import { createFightingSim, idle, placeAtDistance, press } from './helpers';

const TRAVEL = 46;
/** A finger offset of `length` px in a compass direction (screen y grows downward). */
function at(degrees: number, length = 40): [number, number] {
  const radians = (degrees * Math.PI) / 180;
  return [Math.cos(radians) * length, -Math.sin(radians) * length];
}
const dir = (degrees: number, length?: number) => joystickDirection(...at(degrees, length), TRAVEL);

describe('joystick: angle -> 8 directions -> the arrow keys inputs', () => {
  it.each([
    [0, 'right', { right: true }],
    [180, 'left', { left: true }],
    [90, 'up', { up: true }],
    [270, 'down', { down: true }],
    [45, 'upRight', { up: true, right: true }],
    [135, 'upLeft', { up: true, left: true }],
    [315, 'downRight', { down: true, right: true }],
    [225, 'downLeft', { down: true, left: true }],
  ] as const)('%s° -> %s', (degrees, expected, inputs) => {
    expect(dir(degrees)).toBe(expected);
    expect(directionInputs(expected)).toEqual(inputs);
  });

  it('diagonals are slightly wider than cardinals (easy jump-ins)', () => {
    expect(dir(18)).toBe('right');
    expect(dir(22)).toBe('upRight'); // within 45° ± 25°
    expect(dir(68)).toBe('upRight');
    expect(dir(72)).toBe('up');
    expect(dir(112)).toBe('upLeft');
    expect(dir(338)).toBe('downRight');
    expect(dir(-1)).toBe('right');
  });

  it('the deadzone in the middle produces no direction (and no input)', () => {
    const edge = TRAVEL * JOYSTICK_DEADZONE;
    expect(joystickDirection(edge - 1, 0, TRAVEL)).toBeNull();
    expect(joystickDirection(0, -(edge - 1), TRAVEL)).toBeNull();
    expect(joystickDirection(edge + 1, 0, TRAVEL)).toBe('right');
    expect(directionInputs(null)).toEqual({});
  });

  it('distance past the deadzone never matters (intent, not speed)', () => {
    expect(dir(45, 12)).toBe('upRight');
    expect(dir(45, 400)).toBe('upRight');
  });
});

describe('joystick pointer tracking', () => {
  const stick = () => new JoystickTracker(100, 400, TRAVEL, 100);

  it('sliding between sectors updates the inputs immediately (→ ↗ ↑ ↖ ←)', () => {
    const t = stick();
    const seen: (JoystickDirection | null)[] = [];
    t.pointerDown(7, 140, 400);
    seen.push(t.direction);
    for (const degrees of [45, 90, 135, 180]) {
      const [dx, dy] = at(degrees);
      t.pointerMove(7, 100 + dx, 400 + dy);
      seen.push(t.direction);
    }
    expect(seen).toEqual(['right', 'upRight', 'up', 'upLeft', 'left']);
    // From ↗ to ↑: right is released, up stays.
    expect(directionInputs('up')).toEqual({ up: true });
  });

  it('lifting the finger clears every direction at once', () => {
    const t = stick();
    t.pointerDown(3, 130, 370);
    expect(t.direction).toBe('upRight');
    expect(t.pointerUp(3)).toBe(true);
    expect(t.direction).toBeNull();
    expect(t.knobOffset).toEqual({ x: 0, y: 0 });
  });

  it('keeps steering outside the base; only the knob is clamped', () => {
    const t = stick();
    t.pointerDown(1, 100, 380);
    t.pointerMove(1, 100 + 300, 400 - 300);
    expect(t.direction).toBe('upRight');
    const { x, y } = t.knobOffset;
    expect(Math.hypot(x, y)).toBeCloseTo(TRAVEL);
  });

  it('two pointers are independent: a second finger never moves or releases the stick', () => {
    const t = stick();
    expect(t.pointerDown(1, 140, 400)).toBe(true);
    expect(t.pointerDown(2, 100, 360)).toBe(false); // e.g. a slip near the stick
    t.pointerMove(2, 100, 460);
    expect(t.direction).toBe('right');
    expect(t.pointerUp(2)).toBe(false);
    expect(t.direction).toBe('right');
    expect(t.pointerDown(9, 900, 450)).toBe(false); // the action buttons side
  });
});

describe('one jump per push up (touch only)', () => {
  it('the latch sends up until the fighter leaves the ground, then waits for a new push', () => {
    const latch = new JumpLatch();
    expect(latch.next(true, false)).toBe(true); // grounded: jump
    expect(latch.next(true, true)).toBe(false); // took off: spent
    expect(latch.next(true, true)).toBe(false);
    expect(latch.next(true, false)).toBe(false); // landed, still holding: no auto-jump
    expect(latch.next(false, false)).toBe(false); // stick leaves up
    expect(latch.next(true, false)).toBe(true); // new push: new jump
  });
});

/** Simulates the touch input of player 1 for `frames`, using the real composition. */
function playTouch(
  sim: FightSimulation,
  frames: number,
  script: (frame: number) => { direction: JoystickDirection | null; buttons?: Partial<InputState> },
  latch = new JumpLatch(),
  onFrame?: (frame: number) => void,
): void {
  const [player] = sim.fighters;
  for (let f = 0; f < frames; f++) {
    const { direction, buttons } = script(f);
    const stick = joystickFrame(direction, new Set(), latch, player.isAirborne);
    sim.step([press({ ...buttons, ...stick }), idle()]);
    onFrame?.(f);
  }
}

describe('joystick in the real simulation', () => {
  it('↗ jumps forward and ↖ jumps back', () => {
    const forward = createFightingSim();
    playTouch(forward, 3, () => ({ direction: 'upRight' }));
    expect(forward.fighters[0].state).toBe('jump');
    expect(forward.fighters[0].velocity.x).toBeGreaterThan(0);

    const back = createFightingSim();
    playTouch(back, 3, () => ({ direction: 'upLeft' }));
    expect(back.fighters[0].state).toBe('jump');
    expect(back.fighters[0].velocity.x).toBeLessThan(0);
  });

  it('↗ jumps exactly like the keyboard ↑ + →', () => {
    const touch = createFightingSim();
    const keys = createFightingSim();
    const trace = (sim: FightSimulation) =>
      `${sim.fighters[0].position.x},${sim.fighters[0].position.y}`;
    const a: string[] = [];
    const b: string[] = [];
    playTouch(
      touch,
      40,
      () => ({ direction: 'upRight' }),
      new JumpLatch(),
      () => a.push(trace(touch)),
    );
    for (let f = 0; f < 40; f++) {
      keys.step([press({ up: f < 2, right: true }), idle()]);
      b.push(trace(keys));
    }
    expect(a).toEqual(b);
  });

  it.each([
    ['upRight', 'kick', 'airKick'],
    ['upRight', 'punch', 'airPunch'],
    ['upLeft', 'kick', 'airKick'],
    ['upLeft', 'punch', 'airPunch'],
  ] as const)('joystick %s + %s -> %s (jump-in)', (direction, button, state) => {
    const sim = createFightingSim();
    const states = new Set<string>();
    playTouch(
      sim,
      40,
      (f) => ({ direction, buttons: { [button]: f === 12 } }),
      new JumpLatch(),
      () => states.add(sim.fighters[0].state),
    );
    expect(states).toContain(state);
  });

  it.each([
    ['punch', 'crouchPunch'],
    ['kick', 'crouchKick'],
    ['block', 'crouchBlock'],
  ] as const)('joystick ↓ + %s -> %s', (button, state) => {
    const sim = createFightingSim();
    placeAtDistance(sim, 300);
    const states = new Set<string>();
    playTouch(
      sim,
      12,
      (f) => ({ direction: 'down', buttons: { [button]: button === 'block' || f === 2 } }),
      new JumpLatch(),
      () => states.add(sim.fighters[0].state),
    );
    expect(states).toContain(state);
  });

  it('holding ↗ gives a single jump (no endless auto-jump), a new push jumps again', () => {
    const sim = createFightingSim();
    const latch = new JumpLatch();
    let jumps = 0;
    let wasAirborne = false;
    const countJumps = () => {
      const airborne = sim.fighters[0].isAirborne;
      if (airborne && !wasAirborne) jumps++;
      wasAirborne = airborne;
    };
    playTouch(sim, 240, () => ({ direction: 'upRight' }), latch, countJumps);
    expect(jumps).toBe(1);
    playTouch(sim, 5, () => ({ direction: 'right' }), latch, countJumps);
    playTouch(sim, 10, () => ({ direction: 'upRight' }), latch, countJumps);
    expect(jumps).toBe(2);
  });

  it('the same touch sequence always produces the same fight (determinism)', () => {
    const run = () => {
      const sim = createFightingSim();
      const out: string[] = [];
      const plan: (JoystickDirection | null)[] = ['right', 'upRight', 'up', 'upLeft', 'down', null];
      playTouch(
        sim,
        180,
        (f) => ({ direction: plan[Math.floor(f / 30)] ?? null, buttons: { kick: f % 25 === 0 } }),
        new JumpLatch(),
        () => {
          const [a, b] = sim.fighters;
          out.push(`${a.position.x},${a.position.y},${a.state}|${b.health}`);
        },
      );
      return out;
    };
    expect(run()).toEqual(run());
  });
});

describe('desktop keeps the keyboard', () => {
  it('PlayerController with only a keyboard source passes its keys through unchanged', () => {
    const keyboard: InputSource = { read: () => ({ up: true, right: true }) };
    const controller = new PlayerController([keyboard]);
    const sim = createFightingSim();
    const [self, opponent] = sim.fighters;
    expect(controller.getInput({ self, opponent })).toEqual(press({ up: true, right: true }));
    // Held keyboard up still re-jumps on every landing, as before: the joystick rule is touch-only.
    let jumps = 0;
    let wasAirborne = false;
    for (let f = 0; f < 240; f++) {
      sim.step([controller.getInput({ self, opponent }), idle()]);
      if (self.isAirborne && !wasAirborne) jumps++;
      wasAirborne = self.isAirborne;
    }
    expect(jumps).toBeGreaterThan(1);
  });
});
