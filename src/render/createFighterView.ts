import type Phaser from 'phaser';
import type { FighterConfig } from '../types/fighter';
import type { FighterView } from './FighterView';
import { PlaceholderFighterView } from './placeholder/PlaceholderFighterView';

/** Chooses how a fighter is drawn. The only place that knows the concrete view classes. */
export function createFighterView(
  scene: Phaser.Scene,
  config: FighterConfig,
  groundY: number,
): FighterView {
  // Future: if (config.assets.animations) return new SpriteFighterView(scene, config, groundY);
  return new PlaceholderFighterView(scene, config, groundY);
}
