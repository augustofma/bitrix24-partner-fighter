import type { AttackConfig } from '../../types/fighter';

export type AttackPhase = 'startup' | 'active' | 'recovery';

export function totalAttackFrames(attack: AttackConfig): number {
  return attack.startupFrames + attack.activeFrames + attack.recoveryFrames;
}

/** Phase of an attack given the frames elapsed since it started (0 = first frame). */
export function attackPhaseAt(attack: AttackConfig, frame: number): AttackPhase {
  if (frame < attack.startupFrames) return 'startup';
  if (frame < attack.startupFrames + attack.activeFrames) return 'active';
  return 'recovery';
}

/** How far in front of the attacker's center the hitbox reaches. */
export function attackReach(attack: AttackConfig): number {
  return attack.hitbox.x + attack.hitbox.width;
}
