/**
 * Abstract game actions. Devices (keyboard, touch, gamepad, AI, network) all map to these.
 * Directions are ABSOLUTE (screen left/right); the fighter converts them to forward/back.
 */
export const INPUT_ACTIONS = [
  'left',
  'right',
  'up',
  'down',
  'punch',
  'kick',
  'block',
  'special',
] as const;

export type InputAction = (typeof INPUT_ACTIONS)[number];

/** Which actions are held down during one simulation frame. */
export type InputState = Record<InputAction, boolean>;

/** Held state plus edges ("pressed this frame") derived by the simulation. */
export interface InputFrame {
  held: InputState;
  pressed: InputState;
}

/**
 * Read-only facts about the controlled fighter that a device may need to express the player's
 * intent (never to decide gameplay). Example: the touch joystick gives one jump per push up.
 */
export interface InputReadContext {
  selfAirborne: boolean;
}

/** Anything that can report held actions (keyboard, touch buttons, gamepad...). */
export interface InputSource {
  /** Called once per simulation frame. */
  read(context?: InputReadContext): Partial<InputState>;
  /** Forgets per-push memory (new round). */
  reset?(): void;
  /** Releases listeners. */
  destroy?(): void;
}
