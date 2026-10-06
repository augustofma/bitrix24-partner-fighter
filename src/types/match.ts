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

export interface MatchResult extends RoundResult {
  setup: MatchSetup;
}
