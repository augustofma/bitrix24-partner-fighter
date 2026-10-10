import type Phaser from 'phaser';

/**
 * Calls `handler` when any of the given keys (Phaser key code names) is pressed.
 * Listeners are removed automatically when the scene shuts down.
 */
export function onKeys(
  scene: Phaser.Scene,
  keyNames: readonly string[],
  handler: () => void,
): void {
  const keyboard = scene.input.keyboard;
  if (!keyboard) return;
  for (const name of keyNames) {
    const event = `keydown-${name}`;
    keyboard.on(event, handler);
    scene.events.once('shutdown', () => keyboard.off(event, handler));
  }
}

/** The option `step` places away from `index` in a row of `count`, wrapping at the ends. */
export function stepFocus(index: number, step: number, count: number): number {
  if (count <= 0) return 0;
  return (((index + step) % count) + count) % count;
}
