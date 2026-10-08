import Phaser from 'phaser';
import { ROSTER } from '../fighters/roster';
import { pixelArtTextureKeys, type AssetRequest } from '../render/assets/fighterAssets';
import { queueAsset } from '../render/assets/queueAsset';

/**
 * Queues the assets that are not cached yet on the scene's loader. Returns how many files were
 * queued (0: everything is already there).
 */
export function queueMissing(scene: Phaser.Scene, assets: readonly AssetRequest[]): number {
  const before = scene.load.list.size;
  for (const asset of assets) queueAsset(scene, asset);
  return scene.load.list.size - before;
}

/**
 * Downloads assets while the scene keeps running (e.g. during the VS screen). `onReady` runs
 * once they are all in (right away when nothing was missing); `onProgress` gets 0..1. Missing
 * or broken files are not fatal: the fighter, stage or ending falls back to its procedural look.
 */
export function loadInBackground(
  scene: Phaser.Scene,
  assets: readonly AssetRequest[],
  onReady: () => void,
  onProgress?: (progress: number) => void,
): void {
  if (queueMissing(scene, assets) === 0) {
    onReady();
    return;
  }
  watchLoad(scene);
  if (onProgress) scene.load.on(Phaser.Loader.Events.PROGRESS, onProgress);
  scene.load.once(Phaser.Loader.Events.COMPLETE, onReady);
  scene.load.start();
}

/**
 * Warns about broken files and, once loaded, gives pixel-art fighters nearest-neighbour
 * filtering. Call once per load (BootScene and scene preloads, or via loadInBackground).
 */
export function watchLoad(scene: Phaser.Scene): void {
  scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
    console.warn(`[assets] Could not load "${file.key}" (${file.src}). Using fallback art.`);
  });
  scene.load.once(Phaser.Loader.Events.COMPLETE, () => applyPixelArtFilter(scene));
}

/** Nearest-neighbour filtering for the loaded textures of pixel-art fighters. */
export function applyPixelArtFilter(scene: Phaser.Scene): void {
  for (const key of pixelArtTextureKeys(ROSTER)) {
    if (scene.textures.exists(key)) {
      scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }
}
