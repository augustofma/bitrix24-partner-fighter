import { INPUT_ACTIONS, type InputFrame, type InputState } from '../types/input';

export function createInputState(partial: Partial<InputState> = {}): InputState {
  return {
    left: partial.left ?? false,
    right: partial.right ?? false,
    up: partial.up ?? false,
    down: partial.down ?? false,
    punch: partial.punch ?? false,
    kick: partial.kick ?? false,
    block: partial.block ?? false,
    special: partial.special ?? false,
  };
}

export const NEUTRAL_INPUT: Readonly<InputState> = Object.freeze(createInputState());

/** Logical OR of several partial input states (e.g. keyboard + touch). */
export function mergeInputs(parts: readonly Partial<InputState>[]): InputState {
  const merged = createInputState();
  for (const part of parts) {
    for (const action of INPUT_ACTIONS) {
      if (part[action]) merged[action] = true;
    }
  }
  return merged;
}

/** -1 (left), 0 (none / both), 1 (right). */
export function horizontalAxis(input: Readonly<InputState>): -1 | 0 | 1 {
  if (input.left === input.right) return 0;
  return input.left ? -1 : 1;
}

/** Derives "pressed this frame" edges from consecutive held states. */
export class InputTracker {
  private previous: InputState = createInputState();

  next(held: Readonly<InputState>): InputFrame {
    const pressed = createInputState();
    for (const action of INPUT_ACTIONS) {
      pressed[action] = held[action] && !this.previous[action];
    }
    this.previous = createInputState(held);
    return { held: createInputState(held), pressed };
  }
}
