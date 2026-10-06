import type { CROUCH_ATTACK_STATES, GROUND_ATTACK_STATES } from '../types/fighter';

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
