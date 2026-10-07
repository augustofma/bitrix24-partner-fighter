/*
 * The game's typography, in one place. Every font is open source (SIL Open Font License 1.1),
 * bundled under public/fonts/<name>/ with its OFL.txt, and loaded by the BootScene before the
 * first screen, so text looks the same on every device and works offline. Each family lists
 * fallbacks for the glyphs a font lacks (e.g. "→") and for a failed load.
 *
 * Roles:
 * - TITLE:  big fight lettering ("<NAME> VENCEU!", ROUND/FIGHT!/K.O., route titles).
 * - ARCADE: buttons, fighter names, headings, labels: bold and readable at any size.
 * - HUD:    the fight clock and other numeric readouts: classic 8-bit arcade digits.
 * - PIXEL:  small pixel-styled captions (map cities, stage counters).
 * - BODY:   descriptions and hints, where reading comfort matters most.
 */

const ARCADE_FALLBACK = '"Arial Black", Impact, "Trebuchet MS", sans-serif';

export const GAME_FONTS = {
  TITLE: `"Bangers", ${ARCADE_FALLBACK}`,
  ARCADE: `"Russo One", ${ARCADE_FALLBACK}`,
  HUD: `"Press Start 2P", "Courier New", monospace`,
  PIXEL: `"Pixelify Sans", "Press Start 2P", ${ARCADE_FALLBACK}`,
  BODY: 'system-ui, "Segoe UI", Roboto, sans-serif',
} as const;

export type GameFontRole = keyof typeof GAME_FONTS;

/** A bundled font file: `family` is the name GAME_FONTS refers to. */
export interface FontFileDefinition {
  family: string;
  path: string;
  license: string;
}

export const FONT_FILES: readonly FontFileDefinition[] = [
  { family: 'Bangers', path: 'fonts/bangers/Bangers-Regular.ttf', license: 'OFL-1.1' },
  { family: 'Russo One', path: 'fonts/russo-one/RussoOne-Regular.ttf', license: 'OFL-1.1' },
  {
    family: 'Press Start 2P',
    path: 'fonts/press-start-2p/PressStart2P-Regular.ttf',
    license: 'OFL-1.1',
  },
  {
    family: 'Pixelify Sans',
    path: 'fonts/pixelify-sans/PixelifySans-Variable.ttf',
    license: 'OFL-1.1',
  },
];
