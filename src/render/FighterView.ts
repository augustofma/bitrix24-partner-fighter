import type { ReadonlyFighter } from '../core/fighter/ReadonlyFighter';

/**
 * Visual representation of a fighter. Reads the simulation, never changes it.
 * Implementations: PlaceholderFighterView (v0.1). Future: SpriteFighterView, which plays
 * one animation per FighterStateId from `config.assets.animations`.
 */
export interface FighterView {
  sync(fighter: ReadonlyFighter, timeMs: number): void;
  destroy(): void;
}
