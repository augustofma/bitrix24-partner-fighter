import type { FighterConfig } from '../types/fighter';
import { filipe } from './filipe';
import { augusto } from './augusto';
import { fighterA } from './fighterA';
import { fighterB } from './fighterB';
import { joaoGuiotti } from './joaoGuiotti';
import { romualdo } from './romualdo';
import { dmitry } from './dmitry';
import { aislan } from './aislan';
import { isaqueFerreira } from './isaqueFerreira';

/**
 * Every fighter in the game, in character-select order.
 * Adding a character: create `src/fighters/<id>.ts` and append it here.
 */
export const ROSTER: readonly FighterConfig[] = [
  augusto,
  filipe,
  joaoGuiotti,
  romualdo,
  isaqueFerreira,
  aislan,
  dmitry,
  fighterA,
  fighterB,
];

export function getFighterConfig(id: string): FighterConfig {
  const config = ROSTER.find((fighter) => fighter.id === id);
  if (!config) throw new Error(`Unknown fighter id: "${id}"`);
  return config;
}

/** The fighters offered to players (Character Select in every mode, CPU opponents). */
export function getPlayableFighters(): FighterConfig[] {
  return ROSTER.filter((fighter) => fighter.playable);
}

/**
 * Quick-fight CPU opponent: the next playable fighter after the player in roster order
 * (wrapping around), so every playable fighter is also a CPU opponent. Falls back to any other
 * fighter when the roster has a single playable one.
 */
export function pickCpuOpponent(playerFighterId: string): FighterConfig {
  const playable = getPlayableFighters();
  const at = playable.findIndex((fighter) => fighter.id === playerFighterId);
  for (let step = 1; step <= playable.length; step++) {
    // `at` is -1 when the player is not playable (tests): start from the first one.
    const candidate = playable[(at + step) % playable.length];
    if (candidate && candidate.id !== playerFighterId) return candidate;
  }
  const other = ROSTER.find((fighter) => fighter.id !== playerFighterId);
  if (!other) throw new Error('The roster needs at least two fighters.');
  return other;
}
