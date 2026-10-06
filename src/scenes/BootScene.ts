import Phaser from 'phaser';
import { SceneKeys } from '../config/sceneKeys';

/**
 * First scene. v0.1 has no external assets (all art is procedural).
 * When real art arrives, queue it in `preload()` from the fighter/stage manifests
 * (`FighterConfig.assets`, `StageConfig.backgroundAsset`) and show a loading bar here.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  create(): void {
    this.scene.start(SceneKeys.Menu);
  }
}
