import Phaser from 'phaser';
import { SceneKeys } from '../config/sceneKeys';
import { ROSTER } from '../fighters/roster';
import { collectFighterAssets, pixelArtTextureKeys } from '../render/assets/fighterAssets';
import { validateRosterAssets } from '../render/sprite/spriteValidation';

/**
 * First scene: loads every asset declared by the roster (FighterConfig.assets), with no
 * per-fighter code. Missing or broken files are not fatal: those fighters simply fall back to
 * the placeholder renderer (see createFighterView).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  preload(): void {
    for (const asset of collectFighterAssets(ROSTER)) {
      if (this.textures.exists(asset.key)) continue;
      if (asset.type === 'image') {
        this.load.image(asset.key, asset.path);
      } else {
        const { frameWidth, frameHeight } = asset;
        this.load.spritesheet(asset.key, asset.path, { frameWidth, frameHeight });
      }
    }
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.warn(`[assets] Could not load "${file.key}" (${file.src}). Using placeholder art.`);
    });
  }

  create(): void {
    for (const key of pixelArtTextureKeys(ROSTER)) {
      if (this.textures.exists(key)) {
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }
    if (import.meta.env.DEV) reportAssetIssues();
    this.scene.start(SceneKeys.Menu);
  }
}

/** Development aid: surfaces art configuration mistakes in the console. */
function reportAssetIssues(): void {
  for (const issue of validateRosterAssets(ROSTER)) {
    const message = `[assets] ${issue.fighterId}: ${issue.message}`;
    if (issue.level === 'error') console.error(`${message} Falling back to placeholder art.`);
    else console.warn(message);
  }
}
