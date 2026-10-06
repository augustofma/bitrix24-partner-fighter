import { SIMULATION_FPS } from '../../config/simulation';
import { attackPhaseAt, type AttackPhase } from '../../core/fighter/attackFrames';
import {
  FIGHTER_STATES,
  type AttackConfig,
  type AttackPhaseFrameCounts,
  type FighterAnimationSet,
  type FighterStateId,
  type JumpPhaseFrameCounts,
  type SpriteAnimationConfig,
} from '../../types/fighter';
import type { Vec2 } from '../../types/geometry';
import { jumpPhaseFor, type JumpPhase } from '../jumpPhase';

/*
 * Pure functions (no Phaser) that turn simulation state into a spritesheet frame.
 * The sprite frame is a function of (state, stateFrame, activeAttack, velocity) only, so:
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
  special: 'punch',
  // Crouching attacks never fall back to a standing pose.
  crouchPunch: 'crouch',
  crouchKick: 'crouchPunch',
  airPunch: 'jump',
  airKick: 'airPunch',
  block: 'idle',
  crouchBlock: 'crouch',
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

/** Default split of a jump animation: 1 frame = all phases, 2 = rise/fall, 3+ = one apex frame. */
export function defaultJumpPhases(frameCount: number): JumpPhaseFrameCounts {
  if (frameCount <= 0) return { rise: 0, apex: 0, fall: 0 };
  const apex = frameCount >= 3 ? 1 : 0;
  const rise = Math.ceil((frameCount - apex) / 2);
  return { rise, apex, fall: frameCount - apex - rise };
}

/** If a phase has no frames, show the most similar one instead. */
const JUMP_PHASE_FALLBACKS: Readonly<Record<JumpPhase, readonly JumpPhase[]>> = {
  rise: ['rise', 'apex', 'fall'],
  apex: ['apex', 'rise', 'fall'],
  fall: ['fall', 'apex', 'rise'],
};

/**
 * Index into `animation.frames` for the jump, chosen by the CURRENT vertical velocity (not by
 * time in the state). So a jump resumed after an air attack shows the correct rise/apex/fall.
 * Several frames in one phase loop at `frameRate`.
 */
export function jumpFrameIndex(
  animation: SpriteAnimationConfig,
  verticalVelocity: number,
  stateFrame: number,
): number {
  const length = animation.frames.length;
  if (length === 0) return 0;
  const counts = animation.jumpPhases ?? defaultJumpPhases(length);
  const starts: Record<JumpPhase, number> = {
    rise: 0,
    apex: counts.rise,
    fall: counts.rise + counts.apex,
  };
  const wanted = jumpPhaseFor(verticalVelocity);
  const phase = JUMP_PHASE_FALLBACKS[wanted].find((p) => counts[p] > 0) ?? wanted;
  const count = Math.max(1, counts[phase]);
  const frameRate = animation.frameRate ?? DEFAULT_ANIMATION_FRAME_RATE;
  const step = Math.floor((Math.max(0, stateFrame) * frameRate) / SIMULATION_FPS);
  return Math.min(length - 1, starts[phase] + (step % count));
}

/** What the sprite needs to know about a fighter (a subset of ReadonlyFighter). */
export interface AnimatedFighterState {
  state: FighterStateId;
  stateFrame: number;
  activeAttack: AttackConfig | null;
  velocity: Readonly<Vec2>;
}

/** The spritesheet frame to display for the fighter right now. */
export function spriteFrameFor(
  animations: FighterAnimationSet,
  fighter: AnimatedFighterState,
): number {
  const animationState = resolveAnimationState(animations, fighter.state);
  const animation = animations[animationState] ?? animations.idle;
  let index: number;
  if (fighter.activeAttack) {
    index = attackFrameIndex(animation, fighter.activeAttack, fighter.stateFrame);
  } else if (animationState === 'jump') {
    index = jumpFrameIndex(animation, fighter.velocity.y, fighter.stateFrame);
  } else {
    index = timedFrameIndex(animation, fighter.state, fighter.stateFrame);
  }
  return animation.frames[index] ?? animation.frames[0] ?? 0;
}
