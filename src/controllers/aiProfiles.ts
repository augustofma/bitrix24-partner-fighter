/** Tunable personality of a CPU opponent. Chances are 0..1, durations in frames. */
export interface AIProfile {
  /** Frames the CPU needs to "see" an incoming attack before reacting. */
  reactionFrames: number;
  /** Chance to block an attack it sees coming in range. */
  blockChance: number;
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
  /** Chance that a ground kick is thrown low (crouchKick). */
  lowKickChance: number;
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
  aggression: 0.42,
  retreatChance: 0.22,
  guardChance: 0.12,
  jumpInChance: 0.08,
  jumpInAttackChance: 0.6,
  lowKickChance: 0.3,
  attackCooldown: [22, 48],
  approachFrames: [16, 36],
  retreatFrames: [14, 28],
  guardFrames: [12, 24],
  waitFrames: [10, 24],
};
