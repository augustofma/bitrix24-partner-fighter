import type { StageMood } from '../../types/stage';

/*
 * Pure math for the stage background loops (crowd bounce, the president's head and hand),
 * so the motion is testable without Phaser. Views keep phase accumulators (in cycles) and
 * advance them by `rate * dt`, so changing speed never makes a layer jump.
 */

/** Speeds (cycles per second) and sizes of every loop at a given excitement. */
export interface MotionRates {
  crowdHz: number;
  /** Highest a crowd column jumps, in stage-art pixels. */
  crowdAmplitude: number;
  /** Full look-left-and-right cycles per second. */
  lookHz: number;
  nodHz: number;
  nodDegrees: number;
  handHz: number;
  handDegrees: number;
}

/** During the fight: a lively but calm crowd, a relaxed president. */
export const CALM_MOTION: MotionRates = {
  crowdHz: 1.1,
  crowdAmplitude: 1.5,
  lookHz: 1 / 6,
  nodHz: 0.45,
  nodDegrees: 3,
  handHz: 0.6,
  handDegrees: 10,
};

/** A round was won: the crowd jumps faster and higher, the president waves and looks around. */
export const CHEER_MOTION: MotionRates = {
  crowdHz: 2.6,
  crowdAmplitude: 3.5,
  lookHz: 0.9,
  nodHz: 2,
  nodDegrees: 7,
  handHz: 2.4,
  handDegrees: 28,
};

export const MOOD_EXCITEMENT: Readonly<Record<StageMood, number>> = { fight: 0, celebrate: 1 };

/** How fast the excitement follows a mood change (units per second): ~0.4 s to switch. */
export const EXCITEMENT_RATE = 2.5;
/** Phase difference between neighbouring crowd columns, so they bounce as a wave. */
const COLUMN_PHASE_STEP = 0.37;
/**
 * Share of a look cycle around each turn with a slight squash before the flip. Kept short
 * and shallow: a thin head would uncover the inpainted area behind it.
 */
const TURN_WINDOW = 0.015;
const MIN_TURN_SCALE = 0.7;

export function motionRates(excitement: number): MotionRates {
  const t = Math.min(1, Math.max(0, excitement));
  const mix = (key: keyof MotionRates) =>
    CALM_MOTION[key] + (CHEER_MOTION[key] - CALM_MOTION[key]) * t;
  return {
    crowdHz: mix('crowdHz'),
    crowdAmplitude: mix('crowdAmplitude'),
    lookHz: mix('lookHz'),
    nodHz: mix('nodHz'),
    nodDegrees: mix('nodDegrees'),
    handHz: mix('handHz'),
    handDegrees: mix('handDegrees'),
  };
}

/** Moves `current` toward `target` by at most `rate * dtSeconds`. */
export function approach(current: number, target: number, dtSeconds: number, rate: number): number {
  const step = rate * dtSeconds;
  if (Math.abs(target - current) <= step) return target;
  return current + Math.sign(target - current) * step;
}

/** Vertical offset of a crowd column: always upward (<= 0), so the barrier hides its base. */
export function crowdOffset(phase: number, column: number, amplitude: number): number {
  return -amplitude * Math.abs(Math.sin(2 * Math.PI * (phase + column * COLUMN_PHASE_STEP)));
}

/** Head looking one way, then the other (a quick, slight squash sells the turn), while nodding. */
export function headPose(
  lookPhase: number,
  nodPhase: number,
  nodDegrees: number,
): { scaleX: number; angle: number } {
  const cycle = lookPhase - Math.floor(lookPhase);
  const facing = cycle < 0.5 ? 1 : -1;
  const toSwitch = Math.min(cycle, Math.abs(cycle - 0.5), 1 - cycle);
  const squash = Math.max(MIN_TURN_SCALE, Math.min(1, toSwitch / TURN_WINDOW));
  return { scaleX: facing * squash, angle: Math.sin(2 * Math.PI * nodPhase) * nodDegrees };
}

/** Hand gesture: rocking around the wrist (a calm "talking" hand, or a wave when cheering). */
export function handAngle(phase: number, degrees: number): number {
  return Math.sin(2 * Math.PI * phase) * degrees;
}
