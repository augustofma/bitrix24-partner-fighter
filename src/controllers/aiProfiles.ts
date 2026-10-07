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
  /**
   * Specials. The CPU only considers one the fighter could really start now (same rules as a
   * human press: meter, posture, free to act), from the ground and at a distance where it
   * would connect. Then it rolls these, so a charged meter is a tactical option, never an
   * automatic press.
   */
  special: AISpecialProfile;
}

export interface AISpecialProfile {
  /** Base chance to throw it when it is available and in range. */
  useChance: number;
  /** After throwing one: frames before the next special is even considered. */
  decisionCooldown: readonly [number, number];
  /** After deciding NOT to throw it: frames before considering again (no per-frame retries). */
  declineCooldown: readonly [number, number];
  /** Hesitation once the meter first pays for a special (no instant press on "READY"). */
  readyDelay: readonly [number, number];
  /** Added chance when its damage would finish the round (opponent.health <= damage). */
  finisherBias: number;
  /**
   * Chance to check the real geometry (the special's hitbox vs the opponent's hurtbox, startup
   * travel included) and to hold it while the opponent is in the air (a jump would carry them
   * over it). Otherwise it only eyeballs the reach and may throw it slightly short.
   */
  spacingAwareness: number;
  /**
   * Added chance when the opponent is stuck in an attack's recovery long enough for the
   * special's startup, seen only after reactionFrames (a whiff punish).
   */
  punishBonus: number;
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
  // Moderate: uses a good opening, does not burn the meter on sight.
  special: {
    useChance: 0.4,
    decisionCooldown: [55, 100],
    declineCooldown: [40, 70],
    readyDelay: [20, 45],
    finisherBias: 0.3,
    spacingAwareness: 0.85,
    punishBonus: 0.15,
  },
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
  // Rare and hesitant: a beginner sees the special exists without eating it all the time.
  special: {
    useChance: 0.13,
    decisionCooldown: [120, 180],
    declineCooldown: [90, 150],
    readyDelay: [60, 120],
    finisherBias: 0.08,
    spacingAwareness: 0.5,
    punishBonus: 0,
  },
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
  // Frequent and smart: right spacing, whiff punishes and round finishers.
  special: {
    useChance: 0.72,
    decisionCooldown: [30, 65],
    declineCooldown: [12, 24],
    readyDelay: [6, 16],
    finisherBias: 0.6,
    spacingAwareness: 1,
    punishBonus: 0.35,
  },
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
