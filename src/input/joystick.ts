import type { InputState } from '../types/input';

/*
 * Pure logic of the virtual joystick (no Phaser), so it is testable: finger offset -> one of
 * 8 directions -> the same digital inputs the keyboard produces. It expresses intent only:
 * how far the stick is pushed never changes speed.
 */

export type JoystickDirection =
  'up' | 'upRight' | 'right' | 'downRight' | 'down' | 'downLeft' | 'left' | 'upLeft';

/** Share of the travel radius around the center that produces no direction. */
export const JOYSTICK_DEADZONE = 0.2;
/**
 * Width of each diagonal sector in degrees (cardinals get the rest: 90 - this). Slightly over
 * 45 so diagonals (jump-ins) are easy to hit on glass, as on an arcade stick's gate.
 */
export const DIAGONAL_SECTOR_DEGREES = 50;

const DIRECTION_INPUTS: Readonly<Record<JoystickDirection, Partial<InputState>>> = {
  up: { up: true },
  upRight: { up: true, right: true },
  right: { right: true },
  downRight: { down: true, right: true },
  down: { down: true },
  downLeft: { down: true, left: true },
  left: { left: true },
  upLeft: { up: true, left: true },
};

/** Counter-clockwise from "right", in 45° steps (screen up is +90°). */
const BY_ANGLE: readonly JoystickDirection[] = [
  'right',
  'upRight',
  'up',
  'upLeft',
  'left',
  'downLeft',
  'down',
  'downRight',
];

/**
 * Direction for a finger offset (dx, dy) in screen pixels (y grows downward) from the stick's
 * center; null inside the deadzone. Past the deadzone only the angle matters.
 */
export function joystickDirection(
  dx: number,
  dy: number,
  travelRadius: number,
  deadzone: number = JOYSTICK_DEADZONE,
): JoystickDirection | null {
  if (Math.hypot(dx, dy) <= travelRadius * deadzone) return null;
  const degrees = ((Math.atan2(-dy, dx) * 180) / Math.PI + 360) % 360;
  // Nearest 45° axis and the signed distance to it (-22.5..22.5).
  const step = Math.round(degrees / 45);
  const index = step % 8;
  const fromAxis = degrees - step * 45;
  const halfCardinal = (90 - DIAGONAL_SECTOR_DEGREES) / 2;
  if (index % 2 === 0 && Math.abs(fromAxis) > halfCardinal) {
    // Near a cardinal's edge: the (slightly wider) neighbouring diagonal wins.
    return BY_ANGLE[(index + Math.sign(fromAxis) + 8) % 8] ?? null;
  }
  return BY_ANGLE[index] ?? null;
}

/** The digital inputs a direction stands for (exactly what the arrow keys would hold). */
export function directionInputs(direction: JoystickDirection | null): Partial<InputState> {
  return direction ? DIRECTION_INPUTS[direction] : {};
}

export type DirectionAction = 'left' | 'right' | 'up' | 'down';
export const DIRECTION_ACTIONS: readonly DirectionAction[] = ['left', 'right', 'up', 'down'];

/**
 * The directional part of one touch frame: the stick's direction plus anything latched since
 * the last frame, with "up" filtered by the one-jump-per-push rule.
 */
export function joystickFrame(
  direction: JoystickDirection | null,
  latched: ReadonlySet<DirectionAction>,
  jumpLatch: JumpLatch,
  airborne: boolean,
): Pick<InputState, DirectionAction> {
  const stick = directionInputs(direction);
  const held = (action: DirectionAction) => Boolean(stick[action]) || latched.has(action);
  return {
    left: held('left'),
    right: held('right'),
    down: held('down'),
    up: jumpLatch.next(held('up'), airborne),
  };
}

/**
 * Which finger owns the stick. The first touch inside the activation area takes it; only that
 * pointer moves or releases it, so fingers on the action buttons never interfere. The finger
 * keeps steering even after sliding outside the base.
 */
export class JoystickTracker {
  private pointerId: number | null = null;
  private dx = 0;
  private dy = 0;

  constructor(
    private readonly centerX: number,
    private readonly centerY: number,
    /** How far the finger must travel for full deflection (also the deadzone's reference). */
    readonly travelRadius: number,
    /** Touches starting within this distance from the center grab the stick. */
    private readonly activationRadius: number,
  ) {}

  get active(): boolean {
    return this.pointerId !== null;
  }

  /** Offset of the finger, clamped to the travel radius (for drawing the knob). */
  get knobOffset(): { x: number; y: number } {
    const length = Math.hypot(this.dx, this.dy);
    const scale = length > this.travelRadius ? this.travelRadius / length : 1;
    return { x: this.dx * scale, y: this.dy * scale };
  }

  get direction(): JoystickDirection | null {
    return this.active ? joystickDirection(this.dx, this.dy, this.travelRadius) : null;
  }

  /** Returns true when this touch grabbed the stick. */
  pointerDown(id: number, x: number, y: number): boolean {
    if (this.active) return false;
    if (Math.hypot(x - this.centerX, y - this.centerY) > this.activationRadius) return false;
    this.pointerId = id;
    this.move(x, y);
    return true;
  }

  pointerMove(id: number, x: number, y: number): void {
    if (id === this.pointerId) this.move(x, y);
  }

  /** Returns true when the owning finger was lifted. */
  pointerUp(id: number): boolean {
    if (id !== this.pointerId) return false;
    this.release();
    return true;
  }

  release(): void {
    this.pointerId = null;
    this.dx = 0;
    this.dy = 0;
  }

  private move(x: number, y: number): void {
    this.dx = x - this.centerX;
    this.dy = y - this.centerY;
  }
}

/**
 * Touch-only jump rule: holding the stick up gives ONE jump. "up" is sent while the stick is in
 * an up sector until the fighter has left the ground with it; then it is withheld until the
 * stick leaves the up sectors. Keyboard behavior (held up re-jumps) is untouched.
 */
export class JumpLatch {
  private groundedWhileUp = false;
  private spent = false;

  /** `wantsUp`: the stick points up-ish; `airborne`: the fighter this device controls. */
  next(wantsUp: boolean, airborne: boolean): boolean {
    if (!wantsUp) {
      this.groundedWhileUp = false;
      this.spent = false;
      return false;
    }
    if (this.spent) return false;
    if (!airborne) this.groundedWhileUp = true;
    else if (this.groundedWhileUp) {
      // It took off while we were holding up: that was our jump.
      this.spent = true;
      return false;
    }
    return true;
  }

  reset(): void {
    this.groundedWhileUp = false;
    this.spent = false;
  }
}
