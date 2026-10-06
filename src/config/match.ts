import type { AIDifficulty } from '../types/match';
import { SIMULATION_FPS } from './simulation';

export const ROUND_TIME_SECONDS = 99;
export const ROUND_TIME_FRAMES = ROUND_TIME_SECONDS * SIMULATION_FPS;

/** "ROUND 1" + "FIGHT!" announcement before control is given. */
export const ROUND_INTRO_FRAMES = 2 * SIMULATION_FPS;
/** Frames after KO / time over before the winner strikes the victory pose. */
export const VICTORY_POSE_DELAY_FRAMES = Math.round(1.2 * SIMULATION_FPS);
/** Frames after KO / time over before the round is considered finished. */
export const ROUND_OUTRO_FRAMES = Math.round(3.2 * SIMULATION_FPS);

/** Best of three: the first fighter to win this many rounds wins the match. */
export const ROUNDS_TO_WIN = 2;
/**
 * Safety cap on rounds played (drawn rounds award no point and are replayed). When reached,
 * the fighter with more round wins takes the match, otherwise the match is a draw.
 */
export const MAX_ROUNDS = 9;

/** CPU difficulty selected when the player has not chosen one in this session. */
export const DEFAULT_AI_DIFFICULTY: AIDifficulty = 'normal';
