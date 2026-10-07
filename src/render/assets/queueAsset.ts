import type Phaser from 'phaser';
import type { AssetRequest } from './fighterAssets';

/** Turns one pure AssetRequest into the matching Phaser loader call (skips what is cached). */
export function queueAsset(scene: Phaser.Scene, asset: AssetRequest): void {
  const load = scene.load;
  switch (asset.type) {
    case 'image':
      if (!scene.textures.exists(asset.key)) load.image(asset.key, asset.path);
      return;
    case 'spritesheet': {
      if (scene.textures.exists(asset.key)) return;
      const { frameWidth, frameHeight } = asset;
      load.spritesheet(asset.key, asset.path, { frameWidth, frameHeight });
      return;
    }
    case 'font':
      load.font(asset.key, asset.path);
      return;
    case 'audio':
      if (!scene.cache.audio.exists(asset.key))
        load.audio(asset.key, [asset.path, ...asset.altPaths]);
      return;
  }
}
