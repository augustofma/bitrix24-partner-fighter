import type Phaser from 'phaser';

const FADE_MS = 250;
const leaving = new WeakSet<Phaser.Scene>();

/** Fades the camera out and starts another scene. Repeated calls are ignored. */
export function goToScene(scene: Phaser.Scene, key: string, data?: object): void {
  if (leaving.has(scene)) return;
  leaving.add(scene);
  scene.events.once('shutdown', () => leaving.delete(scene));

  const camera = scene.cameras.main;
  camera.fadeOut(FADE_MS, 0, 0, 0);
  camera.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
}

export function fadeIn(scene: Phaser.Scene): void {
  scene.cameras.main.fadeIn(FADE_MS, 0, 0, 0);
}
