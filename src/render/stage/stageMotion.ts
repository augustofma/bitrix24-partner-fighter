import type { CrowdReaction, StageMood } from '../../types/stage';

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

/** The match winner gets a bigger cheer than a round winner (beyond CHEER_MOTION). */
export const MOOD_EXCITEMENT: Readonly<Record<StageMood, number>> = {
  fight: 0,
  celebrate: 1,
  victory: 1.5,
};
const MAX_EXCITEMENT = 1.5;

/** Short crowd bursts on big moments, on top of the mood (presentation only). */
export const REACTION_EXCITEMENT: Readonly<Record<CrowdReaction, number>> = {
  bigHit: 0.45,
  special: 0.65,
  ko: 1.2,
  perfect: 1.3,
};
/** How fast a burst calms down (excitement units per second): a KO cheer lasts ~2 s. */
export const BURST_DECAY = 0.6;
/** Hits of at least this damage make the crowd react (heavy kicks, specials). */
export const BIG_HIT_DAMAGE = 10;

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
  // Above 1 (the match winner) the cheer keeps growing a little past CHEER_MOTION.
  const t = Math.min(MAX_EXCITEMENT, Math.max(0, excitement));
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

/*
 * Crowd in groups (StageCrowd.style 'groups'): every column gets its own loop, speed, size and
 * delay from a fixed hash of its index, so neighbours never move in sync, and some people only
 * join in when the crowd gets excited.
 */

export type CrowdLoop = 'hop' | 'bob' | 'sway' | 'burst';

export interface CrowdColumnStyle {
  loop: CrowdLoop;
  /** Speed multiplier of the shared crowd rate. */
  speed: number;
  /** Size multiplier of the shared amplitude. */
  size: number;
  /** Starting phase (cycles): the column's delay. */
  phase: number;
  /** Excitement needed before this column joins in (0: always moving). */
  joinAt: number;
}

/** Deterministic 0..1 value from an integer (visual variety only, never the simulation). */
export function hash01(n: number, salt = 0): number {
  const x = Math.sin(n * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const LOOPS: readonly CrowdLoop[] = ['hop', 'bob', 'sway', 'burst', 'hop', 'bob'];

export function crowdColumnStyle(index: number): CrowdColumnStyle {
  return {
    loop: LOOPS[Math.floor(hash01(index, 1) * LOOPS.length)] ?? 'bob',
    speed: 0.7 + 0.7 * hash01(index, 2),
    size: 0.55 + 0.75 * hash01(index, 3),
    phase: hash01(index, 4),
    // About a third of the crowd waits for a big moment.
    joinAt: hash01(index, 5) < 0.35 ? 0.3 + 0.5 * hash01(index, 6) : 0,
  };
}

/**
 * Offset of a column (stage-art pixels) at its own phase. Vertical offsets are always upward
 * (<= 0) so the barrier keeps hiding the column's base; sways stay within one pixel.
 */
export function crowdGroupOffset(
  style: CrowdColumnStyle,
  phase: number,
  amplitude: number,
  excitement: number,
): { x: number; y: number } {
  // Columns that wait for a big moment ease in as the excitement passes their threshold.
  const join = style.joinAt === 0 ? 1 : Math.min(1, Math.max(0, (excitement - style.joinAt) * 4));
  const size = amplitude * style.size * (style.joinAt === 0 ? 1 : join);
  const turn = 2 * Math.PI * phase;
  switch (style.loop) {
    case 'hop':
      return { x: 0, y: -size * Math.abs(Math.sin(turn)) };
    case 'bob':
      return { x: 0, y: -size * 0.5 * (1 - Math.cos(turn)) * 0.6 };
    case 'sway':
      return {
        x: Math.round(Math.sin(turn) * Math.min(1, size)),
        y: -size * 0.3 * Math.abs(Math.sin(turn)),
      };
    case 'burst': {
      // Two quick jumps, then a rest: cheering in bursts.
      const cycle = phase - Math.floor(phase);
      const jump = cycle < 0.5 ? Math.abs(Math.sin(4 * Math.PI * cycle)) : 0;
      return { x: 0, y: -size * 1.2 * jump };
    }
  }
}

/** Phone camera flashes per second over the crowd at a given excitement (few when calm). */
export function flashRate(excitement: number): number {
  return 0.4 + 6 * Math.max(0, excitement);
}

/*
 * Flyover (StageFlyover): a plane crossing the sky with a towed banner. Time is render time;
 * the pause between flights comes from a small seeded generator, never from Math.random or the
 * simulation.
 */

/** Small deterministic generator (mulberry32) for visual-only timing. */
export function visualRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Gentle cruise: a slow vertical bob and the matching small pitch (degrees). */
export function planeBob(timeSeconds: number): { y: number; angle: number } {
  const turn = 2 * Math.PI * timeSeconds * 0.35;
  return { y: 2.5 * Math.sin(turn), angle: -1.5 * Math.cos(turn) };
}

/**
 * Cloth wave of banner strip `index` of `count`: zero at the edge held by the tow lines,
 * growing toward the free tail, travelling away from the plane.
 */
export function bannerWave(
  timeSeconds: number,
  index: number,
  count: number,
  amplitude: number,
): number {
  const along = count > 1 ? index / (count - 1) : 0;
  const travel = 2 * Math.PI * (timeSeconds * 1.1 - along * 1.6);
  return amplitude * along * Math.sin(travel);
}
