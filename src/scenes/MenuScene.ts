import Phaser from 'phaser';
import { MENU_CONFIRM_KEYS } from '../config/controls';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import { SceneKeys } from '../config/sceneKeys';
import { STRINGS } from '../config/strings';
import { ROSTER } from '../fighters/roster';
import { onKeys } from '../input/menuKeys';
import { TITLE_ART } from '../render/assets/titleAssets';
import { drawFigure } from '../render/placeholder/drawFigure';
import { POSES } from '../render/placeholder/poses';
import { createArcadeBackground } from '../ui/ArcadeBackground';
import { MenuButton } from '../ui/MenuButton';
import { COLORS, arcadeText, bodyText } from '../ui/theme';
import { fadeIn, goToScene } from './transitions';

/** Where the art layers sit (game px, centers), as printed by prepare_title_art.py. */
const LOGO_POSITION = { x: 492, y: 176.5 } as const;
const BUTTON_POSITION = { x: 480, y: 340 } as const;

/** Logo float: small, slow and smooth (stays inside the area cleared behind it). */
const LOGO_FLOAT_PX = 4;
const LOGO_FLOAT_MS = 2200;
const LOGO_BREATH_SCALE = 1.01;
const LOGO_BREATH_MS = 2600;

const BUTTON_HOVER_SCALE = 1.03;
const BUTTON_PRESS_SCALE = 0.97;
const BUTTON_SCALE_MS = 90;
/** Extra touch area around the visible button (game px on each side). */
const BUTTON_HIT_PADDING = 16;
const BUTTON_GLOW_ALPHA = 0.22;
const BUTTON_GLOW_MS = 520;
/** Delay before leaving after a keyboard confirm, so the press is visible. */
const KEY_PRESS_MS = 90;

const SILHOUETTE_SCALE = 1.5;

/**
 * Title screen. With the art loaded: illustrated background, a floating logo layer and a real
 * JOGAR button (mouse, touch, Enter/Space). Without it: the previous procedural look.
 */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Menu);
  }

  create(): void {
    fadeIn(this);
    const start = () => goToScene(this, SceneKeys.CharacterSelect);
    const hasArt = Object.values(TITLE_ART).every(({ key }) => this.textures.exists(key));
    if (hasArt) this.createIllustrated(start);
    else this.createProcedural(start);
  }

  /** The approved art: texts (hint, disclaimer, version) are part of the background image. */
  private createIllustrated(start: () => void): void {
    this.add
      .image(0, 0, TITLE_ART.background.key)
      .setOrigin(0)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    const logo = this.add.image(LOGO_POSITION.x, LOGO_POSITION.y, TITLE_ART.logo.key);
    this.tweens.add({
      targets: logo,
      y: { from: LOGO_POSITION.y - LOGO_FLOAT_PX, to: LOGO_POSITION.y + LOGO_FLOAT_PX },
      duration: LOGO_FLOAT_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: logo,
      scale: LOGO_BREATH_SCALE,
      duration: LOGO_BREATH_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const press = this.createArtButton(start);
    onKeys(this, MENU_CONFIRM_KEYS, () => {
      press();
      this.time.delayedCall(KEY_PRESS_MS, start);
    });
  }

  /**
   * The JOGAR button layer: hover grows it and lights a soft glow, pressing shrinks it,
   * releasing on it starts the game. Returns the "pressed" animation for keyboard confirms.
   */
  private createArtButton(start: () => void): () => void {
    const { x, y } = BUTTON_POSITION;
    const button = this.add.image(x, y, TITLE_ART.button.key);
    const glow = this.add
      .image(x, y, TITLE_ART.button.key)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);
    const glowPulse = this.tweens.add({
      targets: glow,
      alpha: BUTTON_GLOW_ALPHA,
      duration: BUTTON_GLOW_MS,
      yoyo: true,
      repeat: -1,
      paused: true,
    });
    const scaleTo = (scale: number) =>
      this.tweens.add({ targets: [button, glow], scale, duration: BUTTON_SCALE_MS });
    const setHover = (hover: boolean) => {
      scaleTo(hover ? BUTTON_HOVER_SCALE : 1);
      if (hover) glowPulse.resume();
      else {
        glowPulse.pause();
        glow.setAlpha(0);
      }
    };

    // Hit area in the image's local (unscaled) space, a bit larger than what is drawn.
    const hitArea = new Phaser.Geom.Rectangle(
      -BUTTON_HIT_PADDING,
      -BUTTON_HIT_PADDING,
      button.width + BUTTON_HIT_PADDING * 2,
      button.height + BUTTON_HIT_PADDING * 2,
    );
    button
      .setInteractive({
        hitArea,
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      })
      .on('pointerover', () => setHover(true))
      .on('pointerout', () => setHover(false))
      .on('pointerdown', () => scaleTo(BUTTON_PRESS_SCALE))
      .on('pointerup', () => {
        scaleTo(BUTTON_HOVER_SCALE);
        start();
      });
    return () => scaleTo(BUTTON_PRESS_SCALE);
  }

  /** Fallback when the title art is missing: procedural background, text title, button. */
  private createProcedural(start: () => void): void {
    createArcadeBackground(this);
    this.drawSilhouettes();

    const centerX = GAME_WIDTH / 2;
    this.add.text(centerX, 120, STRINGS.titleTop, arcadeText(44, COLORS.cyan)).setOrigin(0.5);
    const title = this.add
      .text(centerX, 190, STRINGS.titleBottom, arcadeText(72, COLORS.gold, COLORS.magenta))
      .setOrigin(0.5);
    this.tweens.add({
      targets: title,
      scale: 1.04,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    new MenuButton(this, centerX, 330, STRINGS.play, start).setHighlighted(true);
    onKeys(this, MENU_CONFIRM_KEYS, start);

    const hint = this.add
      .text(centerX, 392, STRINGS.pressStart, arcadeText(16, COLORS.white))
      .setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });

    this.add
      .text(centerX, GAME_HEIGHT - 44, STRINGS.disclaimer, bodyText(13, COLORS.white))
      .setOrigin(0.5)
      .setAlpha(0.6);
    this.add
      .text(GAME_WIDTH - 12, GAME_HEIGHT - 10, STRINGS.version, bodyText(12, COLORS.white))
      .setOrigin(1, 1)
      .setAlpha(0.5);
  }

  /** The first two roster fighters facing each other on the sides of the title. */
  private drawSilhouettes(): void {
    const [left, right] = ROSTER;
    const sides = [
      { config: left, x: 110, facing: 1 },
      { config: right, x: GAME_WIDTH - 110, facing: -1 },
    ];
    for (const { config, x, facing } of sides) {
      if (!config) continue;
      const g = this.add
        .graphics()
        .setPosition(x, GAME_HEIGHT - 70)
        .setAlpha(0.85);
      g.setScale(facing * SILHOUETTE_SCALE, SILHOUETTE_SCALE);
      drawFigure(g, POSES.block, config.palette);
    }
  }
}
