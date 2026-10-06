import { mergeInputs } from '../core/input';
import type { InputSource, InputState } from '../types/input';
import type { FighterController } from './FighterController';

/** Human player: merges every attached device (keyboard, touch, future gamepad). */
export class PlayerController implements FighterController {
  constructor(private readonly sources: readonly InputSource[]) {}

  getInput(): InputState {
    return mergeInputs(this.sources.map((source) => source.read()));
  }
}
