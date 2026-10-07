import Phaser from 'phaser';
import { SceneKeys } from '../config/sceneKeys';
import { BACKGROUND_AUDIO_ASSETS } from '../render/assets/audioAssets';
import { queueAsset } from '../render/assets/queueAsset';

/**
 * Invisible scene that downloads the rest of the music after the title screen is up, so the
 * first screen is not held back by audio. The MusicManager starts a waiting track as soon as
 * its file lands in the cache. A missing file only means that track stays silent.
 */
export class AudioLoaderScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.AudioLoader, active: false });
  }

  create(): void {
    for (const asset of BACKGROUND_AUDIO_ASSETS) queueAsset(this, asset);
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.warn(`[audio] Could not load "${file.key}". That music stays silent.`);
    });
    this.load.once(Phaser.Loader.Events.COMPLETE, () => this.scene.stop());
    this.load.start();
  }
}
