/*
 * The title screen's wind, as pure math (testable without Phaser). One arena wind blows from
 * right to left over both fighters: it never stops, rises and falls in slow gusts, and every
 * part (hair, collars, backs, hems, sleeves) is cut in thin strips that each sway a little
 * later than the previous one, so the motion travels along the cloth like a real wave. The
 * edge sewn to the body barely moves; the free edge moves the most.
 */

/** Edge of a part that stays attached to the body. */
export type WindAnchor = 'top' | 'bottom' | 'left' | 'right';

/** rows: horizontal strips swaying sideways; columns: vertical strips fluttering up/down. */
export type WindStrips = 'rows' | 'columns';

/** How a part reacts to the wind. */
export interface WindStyle {
  /** Largest displacement at the free edge, in game pixels. */
  amplitude: number;
  /** Ripples per second. */
  frequency: number;
  /** Phase step between neighbouring strips (cycles): how fast the wave travels. */
  travel: number;
  /**
   * Share of the motion that always leans with the wind (0: swings both ways around the art,
   * 1: always blown back). Hair leans back; cloth mostly flutters around its rest shape.
   */
  lean: number;
  /** Starting phase (cycles), so the parts never move in sync. */
  phase: number;
}

/** Strip thickness in game pixels (thin enough to read as a smooth wave). */
export const STRIP_PX = 2;

/** Slow gusts: the wind's strength between ~0.55 and 1, never zero, never periodic-looking. */
export function windGust(timeSeconds: number): number {
  const slow = Math.sin(2 * Math.PI * timeSeconds * 0.13);
  const slower = Math.sin(2 * Math.PI * timeSeconds * 0.071 + 1.3);
  return 0.775 + 0.225 * (0.6 * slow + 0.4 * slower);
}

/** How free strip `index` of `count` is: 0 at the anchored edge, 1 at the free edge. */
export function stripFreedom(index: number, count: number, anchor: WindAnchor): number {
  const along = count > 1 ? index / (count - 1) : 1;
  // Strips are numbered top to bottom (rows) or left to right (columns).
  const fromAnchor = anchor === 'top' || anchor === 'left' ? along : 1 - along;
  // Eased: the part near the seam stays almost still.
  return fromAnchor ** 1.4;
}

/**
 * Displacement of strip `index` (game px, sideways for rows, vertical for columns). The wind
 * blows toward -x, so a positive lean pushes strips left (rows) or down (columns).
 */
export function stripOffset(
  timeSeconds: number,
  index: number,
  count: number,
  anchor: WindAnchor,
  style: WindStyle,
): number {
  const freedom = stripFreedom(index, count, anchor);
  if (freedom === 0) return 0;
  const wave = Math.sin(
    2 * Math.PI * (timeSeconds * style.frequency - index * style.travel + style.phase),
  );
  // lean = 1: always between 0 and -amplitude; lean = 0: between -amplitude and +amplitude.
  const motion = style.lean * (0.5 + 0.5 * wave) + (1 - style.lean) * wave;
  return -style.amplitude * freedom * windGust(timeSeconds) * motion;
}

/** Wind of each title part: hair moves most, collars least; the phases keep them apart. */
export const WIND_STYLES: Readonly<Record<string, WindStyle>> = {
  'joao-hair': { amplitude: 2.6, frequency: 0.9, travel: 0.06, lean: 0.75, phase: 0 },
  'joao-back': { amplitude: 1.2, frequency: 0.7, travel: 0.05, lean: 0.4, phase: 0.2 },
  'joao-collar': { amplitude: 1.1, frequency: 1.0, travel: 0.08, lean: 0.4, phase: 0.45 },
  'joao-hem': { amplitude: 1.6, frequency: 0.8, travel: 0.06, lean: 0.35, phase: 0.6 },
  'joao-sleeve': { amplitude: 1.0, frequency: 0.85, travel: 0.07, lean: 0.2, phase: 0.8 },
  'isaque-collar': { amplitude: 1.1, frequency: 1.0, travel: 0.08, lean: 0.4, phase: 0.1 },
  'isaque-back': { amplitude: 1.4, frequency: 0.75, travel: 0.05, lean: 0.3, phase: 0.35 },
  'isaque-hem': { amplitude: 1.6, frequency: 0.8, travel: 0.06, lean: 0.35, phase: 0.55 },
  'isaque-sleeve': { amplitude: 1.0, frequency: 0.85, travel: 0.07, lean: 0.2, phase: 0.75 },
};

/** Gentle fallback for a part without its own style. */
export const DEFAULT_WIND: WindStyle = {
  amplitude: 1,
  frequency: 0.8,
  travel: 0.06,
  lean: 0.3,
  phase: 0,
};
