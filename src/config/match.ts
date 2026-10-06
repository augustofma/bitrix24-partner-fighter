import { SIMULATION_FPS } from './simulation';

export const ROUND_TIME_SECONDS = 99;
export const ROUND_TIME_FRAMES = ROUND_TIME_SECONDS * SIMULATION_FPS;

/** "ROUND 1" + "FIGHT!" announcement before control is given. */
export const ROUND_INTRO_FRAMES = 2 * SIMULATION_FPS;
/** Frames after KO / time over before the winner strikes the victory pose. */
export const VICTORY_POSE_DELAY_FRAMES = Math.round(1.2 * SIMULATION_FPS);
/** Frames after KO / time over before the round is considered finished. */
export const ROUND_OUTRO_FRAMES = Math.round(3.2 * SIMULATION_FPS);

/** Only one round in v0.1. */
export const ROUND_NUMBER = 1;
