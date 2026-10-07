import { STRINGS } from '../../config/strings';
import type { FighterConfig } from '../../types/fighter';
import type { MatchResult } from '../../types/match';

export type ResultTone = 'win' | 'lose' | 'neutral';
/**
 * Typographic role in the result line: the verdict leads, the detail (reason, route) is quieter
 * and the score is a heavy scoreboard figure. See createResultLine.
 */
export type ResultRole = 'verdict' | 'detail' | 'score';

/** One piece of the result line ("VOCÊ VENCEU!", "Vitória por nocaute", "2 x 0"). */
export interface ResultSegment {
  text: string;
  tone: ResultTone;
  /** Defaults to the tone: colored segments are verdicts, neutral ones details. */
  role?: ResultRole;
}

export function resultRole(segment: ResultSegment): ResultRole {
  return segment.role ?? (segment.tone === 'neutral' ? 'detail' : 'verdict');
}

export interface VictoryContent {
  title: string;
  /** Fighters shown on the card: the winner, or both sides on a draw. */
  featured: readonly FighterConfig[];
  /** Name plate under the portrait. */
  nameLabel: string;
  result: readonly ResultSegment[];
}

/**
 * Everything the victory screen writes, derived only from the real MatchResult (no Phaser,
 * so it is testable): winner, verdict for the player, reason of the last round and score.
 */
export function victoryContent(
  result: MatchResult,
  sides: readonly [FighterConfig, FighterConfig],
): VictoryContent {
  const { winnerIndex, reason, roundWins } = result;
  const score: ResultSegment = {
    text: STRINGS.matchScore(roundWins[0], roundWins[1]),
    tone: 'neutral',
    role: 'score',
  };
  if (winnerIndex === null) {
    return {
      title: STRINGS.draw,
      featured: sides,
      nameLabel: STRINGS.drawNames(sides[0].displayName, sides[1].displayName),
      result: [{ text: STRINGS.reasonMatchDraw, tone: 'neutral' }, score],
    };
  }
  const winner = sides[winnerIndex];
  const playerWon = winnerIndex === 0;
  return {
    title: STRINGS.wins(winner.displayName),
    featured: [winner],
    nameLabel: winner.displayName,
    result: [
      { text: playerWon ? STRINGS.youWin : STRINGS.youLose, tone: playerWon ? 'win' : 'lose' },
      { text: reason === 'ko' ? STRINGS.reasonKo : STRINGS.reasonTimeout, tone: 'neutral' },
      score,
    ],
  };
}
