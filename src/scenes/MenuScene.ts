import Phaser from 'phaser';
import { MENU_CONFIRM_KEYS } from '../config/controls';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import { SceneKeys } from '../config/sceneKeys';
import { STRINGS } from '../config/strings';
import { ROSTER } from '../fighters/roster';
import { onKeys } from '../input/menuKeys';
import { drawFigure } from '../render/placeholder/drawFigure';
import { POSES } from '../render/placeholder/poses';
import { createArcadeBackground } from '../ui/ArcadeBackground';
import { MenuButton } from '../ui/MenuButton';
import { COLORS, arcadeText, bodyText } from '../ui/theme';
import { fadeIn, goToScene } from './transitions';

const SILHOUETTE_SCALE = 1.5;

/** Title screen: BITRIX24 / PARTNER FIGHTER / JOGAR. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Menu);
  }

  create(): void {
    fadeIn(this);
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

    const start = () => goToScene(this, SceneKeys.CharacterSelect);
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
