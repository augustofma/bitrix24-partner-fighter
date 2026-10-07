import { mergeInputs } from '../core/input';
import type { InputReadContext, InputSource, InputState } from '../types/input';
import type { ControllerContext, FighterController } from './FighterController';

/** Human player: merges every attached device (keyboard, touch, future gamepad). */
export class PlayerController implements FighterController {
  constructor(private readonly sources: readonly InputSource[]) {}

  getInput(context?: ControllerContext): InputState {
    const readContext: InputReadContext | undefined = context && {
      selfAirborne: context.self.isAirborne,
    };
    return mergeInputs(this.sources.map((source) => source.read(readContext)));
  }

  /** New round: devices drop any per-push memory (e.g. the joystick's jump latch). */
  reset(): void {
    for (const source of this.sources) source.reset?.();
  }

  destroy(): void {
    for (const source of this.sources) source.destroy?.();
  }
}
