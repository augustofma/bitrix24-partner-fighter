import Phaser from 'phaser';
import { SceneKeys } from '../config/sceneKeys';
import { ROSTER } from '../fighters/roster';
import {
  collectFighterAssets,
  pixelArtTextureKeys,
  type AssetRequest,
} from '../render/assets/fighterAssets';
import { collectStageAssets } from '../render/assets/stageAssets';
import { TITLE_ASSETS } from '../render/assets/titleAssets';
import { VICTORY_ASSETS } from '../render/assets/victoryAssets';
import { STAGES } from '../stages/stageRegistry';
import { validateRosterAssets } from '../render/sprite/spriteValidation';

/**
 * First scene: loads the title and victory screen art, the stages' art and every asset
 * declared by the roster (FighterConfig.assets), with no per-fighter code. Missing or broken
 * files are not fatal: fighters fall back to the placeholder renderer (see createFighterView),
 * and the title screen, victory screen and stages to their procedural look (see MenuScene,
 * VictoryScene, createStageView).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  preload(): void {
    const assets: AssetRequest[] = [
      ...TITLE_ASSETS,
      ...VICTORY_ASSETS,
      ...collectStageAssets(STAGES),
      ...collectFighterAssets(ROSTER),
    ];
    for (const asset of assets) {
      if (this.textures.exists(asset.key)) continue;
      if (asset.type === 'image') {
        this.load.image(asset.key, asset.path);
      } else {
        const { frameWidth, frameHeight } = asset;
        this.load.spritesheet(asset.key, asset.path, { frameWidth, frameHeight });
      }
    }
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.warn(`[assets] Could not load "${file.key}" (${file.src}). Using fallback art.`);
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
