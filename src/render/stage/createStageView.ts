import type Phaser from 'phaser';
import type { StageConfig } from '../../types/stage';
import { stageArtKeys } from '../assets/stageAssets';
import { IllustratedStageView } from './IllustratedStageView';
import type { StageBackdrop } from './StageBackdrop';
import { StageView } from './StageView';

/** The stage's art when every texture loaded; otherwise the procedural stage (never breaks). */
export function createStageView(scene: Phaser.Scene, stage: StageConfig): StageBackdrop {
  const loaded = stageArtKeys(stage).every((key) => scene.textures.exists(key));
  if (stage.art && loaded) return new IllustratedStageView(scene, stage, stage.art);
  return new StageView(scene, stage);
}
