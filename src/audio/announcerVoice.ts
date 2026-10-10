import { MAX_ROUNDS } from '../config/match';
import type { SfxId } from '../types/audio';

/*
 * The announcer's voice for the fight calls (files from scripts/voice/generate_announcer.py).
 * Pure mapping from what happens to which line is said; the scenes play it next to the text.
 */

const ROUND_LINES: readonly SfxId[] = [
  'voice-round-1',
  'voice-round-2',
  'voice-round-3',
  'voice-round-4',
  'voice-round-5',
  'voice-round-6',
  'voice-round-7',
  'voice-round-8',
  'voice-round-9',
];

/** "ROUND n" (or "FINAL ROUND" when both sides are one win away). */
export function roundVoice(round: number, finalRound: boolean): SfxId {
  if (finalRound) return 'voice-final-round';
  const index = Math.min(Math.max(round, 1), Math.min(MAX_ROUNDS, ROUND_LINES.length)) - 1;
  return ROUND_LINES[index] as SfxId;
}

/** The other calls of a fight, and the verdict on the victory screen. */
export const ANNOUNCER_VOICE = {
  fight: 'voice-fight',
  ko: 'voice-ko',
  perfect: 'voice-perfect',
  timeOver: 'voice-time-over',
  draw: 'voice-draw',
  youWin: 'voice-you-win',
  youLose: 'voice-you-lose',
} as const satisfies Record<string, SfxId>;

/** The victory screen's verdict for the player (side 0): won, lost, or a drawn match. */
export function verdictVoice(winnerIndex: 0 | 1 | null): SfxId {
  if (winnerIndex === 0) return ANNOUNCER_VOICE.youWin;
  if (winnerIndex === 1) return ANNOUNCER_VOICE.youLose;
  return ANNOUNCER_VOICE.draw;
}

/** The verdict comes right after the victory sting starts, not on top of its first hit. */
export const VERDICT_DELAY_MS = 450;
