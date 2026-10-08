import type Phaser from 'phaser';

const FADE_MS = 250;
const leaving = new WeakSet<Phaser.Scene>();

/** Whether `scene` is already fading out to another scene (further calls are ignored). */
export function isLeaving(scene: Phaser.Scene): boolean {
  return leaving.has(scene);
}

/**
 * Fades the camera out and starts another scene. Repeated calls are ignored: returns false
 * when a transition was already under way, so callers can skip side effects (e.g. registry
 * changes) that belong to a transition that will not happen.
 */
export function goToScene(scene: Phaser.Scene, key: string, data?: object): boolean {
  if (leaving.has(scene)) return false;
  leaving.add(scene);
  scene.events.once('shutdown', () => leaving.delete(scene));

  const camera = scene.cameras.main;
  camera.fadeOut(FADE_MS, 0, 0, 0);
  camera.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
  return true;
}

export function fadeIn(scene: Phaser.Scene): void {
  scene.cameras.main.fadeIn(FADE_MS, 0, 0, 0);
}
