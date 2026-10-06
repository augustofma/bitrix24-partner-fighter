import { SIMULATION_FPS } from '../../config/simulation';
import { attackPhaseAt, type AttackPhase } from '../../core/fighter/attackFrames';
import {
  FIGHTER_STATES,
  type AttackConfig,
  type AttackPhaseFrameCounts,
  type FighterAnimationSet,
  type FighterStateId,
  type SpriteAnimationConfig,
} from '../../types/fighter';

/*
 * Pure functions (no Phaser) that turn simulation state into a spritesheet frame.
 * The sprite frame is a function of (state, stateFrame, activeAttack) only, so:
 * - there is no second state machine: the visual always mirrors the simulation;
 * - hitstop freezes the sprite automatically (stateFrame does not advance);
 * - attack frames line up exactly with the real startup/active/recovery frame data.
 */

export const DEFAULT_ANIMATION_FRAME_RATE = 10;

/** States whose animation loops by default; every other state plays once and holds. */
const LOOPING_STATES: ReadonlySet<FighterStateId> = new Set<FighterStateId>(['idle', 'walk']);

/** When a state has no animation, show this similar one instead. Every chain ends at idle. */
export const ANIMATION_FALLBACKS: Readonly<
  Record<Exclude<FighterStateId, 'idle'>, FighterStateId>
> = {
  walk: 'idle',
  jump: 'idle',
  crouch: 'idle',
  punch: 'idle',
  kick: 'punch',
  block: 'idle',
  hurt: 'idle',
  knockout: 'hurt',
  victory: 'idle',
};

/** The state whose animation is shown for `state`, following ANIMATION_FALLBACKS. */
export function resolveAnimationState(
  animations: FighterAnimationSet,
  state: FighterStateId,
): FighterStateId {
  let current = state;
  // Bounded walk: the chain is acyclic, but never trust data blindly.
  for (let i = 0; i < FIGHTER_STATES.length; i++) {
    if (current === 'idle' || animations[current]) return current;
    current = ANIMATION_FALLBACKS[current];
  }
  return 'idle';
}

export function animationForState(
  animations: FighterAnimationSet,
  state: FighterStateId,
): SpriteAnimationConfig {
  return animations[resolveAnimationState(animations, state)] ?? animations.idle;
}

/** Index into `animation.frames` for time-based (non-attack) animations. */
export function timedFrameIndex(
  animation: SpriteAnimationConfig,
  state: FighterStateId,
  stateFrame: number,
): number {
  const length = animation.frames.length;
  if (length === 0) return 0;
  const frameRate = animation.frameRate ?? DEFAULT_ANIMATION_FRAME_RATE;
  const repeat = animation.repeat ?? (LOOPING_STATES.has(state) ? -1 : 0);
  const step = Math.floor((Math.max(0, stateFrame) * frameRate) / SIMULATION_FPS);
  if (repeat < 0) return step % length;
  return Math.min(step, length * (repeat + 1) - 1) % length;
}

/** Default split: the middle frame is the impact (active) frame. */
export function defaultAttackPhases(frameCount: number): AttackPhaseFrameCounts {
  if (frameCount <= 0) return { startup: 0, active: 0, recovery: 0 };
  const startup = Math.floor((frameCount - 1) / 2);
  return { startup, active: 1, recovery: frameCount - 1 - startup };
}

/**
 * Index into `animation.frames` for an attack, driven by the attack's REAL frame data.
 * Frames of each phase are spread over that phase's duration. An empty phase borrows the
 * closest frame (e.g. no startup frames => show the first active frame).
 */
export function attackFrameIndex(
  animation: SpriteAnimationConfig,
  attack: AttackConfig,
  stateFrame: number,
): number {
  const length = animation.frames.length;
  if (length === 0) return 0;
  const counts = animation.attackPhases ?? defaultAttackPhases(length);
  const phase = attackPhaseAt(attack, stateFrame);

  const segments: Record<
    AttackPhase,
    { start: number; count: number; duration: number; elapsed: number }
  > = {
    startup: {
      start: 0,
      count: counts.startup,
      duration: attack.startupFrames,
      elapsed: stateFrame,
    },
    active: {
      start: counts.startup,
      count: counts.active,
      duration: attack.activeFrames,
      elapsed: stateFrame - attack.startupFrames,
    },
    recovery: {
      start: counts.startup + counts.active,
      count: counts.recovery,
      duration: attack.recoveryFrames,
      elapsed: stateFrame - attack.startupFrames - attack.activeFrames,
    },
  };

  const segment = segments[phase];
  let index: number;
  if (segment.count <= 0) {
    // Borrow the neighbour frame: the next one for startup, the previous one otherwise.
    index = phase === 'startup' ? segment.start : segment.start - 1;
  } else {
    const progress = segment.duration > 0 ? segment.elapsed / segment.duration : 0;
    index = segment.start + Math.min(segment.count - 1, Math.floor(progress * segment.count));
  }
  return Math.min(length - 1, Math.max(0, index));
}

/** What the sprite needs to know about a fighter (a subset of ReadonlyFighter). */
export interface AnimatedFighterState {
  state: FighterStateId;
  stateFrame: number;
  activeAttack: AttackConfig | null;
}

/** The spritesheet frame to display for the fighter right now. */
export function spriteFrameFor(
  animations: FighterAnimationSet,
  fighter: AnimatedFighterState,
): number {
  const animation = animationForState(animations, fighter.state);
  const index = fighter.activeAttack
    ? attackFrameIndex(animation, fighter.activeAttack, fighter.stateFrame)
    : timedFrameIndex(animation, fighter.state, fighter.stateFrame);
  return animation.frames[index] ?? animation.frames[0] ?? 0;
}
