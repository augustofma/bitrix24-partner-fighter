/**
 * Simulation constants. The fight runs at a FIXED step so that frame data is exact
 * regardless of monitor refresh rate (also a prerequisite for future online play).
 */
export const SIMULATION_FPS = 60;
export const FIXED_STEP_MS = 1000 / SIMULATION_FPS;
/** Avoid the "spiral of death" after a tab switch or a long hitch. */
export const MAX_STEPS_PER_FRAME = 5;

/** Downward acceleration in px/frame^2. */
export const GRAVITY = 0.9;
/** Horizontal velocity multiplier per frame while sliding on the ground (hit/block push). */
export const GROUND_FRICTION = 0.8;
/** Below this horizontal speed (px/frame) a sliding fighter stops. */
export const MIN_SLIDE_SPEED = 0.1;

/** On KO the loser is launched slightly upward (px/frame). */
export const KO_LAUNCH_SPEED = 7;
/** Extra knockback multiplier applied on KO. */
export const KO_KNOCKBACK_MULTIPLIER = 1.6;
/** Freeze frames on the KO hit. */
export const KO_HITSTOP_FRAMES = 24;

/** Max horizontal distance between fighters, so both always fit on screen. */
export const MAX_FIGHTER_SEPARATION = 760;

/** An attack button pressed slightly before the fighter can act is remembered this long. */
export const INPUT_BUFFER_FRAMES = 6;

/** Horizontal distance from the arena center where each fighter starts. */
export const SPAWN_OFFSET_X = 170;
