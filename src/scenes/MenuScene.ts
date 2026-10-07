import Phaser from 'phaser';
import { MENU_BACK_KEYS, MENU_CONFIRM_KEYS } from '../config/controls';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import { SceneKeys } from '../config/sceneKeys';
import { STRINGS } from '../config/strings';
import { ROSTER } from '../fighters/roster';
import { onKeys } from '../input/menuKeys';
import { TITLE_ART } from '../render/assets/titleAssets';
import { drawFigure } from '../render/placeholder/drawFigure';
import { POSES } from '../render/placeholder/poses';
import { createArcadeBackground } from '../ui/ArcadeBackground';
import { ArtButton } from '../ui/ArtButton';
import { MenuButton } from '../ui/MenuButton';
import { ModeMenu } from '../ui/ModeMenu';
import type { GameMode } from '../types/match';
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

/** Emitted by the JOGAR button (art or fallback) when activated. */
const PLAY_EVENT = 'play';

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
    const startMode = (mode: GameMode) => goToScene(this, SceneKeys.CharacterSelect, { mode });
    const hasArt = Object.values(TITLE_ART).every(({ key }) => this.textures.exists(key));
    const play = hasArt ? this.createIllustrated() : this.createProcedural();
    // Created after the screen so the mode buttons draw on top of it.
    const modes = new ModeMenu(this, BUTTON_POSITION.x, BUTTON_POSITION.y, [
      { label: STRINGS.modeStory, onSelect: () => startMode('story') },
      { label: STRINGS.modeQuickFight, onSelect: () => startMode('quick') },
    ]);
    this.bindModeMenu(modes, play);
  }

  /**
   * JOGAR opens the mode choice in its place (HISTÓRIA / LUTA RÁPIDA). Keyboard: Enter/Space
   * opens and confirms, arrows move, Esc closes it again.
   */
  private bindModeMenu(modes: ModeMenu, play: Phaser.GameObjects.Container): void {
    const open = () => {
      if (modes.isOpen) return;
      play.setVisible(false);
      modes.open();
    };
    play.on(PLAY_EVENT, open);
    onKeys(this, MENU_CONFIRM_KEYS, () => {
      if (modes.isOpen) modes.confirm();
      else {
        if (play instanceof ArtButton) play.press();
        this.time.delayedCall(KEY_PRESS_MS, open);
      }
    });
    onKeys(this, ['LEFT', 'UP'], () => modes.isOpen && modes.move(-1));
    onKeys(this, ['RIGHT', 'DOWN'], () => modes.isOpen && modes.move(1));
    onKeys(this, MENU_BACK_KEYS, () => {
      if (!modes.isOpen) return;
      modes.close();
      play.setVisible(true);
    });
  }

  /** The approved art: texts (hint, disclaimer, version) are part of the background image. */
  private createIllustrated(): Phaser.GameObjects.Container {
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

    const button: ArtButton = new ArtButton(
      this,
      BUTTON_POSITION.x,
      BUTTON_POSITION.y,
      TITLE_ART.button.key,
      () => button.emit(PLAY_EVENT),
    );
    return button;
  }

  /** Fallback when the title art is missing: procedural background, text title, button. */
  private createProcedural(): Phaser.GameObjects.Container {
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

    const button: MenuButton = new MenuButton(this, centerX, BUTTON_POSITION.y, STRINGS.play, () =>
      button.emit(PLAY_EVENT),
    ).setHighlighted(true);

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
    return button;
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
