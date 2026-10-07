/** CPU difficulty levels, easiest first (the order the selector cycles through). */
export const AI_DIFFICULTIES = ['easy', 'normal', 'hard'] as const;
export type AIDifficulty = (typeof AI_DIFFICULTIES)[number];

export function isAIDifficulty(value: unknown): value is AIDifficulty {
  return AI_DIFFICULTIES.some((difficulty) => difficulty === value);
}

/** Quick fight (a single match) or a story campaign fight. */
export type GameMode = 'quick' | 'story';

/** What the scenes pass to each other to describe a match. */
export interface MatchSetup {
  playerFighterId: string;
  cpuFighterId: string;
  stageId: string;
  /** Picks the CPU's AIProfile; never changes fighter stats, damage or health. */
  difficulty: AIDifficulty;
  /** Story fights get the campaign screens around them; omitted = quick fight. */
  mode?: GameMode;
}

export type RoundEndReason = 'ko' | 'timeout';

export interface RoundResult {
  /** Index (0 = player side, 1 = CPU side) of the winner, or null for a draw. */
  winnerIndex: 0 | 1 | null;
  reason: RoundEndReason;
}

/** Final result of a best-of-N match, handed to the victory screen. */
export interface MatchResult extends RoundResult {
  setup: MatchSetup;
  /** Rounds won by each side (0 = player, 1 = CPU). */
  roundWins: readonly [number, number];
}
