import type Phaser from 'phaser';
import { GAME_FONTS } from '../config/fonts';

/** Shared look of the provisional arcade UI. Change here, not in scenes. */
export const COLORS = {
  gold: 0xffd23f,
  cyan: 0x2fc6f6,
  magenta: 0xff3e9a,
  red: 0xe63946,
  white: 0xffffff,
  ink: 0x0b0820,
  panel: 0x1b1240,
  panelLight: 0x2c1f63,
  healthFull: 0xffd23f,
  healthLow: 0xff6b35,
  healthTrail: 0xffffff,
  healthBack: 0x5c0f1a,
  hitSpark: 0xfff3b0,
  blockSpark: 0x7fe7ff,
  koSpark: 0xff3e3e,
  // Character select, tuned to the title screen art: night navy/indigo, neon cyan and royal
  // blue for the cold side, violet + gold for the main call to action, orange/magenta accents.
  navy: 0x0c0f45,
  navyDeep: 0x07082c,
  indigo: 0x17117a,
  royal: 0x2a5cff,
  neon: 0x2fe0ff,
  violet: 0x4a10cc,
  violetLight: 0x7a2cf0,
  orange: 0xff8a1f,
} as const;

/** Default UI family (arcade role); see config/fonts.ts for every role. */
export const FONT_FAMILY = GAME_FONTS.ARCADE;

export const DEPTH = {
  stage: 0,
  shadows: 5,
  fighters: 10,
  effects: 20,
  debug: 30,
  hud: 100,
  announcer: 110,
  touch: 120,
} as const;

/** Hex number -> CSS color string. */
export function css(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/** Standard arcade text: bold, outlined, with a drop shadow. */
export function arcadeText(
  size: number,
  color: number = COLORS.white,
  stroke: number = COLORS.ink,
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_FAMILY,
    fontSize: `${size}px`,
    color: css(color),
    stroke: css(stroke),
    strokeThickness: Math.max(3, Math.round(size / 7)),
    shadow: { offsetX: 0, offsetY: Math.max(2, size / 12), color: '#000000', blur: 0, fill: true },
    align: 'center',
  };
}

/** Plain, readable text for descriptions and hints. */
export function bodyText(
  size: number,
  color: number = COLORS.white,
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: GAME_FONTS.BODY,
    fontSize: `${size}px`,
    color: css(color),
    align: 'center',
  };
}

/** HUD readouts (fight clock, counters): 8-bit arcade digits with a hard outline. */
export function hudText(
  size: number,
  color: number = COLORS.white,
  stroke: number = COLORS.ink,
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    ...arcadeText(size, color, stroke),
    fontFamily: GAME_FONTS.HUD,
    strokeThickness: Math.max(3, Math.round(size / 5)),
    shadow: { offsetX: 0, offsetY: Math.max(2, size / 8), color: '#000000', blur: 0, fill: true },
  };
}

/** Small pixel-styled captions (map cities, stage counters). */
export function pixelText(
  size: number,
  color: number = COLORS.white,
  stroke: number = COLORS.ink,
): Phaser.Types.GameObjects.Text.TextStyle {
  return { ...arcadeText(size, color, stroke), fontFamily: GAME_FONTS.PIXEL, fontStyle: 'bold' };
}
