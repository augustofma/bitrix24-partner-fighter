import type Phaser from 'phaser';
import { playSfx } from '../audio/gameAudio';
import { MENU_NEXT_KEYS, MENU_PREV_KEYS } from '../config/controls';
import { onKeys, stepFocus } from '../input/menuKeys';

interface Focusable {
  setHighlighted(highlighted: boolean): unknown;
}

/**
 * Keyboard focus for a row of buttons: the arrows move it (wrapping, with the menu sound) and
 * `focused()` says which one Enter should press. The first button starts focused. `enabled`
 * gates the arrows (e.g. while the row is still hidden).
 */
export function bindButtonRowFocus(
  scene: Phaser.Scene,
  buttons: readonly Focusable[],
  enabled: () => boolean = () => true,
): { focused: () => number } {
  let focus = 0;
  const setFocus = (next: number) => {
    buttons[focus]?.setHighlighted(false);
    focus = next;
    buttons[focus]?.setHighlighted(true);
  };
  if (buttons.length > 0) setFocus(0);
  const move = (step: number) => () => {
    if (buttons.length < 2 || !enabled()) return;
    playSfx(scene, 'menu-move');
    setFocus(stepFocus(focus, step, buttons.length));
  };
  onKeys(scene, MENU_PREV_KEYS, move(-1));
  onKeys(scene, MENU_NEXT_KEYS, move(1));
  return { focused: () => focus };
}
