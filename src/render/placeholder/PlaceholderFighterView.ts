import type Phaser from 'phaser';
import type { ReadonlyFighter } from '../../core/fighter/ReadonlyFighter';
import type { FighterConfig } from '../../types/fighter';
import { DEPTH } from '../../ui/theme';
import { FighterShadow } from '../FighterShadow';
import type { FighterView } from '../FighterView';
import { isHitFlashing } from '../viewEffects';
import { drawFigure } from './drawFigure';
import { poseFor } from './poses';

/** Geometric stand-in for a fighter, redrawn every frame from the simulation state. */
export class PlaceholderFighterView implements FighterView {
  private readonly figure: Phaser.GameObjects.Graphics;
  private readonly shadow: FighterShadow;

  constructor(
    scene: Phaser.Scene,
    private readonly config: FighterConfig,
    groundY: number,
  ) {
    this.shadow = new FighterShadow(scene, groundY);
    this.figure = scene.add.graphics().setDepth(DEPTH.fighters);
  }

  sync(fighter: ReadonlyFighter, timeMs: number): void {
    const { position, direction } = fighter;
    this.figure.clear();
    drawFigure(this.figure, poseFor(fighter, timeMs), this.config.palette, {
      flash: isHitFlashing(fighter),
    });
    this.figure.setPosition(position.x, position.y);
    this.figure.setScale(direction, 1);
    this.shadow.update(position.x, position.y);
  }

  destroy(): void {
    this.figure.destroy();
    this.shadow.destroy();
  }
}
