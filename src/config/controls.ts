import type { InputAction } from '../types/input';

/**
 * Keyboard bindings, as Phaser key code names (Phaser.Input.Keyboard.KeyCodes).
 * Remapping = change this table (or load a user-saved copy at startup).
 * Several keys can map to the same action.
 */
export type KeyBindings = Record<InputAction, readonly string[]>;

export const PLAYER_ONE_KEYS: KeyBindings = {
  left: ['LEFT'],
  right: ['RIGHT'],
  up: ['UP'],
  down: ['DOWN'],
  punch: ['A'],
  kick: ['S'],
  block: ['D'],
};

/** Keys used to confirm / go back in menus. */
export const MENU_CONFIRM_KEYS: readonly string[] = ['ENTER', 'SPACE'];
export const MENU_BACK_KEYS: readonly string[] = ['ESC', 'BACKSPACE'];

/** Toggles the hitbox/hurtbox debug overlay during a fight. */
export const DEBUG_TOGGLE_KEY = 'F2';
