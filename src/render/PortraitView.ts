import type Phaser from 'phaser';
import type { FighterConfig } from '../types/fighter';
import { COLORS, arcadeText } from '../ui/theme';
import { drawFigure } from './placeholder/drawFigure';
import { POSES, type Pose } from './placeholder/poses';

export interface PortraitOptions {
  width: number;
  height: number;
  pose?: Pose;
  /** Face left (used for the right-hand side of the VS screen). */
  mirrored?: boolean;
  showName?: boolean;
}

/** Height of the placeholder figure (feet to top of head) used to fit it in the card. */
const FIGURE_HEIGHT = 215;
const NAME_BAR_HEIGHT = 34;

/**
 * Character card used by select / VS / victory screens.
 * Future: when `config.assets.portrait` exists, show that image instead of the figure.
 */
export function createPortrait(
  scene: Phaser.Scene,
  x: number,
  y: number,
  config: FighterConfig,
  options: PortraitOptions,
): Phaser.GameObjects.Container {
  const { width, height, pose = POSES.idle, mirrored = false, showName = true } = options;
  const container = scene.add.container(x, y);

  const background = scene.add
    .rectangle(0, 0, width, height, COLORS.panel, 1)
    .setStrokeStyle(4, config.palette.body);
  const glow = scene.add.ellipse(
    0,
    height * 0.1,
    width * 0.9,
    height * 0.7,
    config.palette.body,
    0.25,
  );

  const figureArea = height - (showName ? NAME_BAR_HEIGHT : 0) - 16;
  const scale = Math.min(1.6, figureArea / FIGURE_HEIGHT);
  const feetY = -height / 2 + 8 + figureArea;
  const figure = scene.add
    .graphics()
    .setPosition(0, feetY)
    .setScale(mirrored ? -scale : scale, scale);
  drawFigure(figure, pose, config.palette);

  container.add([background, glow, figure]);

  if (showName) {
    const bar = scene.add.rectangle(
      0,
      height / 2 - NAME_BAR_HEIGHT / 2,
      width,
      NAME_BAR_HEIGHT,
      COLORS.ink,
      0.85,
    );
    const name = scene.add
      .text(0, height / 2 - NAME_BAR_HEIGHT / 2, config.displayName, arcadeText(18, COLORS.white))
      .setOrigin(0.5);
    container.add([bar, name]);
  }
  return container;
}
