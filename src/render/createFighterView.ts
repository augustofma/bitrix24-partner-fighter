import type Phaser from 'phaser';
import type { FighterConfig } from '../types/fighter';
import { loadedFrameCount } from './assets/textureInfo';
import type { FighterView } from './FighterView';
import { PlaceholderFighterView } from './placeholder/PlaceholderFighterView';
import { SpriteFighterView } from './sprite/SpriteFighterView';
import { selectSpriteAssets } from './sprite/spriteValidation';

/**
 * Chooses how a fighter is drawn. The only place that knows the concrete view classes.
 *
 *   valid `assets.sprite` AND its texture loaded  -> SpriteFighterView
 *   anything else (no art, failed load, bad config) -> PlaceholderFighterView
 */
export function createFighterView(
  scene: Phaser.Scene,
  config: FighterConfig,
  groundY: number,
): FighterView {
  const sheetKey = config.assets.sprite?.sheet.key;
  const frameCount = sheetKey ? loadedFrameCount(scene.textures, sheetKey) : null;
  const sprite = selectSpriteAssets(config, frameCount);
  if (sprite) return new SpriteFighterView(scene, sprite, groundY);
  return new PlaceholderFighterView(scene, config, groundY);
}
