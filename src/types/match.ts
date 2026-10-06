/** What the scenes pass to each other to describe a match. */
export interface MatchSetup {
  playerFighterId: string;
  cpuFighterId: string;
  stageId: string;
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
