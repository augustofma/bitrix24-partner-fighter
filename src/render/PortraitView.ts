import type Phaser from 'phaser';
import type { FighterConfig } from '../types/fighter';
import { COLORS, arcadeText } from '../ui/theme';
import { portraitTextureKey } from './assets/fighterAssets';
import { drawFigure } from './placeholder/drawFigure';
import { POSES, type Pose } from './placeholder/poses';

export interface PortraitOptions {
  width: number;
  height: number;
  /** Pose of the geometric fallback (ignored when a portrait image exists). */
  pose?: Pose;
  /** Face left (used for the right-hand side of the VS screen). */
  mirrored?: boolean;
  showName?: boolean;
}

/** Height of the placeholder figure (feet to top of head) used to fit it in the card. */
const FIGURE_HEIGHT = 215;
const MAX_FIGURE_SCALE = 1.6;
const NAME_BAR_HEIGHT = 34;
const CARD_PADDING = 8;

interface ArtArea {
  width: number;
  height: number;
  /** Y of the area's bottom edge, relative to the card center. */
  bottom: number;
}

/**
 * Character card used by select / VS / victory screens.
 * Shows `config.assets.portrait` when it loaded, otherwise the geometric figure.
 */
export function createPortrait(
  scene: Phaser.Scene,
  x: number,
  y: number,
  config: FighterConfig,
  options: PortraitOptions,
): Phaser.GameObjects.Container {
  const { width, height, mirrored = false, showName = true } = options;
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
  container.add([background, glow]);

  const area: ArtArea = {
    width: width - CARD_PADDING * 2,
    height: height - (showName ? NAME_BAR_HEIGHT : 0) - CARD_PADDING * 2,
    bottom: height / 2 - (showName ? NAME_BAR_HEIGHT : 0) - CARD_PADDING,
  };
  const portraitKey = config.assets.portrait ? portraitTextureKey(config.assets.portrait) : null;
  if (portraitKey && scene.textures.exists(portraitKey)) {
    container.add(createPortraitImage(scene, portraitKey, area, mirrored));
  } else {
    container.add(createPortraitFigure(scene, config, area, options.pose ?? POSES.idle, mirrored));
  }

  if (showName) {
    const barY = height / 2 - NAME_BAR_HEIGHT / 2;
    const bar = scene.add.rectangle(0, barY, width, NAME_BAR_HEIGHT, COLORS.ink, 0.85);
    const name = scene.add
      .text(0, barY, config.displayName, arcadeText(18, COLORS.white))
      .setOrigin(0.5);
    container.add([bar, name]);
  }
  return container;
}

/** Real portrait: scaled to fit ("contain") and standing on the bottom of the art area. */
function createPortraitImage(
  scene: Phaser.Scene,
  key: string,
  area: ArtArea,
  mirrored: boolean,
): Phaser.GameObjects.Image {
  const image = scene.add.image(0, area.bottom, key).setOrigin(0.5, 1).setFlipX(mirrored);
  const scale = Math.min(area.width / image.width, area.height / image.height);
  return image.setScale(scale);
}

function createPortraitFigure(
  scene: Phaser.Scene,
  config: FighterConfig,
  area: ArtArea,
  pose: Pose,
  mirrored: boolean,
): Phaser.GameObjects.Graphics {
  const scale = Math.min(MAX_FIGURE_SCALE, area.height / FIGURE_HEIGHT);
  const figure = scene.add
    .graphics()
    .setPosition(0, area.bottom)
    .setScale(mirrored ? -scale : scale, scale);
  drawFigure(figure, pose, config.palette);
  return figure;
}
