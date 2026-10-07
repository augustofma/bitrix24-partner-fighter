import { MAX_ROUNDS, ROUNDS_TO_WIN } from '../../config/match';
import type { RoundEndReason, RoundResult } from '../../types/match';

export type FighterSide = 0 | 1;

/** How a whole match ended. */
export interface MatchOutcome {
  /** Side that won the match, or null for a drawn match (only possible at the round cap). */
  winnerIndex: FighterSide | null;
  /** Why the deciding (last) round ended. */
  reason: RoundEndReason;
  roundWins: readonly [number, number];
  roundsPlayed: number;
  /** PERFECT rounds won by each side. */
  perfects: readonly [number, number];
}

export type MatchEvent =
  | { type: 'roundStart'; roundNumber: number; finalRound: boolean }
  | { type: 'roundDraw'; roundNumber: number }
  | { type: 'matchOver'; outcome: MatchOutcome };

export interface MatchRules {
  roundsToWin: number;
  maxRounds: number;
}

export const DEFAULT_MATCH_RULES: MatchRules = {
  roundsToWin: ROUNDS_TO_WIN,
  maxRounds: MAX_ROUNDS,
};

/**
 * Best-of-N bookkeeping on top of RoundSystem (pure, no fighters involved):
 * a round winner scores a point; a drawn round scores nothing and is replayed; the first side
 * with `roundsToWin` points wins. `maxRounds` bounds endless draws deterministically.
 */
export class MatchSystem {
  private readonly wins: [number, number] = [0, 0];
  private roundNumber = 1;
  private outcome: MatchOutcome | null = null;
  private readonly perfectWins: [number, number] = [0, 0];

  constructor(private readonly rules: MatchRules = DEFAULT_MATCH_RULES) {}

  get currentRound(): number {
    return this.roundNumber;
  }

  get roundWins(): readonly [number, number] {
    return this.wins;
  }

  /** Both sides are one win away from the match. */
  get isFinalRound(): boolean {
    const matchPoint = this.rules.roundsToWin - 1;
    return matchPoint > 0 && this.wins[0] === matchPoint && this.wins[1] === matchPoint;
  }

  get isOver(): boolean {
    return this.outcome !== null;
  }

  get result(): MatchOutcome | null {
    return this.outcome;
  }

  /** Records a finished round and says what happens next. */
  recordRound(result: RoundResult): MatchEvent[] {
    if (this.outcome) return [];
    const events: MatchEvent[] = [];
    if (result.winnerIndex === null)
      events.push({ type: 'roundDraw', roundNumber: this.roundNumber });
    else {
      this.wins[result.winnerIndex]++;
      if (result.perfect) this.perfectWins[result.winnerIndex]++;
    }

    const decided = this.wins.some((w) => w >= this.rules.roundsToWin);
    if (decided || this.roundNumber >= this.rules.maxRounds) {
      const [a, b] = this.wins;
      this.outcome = {
        winnerIndex: a === b ? null : a > b ? 0 : 1,
        reason: result.reason,
        roundWins: [a, b],
        roundsPlayed: this.roundNumber,
        perfects: [this.perfectWins[0], this.perfectWins[1]],
      };
      events.push({ type: 'matchOver', outcome: this.outcome });
      return events;
    }
    this.roundNumber++;
    events.push({
      type: 'roundStart',
      roundNumber: this.roundNumber,
      finalRound: this.isFinalRound,
    });
    return events;
  }
}
