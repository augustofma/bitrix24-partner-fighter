/*
 * Visual-only reading of a jump: which part of the arc the fighter is in, derived from the
 * simulation's vertical velocity. Shared by every renderer; never used by gameplay.
 */

export type JumpPhase = 'rise' | 'apex' | 'fall';

/**
 * Below this vertical speed (px/frame) the fighter is drawn at the apex (tuck).
 * With the standard jump (gravity 0.9) this is roughly the top 6-7 frames of the arc.
 */
export const APEX_SPEED = 3;

/** y grows downward: negative velocity = going up. */
export function jumpPhaseFor(verticalVelocity: number): JumpPhase {
  if (verticalVelocity < -APEX_SPEED) return 'rise';
  if (verticalVelocity > APEX_SPEED) return 'fall';
  return 'apex';
}
