import Phaser from 'phaser';
import { SceneKeys } from '../config/sceneKeys';
import { ROSTER } from '../fighters/roster';
import { bootAssets } from '../render/assets/sceneAssets';
import { validateRosterAssets } from '../render/sprite/spriteValidation';
import { LoadingBar } from '../ui/LoadingBar';
import { queueMissing, watchLoad } from './assetLoading';

/**
 * First scene: loads what the menus need (fonts, title and victory art, portraits, the title
 * music and the sounds), with no per-fighter code. The heavy art (sprite sheets, stage art,
 * endings) is loaded later, right before the screen that uses it (see sceneAssets.ts). Missing
 * or broken files are not fatal: fighters fall back to the placeholder renderer (see
 * createFighterView), and the title screen, victory screen and stages to their procedural look
 * (see MenuScene, VictoryScene, createStageView).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  preload(): void {
    new LoadingBar(this);
    queueMissing(this, bootAssets(ROSTER));
    watchLoad(this);
  }

  create(): void {
    if (import.meta.env.DEV) reportAssetIssues();
    // The rest of the music loads in the background while the player is on the menus.
    this.scene.launch(SceneKeys.AudioLoader);
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
