import type Phaser from 'phaser';
import type { ReadonlyFighter } from '../../core/fighter/ReadonlyFighter';
import type { FighterSpriteAssets } from '../../types/fighter';
import { DEPTH } from '../../ui/theme';
import { FighterShadow } from '../FighterShadow';
import type { FighterView } from '../FighterView';
import { HIT_FLASH_COLOR, isHitFlashing } from '../viewEffects';
import { spriteFrameFor } from './animationHelpers';

/** The fighter's logical position is the center of the feet: bottom-center of the frame. */
const FEET_ORIGIN_X = 0.5;
const FEET_ORIGIN_Y = 1;
const DEFAULT_SCALE = 1;
const DEFAULT_OFFSET = 0;

/**
 * Draws a fighter from a spritesheet. Works for any FighterConfig with valid `assets.sprite`.
 * Read-only towards the simulation: the frame shown is derived from fighter.state/stateFrame
 * (see animationHelpers), position from fighter.position, facing from fighter.direction.
 * Art is authored facing right and mirrored with flipX.
 */
export class SpriteFighterView implements FighterView {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: FighterShadow;
  private readonly offsetX: number;
  private readonly offsetY: number;
  private shownFrame = -1;

  constructor(
    scene: Phaser.Scene,
    private readonly assets: FighterSpriteAssets,
    groundY: number,
  ) {
    const { visual } = assets;
    this.offsetX = visual?.offsetX ?? DEFAULT_OFFSET;
    this.offsetY = visual?.offsetY ?? DEFAULT_OFFSET;
    this.shadow = new FighterShadow(scene, groundY);
    this.sprite = scene.add
      .sprite(0, groundY, assets.sheet.key, assets.animations.idle.frames[0])
      .setOrigin(FEET_ORIGIN_X, FEET_ORIGIN_Y)
      .setScale(visual?.scale ?? DEFAULT_SCALE)
      .setDepth(DEPTH.fighters);
  }

  sync(fighter: ReadonlyFighter): void {
    const { position, direction } = fighter;

    const frame = spriteFrameFor(this.assets.animations, fighter);
    if (frame !== this.shownFrame) {
      this.sprite.setFrame(frame);
      this.shownFrame = frame;
    }

    this.sprite.setPosition(position.x + this.offsetX * direction, position.y + this.offsetY);
    this.sprite.setFlipX(direction === -1);

    if (isHitFlashing(fighter)) this.sprite.setTintFill(HIT_FLASH_COLOR);
    else this.sprite.clearTint();

    this.shadow.update(position.x, position.y);
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
