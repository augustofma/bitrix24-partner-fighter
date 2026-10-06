import type Phaser from 'phaser';
import type { ReadonlyFighter } from '../../core/fighter/ReadonlyFighter';
import type { FighterConfig } from '../../types/fighter';
import { DEPTH } from '../../ui/theme';
import type { FighterView } from '../FighterView';
import { drawFigure } from './drawFigure';
import { poseFor } from './poses';

/** Frames of white flash at the start of hitstun. */
const HIT_FLASH_FRAMES = 4;
const SHADOW_WIDTH = 90;
const SHADOW_HEIGHT = 16;
/** Shadow shrinks to this scale at this height (px) above the ground. */
const SHADOW_MIN_SCALE = 0.5;
const SHADOW_FADE_HEIGHT = 200;

/** Geometric stand-in for a fighter, redrawn every frame from the simulation state. */
export class PlaceholderFighterView implements FighterView {
  private readonly figure: Phaser.GameObjects.Graphics;
  private readonly shadow: Phaser.GameObjects.Ellipse;

  constructor(
    scene: Phaser.Scene,
    private readonly config: FighterConfig,
    private readonly groundY: number,
  ) {
    this.shadow = scene.add
      .ellipse(0, groundY, SHADOW_WIDTH, SHADOW_HEIGHT, 0x000000, 0.35)
      .setDepth(DEPTH.shadows);
    this.figure = scene.add.graphics().setDepth(DEPTH.fighters);
  }

  sync(fighter: ReadonlyFighter, timeMs: number): void {
    const { position, direction } = fighter;
    const flash = fighter.state === 'hurt' && fighter.stateFrame < HIT_FLASH_FRAMES;

    this.figure.clear();
    drawFigure(this.figure, poseFor(fighter, timeMs), this.config.palette, { flash });
    this.figure.setPosition(position.x, position.y);
    this.figure.setScale(direction, 1);

    const height = this.groundY - position.y;
    const scale = Math.max(SHADOW_MIN_SCALE, 1 - height / SHADOW_FADE_HEIGHT);
    this.shadow.setPosition(position.x, this.groundY).setScale(scale);
  }

  destroy(): void {
    this.figure.destroy();
    this.shadow.destroy();
  }
}
