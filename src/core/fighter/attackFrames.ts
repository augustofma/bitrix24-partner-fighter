import type { AttackConfig } from '../../types/fighter';

/** Every step of an attack as a full config (one per `hits` step, or the attack itself). */
const resolvedHits = new WeakMap<AttackConfig, readonly AttackConfig[]>();

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

/** The attack's contacts in order, each a complete AttackConfig (cached per attack). */
export function attackHits(attack: AttackConfig): readonly AttackConfig[] {
  let hits = resolvedHits.get(attack);
  if (!hits) {
    const steps = attack.hits ?? [];
    hits =
      steps.length === 0
        ? [attack]
        : steps.map(({ activeFrame: _activeFrame, ...step }) => ({
            ...attack,
            ...step,
            hits: undefined,
          }));
    resolvedHits.set(attack, hits);
  }
  return hits;
}

/**
 * Which step of the attack is open at `frame` (frames since it started), or -1 outside the
 * active window. Attacks without `hits` have a single step (0).
 */
export function hitStepAt(attack: AttackConfig, frame: number): number {
  if (attackPhaseAt(attack, frame) !== 'active') return -1;
  const steps = attack.hits;
  if (!steps || steps.length === 0) return 0;
  const into = frame - attack.startupFrames;
  let step = -1;
  steps.forEach((hit, index) => {
    if (hit.activeFrame <= into) step = index;
  });
  return step;
}
