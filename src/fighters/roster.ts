import type { FighterConfig } from '../types/fighter';
import { filipe } from './filipe';
import { augusto } from './augusto';
import { fighterA } from './fighterA';
import { fighterB } from './fighterB';

/**
 * Every fighter in the game, in character-select order.
 * Adding a character: create `src/fighters/<id>.ts` and append it here.
 */
export const ROSTER: readonly FighterConfig[] = [augusto, filipe, fighterA, fighterB];

export function getFighterConfig(id: string): FighterConfig {
  const config = ROSTER.find((fighter) => fighter.id === id);
  if (!config) throw new Error(`Unknown fighter id: "${id}"`);
  return config;
}

export function getSelectableFighters(): FighterConfig[] {
  return ROSTER.filter((fighter) => fighter.selectable);
}

/** Prefer CPU-only fighters, then fall back to the first different fighter. */
export function pickCpuOpponent(playerFighterId: string): FighterConfig {
  const opponent =
    ROSTER.find((fighter) => !fighter.selectable && fighter.id !== playerFighterId) ??
    ROSTER.find((fighter) => fighter.id !== playerFighterId);
  if (!opponent) throw new Error('The roster needs at least two fighters.');
  return opponent;
}
