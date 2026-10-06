import Phaser from 'phaser';
import type { KeyBindings } from '../config/controls';
import { INPUT_ACTIONS, type InputAction, type InputSource, type InputState } from '../types/input';

/** Maps keyboard keys to game actions using a remappable KeyBindings table. */
export class KeyboardInputSource implements InputSource {
  private readonly keys: Record<InputAction, Phaser.Input.Keyboard.Key[]>;

  constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin, bindings: KeyBindings) {
    const keys = {} as Record<InputAction, Phaser.Input.Keyboard.Key[]>;
    for (const action of INPUT_ACTIONS) {
      keys[action] = bindings[action].map((code) => keyboard.addKey(code));
    }
    this.keys = keys;
  }

  read(): Partial<InputState> {
    const state: Partial<InputState> = {};
    for (const action of INPUT_ACTIONS) {
      state[action] = this.keys[action].some((key) => {
        // JustDown is always consulted so a tap shorter than one frame is not lost.
        const tapped = Phaser.Input.Keyboard.JustDown(key);
        return key.isDown || tapped;
      });
    }
    return state;
  }
}
