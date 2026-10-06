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
