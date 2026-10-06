import { attackReach } from '../../core/fighter/attackFrames';
import type { AttackConfig, FighterConfig } from '../../types/fighter';

/** Number of pips in each rating bar. */
export const RATING_MAX = 5;
/** Lowest rating shown: every playable fighter is decent at everything. */
export const RATING_MIN = 2;

export interface FighterRatings {
  power: number;
  speed: number;
  reach: number;
}

/**
 * Display-only ratings (RATING_MIN..RATING_MAX) for the select screen, derived from the real config
 * relative to the rest of the roster. Read-only: nothing here feeds back into gameplay, so the
 * bars always follow balance changes instead of drifting from them.
 */
export function rateFighter(
  fighter: FighterConfig,
  roster: readonly FighterConfig[],
): FighterRatings {
  const scale = (metric: (config: FighterConfig) => number) =>
    relativeRating(
      metric(fighter),
      roster.map((config) => metric(config)),
    );
  return {
    power: scale(totalNormalDamage),
    speed: scale((config) => config.stats.walkSpeed),
    reach: scale(averageNormalReach),
  };
}

function normals(config: FighterConfig): AttackConfig[] {
  return Object.values(config.attacks);
}

function totalNormalDamage(config: FighterConfig): number {
  return normals(config).reduce((sum, attack) => sum + attack.damage, 0);
}

function averageNormalReach(config: FighterConfig): number {
  const attacks = normals(config);
  return attacks.reduce((sum, attack) => sum + attackReach(attack), 0) / attacks.length;
}

/** Min-max over the roster mapped to RATING_MIN..RATING_MAX; the middle when all are equal. */
function relativeRating(value: number, all: readonly number[]): number {
  const min = Math.min(...all);
  const max = Math.max(...all);
  if (max - min < Number.EPSILON) return Math.ceil((RATING_MIN + RATING_MAX) / 2);
  return RATING_MIN + Math.round(((value - min) / (max - min)) * (RATING_MAX - RATING_MIN));
}
