import type { CROUCH_ATTACK_STATES, GROUND_ATTACK_STATES } from '../types/fighter';
import type { AIDifficulty } from '../types/match';

export type { AIDifficulty } from '../types/match';

/** Attacks a grounded CPU can pick: standing or crouching normals. */
export type GroundAttackSlot =
  (typeof GROUND_ATTACK_STATES)[number] | (typeof CROUCH_ATTACK_STATES)[number];

/** Tunable personality of a CPU opponent. Chances are 0..1, durations in frames. */
export interface AIProfile {
  /** Frames the CPU needs to "see" an incoming attack before reacting. */
  reactionFrames: number;
  /** Chance to block an attack it sees coming in range. */
  blockChance: number;
  /**
   * When blocking a seen attack, chance to pick the posture its level requires (crouching vs
   * low, standing vs overhead). A wrong read guards in the other posture and gets hit.
   */
  guardReadChance: number;
  /** Chance to attack when in range and the attack cooldown is over. */
  aggression: number;
  /** Chance to back off when in range instead of attacking. */
  retreatChance: number;
  /** Chance to hold block preemptively when in range. */
  guardChance: number;
  /** Chance to jump in when approaching from mid range. */
  jumpInChance: number;
  /** Chance that a jump-in includes an air kick on the way down. */
  jumpInAttackChance: number;
  /** Chance that a ground kick is thrown low (crouchKick) against a standing opponent. */
  lowKickChance: number;
  /**
   * Chance, per attack decision, to notice that the opponent is low (crouching, low guard or
   * crouching attack) and adapt. Below 1 the CPU sometimes still throws a whiffing high attack.
   */
  lowPostureAwareness: number;
  /**
   * Relative preference among the attacks that WOULD connect with a low opponent right now
   * (reach and height are checked first). 0 = never.
   */
  lowPostureAttackWeights: Readonly<Record<GroundAttackSlot, number>>;
  /** Minimum/maximum pause after an attack before the next one. */
  attackCooldown: readonly [number, number];
  /** Duration ranges of each movement decision. */
  approachFrames: readonly [number, number];
  retreatFrames: readonly [number, number];
  guardFrames: readonly [number, number];
  waitFrames: readonly [number, number];
}

/** Baseline CPU: reacts fast but blocks only sometimes, reads most low/overhead attacks. */
export const NORMAL_AI: AIProfile = {
  reactionFrames: 3,
  blockChance: 0.35,
  guardReadChance: 0.75,
  aggression: 0.42,
  retreatChance: 0.22,
  guardChance: 0.12,
  jumpInChance: 0.08,
  jumpInAttackChance: 0.6,
  lowKickChance: 0.3,
  lowPostureAwareness: 0.85,
  // Mostly the quick low jab, often the sweep, sometimes the standing kick (mid, hits crouchers).
  lowPostureAttackWeights: { punch: 0.05, kick: 0.25, crouchPunch: 0.4, crouchKick: 0.3 },
  attackCooldown: [22, 48],
  approachFrames: [16, 36],
  retreatFrames: [14, 28],
  guardFrames: [12, 24],
  waitFrames: [10, 24],
};

/**
 * Permissive CPU: sees attacks late (fast normals often land before it reacts), blocks and
 * reads guards less, attacks less often with longer pauses and rarely jumps in. Still reacts.
 */
export const EASY_AI: AIProfile = {
  reactionFrames: 6,
  blockChance: 0.15,
  guardReadChance: 0.4,
  aggression: 0.25,
  retreatChance: 0.25,
  guardChance: 0.06,
  jumpInChance: 0.04,
  jumpInAttackChance: 0.35,
  lowKickChance: 0.2,
  lowPostureAwareness: 0.5,
  lowPostureAttackWeights: { punch: 0.15, kick: 0.3, crouchPunch: 0.35, crouchKick: 0.2 },
  attackCooldown: [40, 80],
  approachFrames: [20, 44],
  retreatFrames: [14, 28],
  guardFrames: [10, 20],
  waitFrames: [20, 40],
};

/**
 * Demanding CPU: only better decisions, no cheating. It still reacts only after an attack has
 * started + reactionFrames, uses the same RNG and the same fighter stats, damage and health.
 */
export const HARD_AI: AIProfile = {
  reactionFrames: 2,
  blockChance: 0.6,
  guardReadChance: 0.92,
  aggression: 0.58,
  retreatChance: 0.14,
  guardChance: 0.16,
  jumpInChance: 0.12,
  jumpInAttackChance: 0.85,
  lowKickChance: 0.35,
  lowPostureAwareness: 0.97,
  // Never the high punch that would whiff over a low opponent.
  lowPostureAttackWeights: { punch: 0, kick: 0.25, crouchPunch: 0.4, crouchKick: 0.35 },
  attackCooldown: [12, 30],
  approachFrames: [12, 28],
  retreatFrames: [10, 20],
  guardFrames: [12, 24],
  waitFrames: [6, 14],
};

/** The CPU personality used for each difficulty; the same AIController plays all of them. */
export const AI_PROFILES: Readonly<Record<AIDifficulty, AIProfile>> = {
  easy: EASY_AI,
  normal: NORMAL_AI,
  hard: HARD_AI,
};

export function aiProfileFor(difficulty: AIDifficulty): AIProfile {
  return AI_PROFILES[difficulty];
}
