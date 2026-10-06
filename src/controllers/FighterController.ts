import type { ReadonlyFighter } from '../core/fighter/ReadonlyFighter';
import type { InputState } from '../types/input';

export interface ControllerContext {
  self: ReadonlyFighter;
  opponent: ReadonlyFighter;
}

/**
 * Produces the held actions for one fighter, once per simulation frame.
 * Player, CPU and (future) network/replay controllers all implement this, so the
 * simulation never knows who is in control.
 */
export interface FighterController {
  getInput(context: ControllerContext): InputState;
  /** Releases listeners / DOM / timers. */
  destroy?(): void;
}
