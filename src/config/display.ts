/**
 * Logical resolution. Everything is authored in these units and Phaser scales the canvas
 * (Scale.FIT) to the window while keeping 16:9, so fighters are never deformed.
 * 960x540 is 1/2 of 1080p and 1/4 of 4K: crisp scaling, good for 2D fighter sprites.
 */
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const BACKGROUND_COLOR = '#05040f';
