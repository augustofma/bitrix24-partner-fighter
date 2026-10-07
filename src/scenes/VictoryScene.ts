import Phaser from 'phaser';
import { MENU_BACK_KEYS, MENU_CONFIRM_KEYS } from '../config/controls';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import { SceneKeys } from '../config/sceneKeys';
import { STRINGS } from '../config/strings';
import { getFighterConfig } from '../fighters/roster';
import { onKeys } from '../input/menuKeys';
import { VICTORY_ART } from '../render/assets/victoryAssets';
import { POSES } from '../render/placeholder/poses';
import { createPortrait } from '../render/PortraitView';
import type { MatchResult } from '../types/match';
import { createArcadeBackground } from '../ui/ArcadeBackground';
import { ArtButton } from '../ui/ArtButton';
import { MenuButton } from '../ui/MenuButton';
import { COLORS, arcadeText, bodyText } from '../ui/theme';
import { VictoryCard } from '../ui/victory/VictoryCard';
import { victoryContent, type VictoryContent } from '../ui/victory/victoryContent';
import { createVictoryEffects } from '../ui/victory/VictoryEffects';
import { VICTORY_LAYOUT } from '../ui/victory/victoryLayout';
import { createResultLine, createVictoryTitle } from '../ui/victory/victoryText';
import { fadeIn, goToScene } from './transitions';

/** Entrance timeline (ms): title, card, result line, then the button (~1.1 s in total). */
const ENTRANCE = {
  title: { delay: 80, duration: 420 },
  card: { delay: 300, duration: 380 },
  result: { delay: 600, duration: 280 },
  button: { delay: 820, duration: 280 },
} as const;
const TITLE_START_SCALE = 0.4;
const TITLE_FLOAT_PX = 3;
const TITLE_FLOAT_MS = 1900;
const CARD_RISE_PX = 24;
const RESULT_SLIDE_PX = 36;
const BUTTON_START_SCALE = 0.85;
/** Delay before leaving after a keyboard confirm, so the press is visible. */
const KEY_PRESS_MS = 90;

const FALLBACK_PORTRAIT_SIZE = { width: 220, height: 260 };
const FALLBACK_PORTRAIT_Y = 240;

/**
 * Match result. With the art loaded: the illustrated arena, an animated title with the
 * winner's name, the winner's card with the real portrait, the result line and a real
 * VOLTAR AO MENU button, entering in sequence. Without it: the previous procedural screen.
 * Everything written comes from the real MatchResult (see victoryContent).
 */
export class VictoryScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Victory);
  }

  create(result: MatchResult): void {
    fadeIn(this);
    const { setup } = result;
    const sides = [
      getFighterConfig(setup.playerFighterId),
      getFighterConfig(setup.cpuFighterId),
    ] as const;
    const content = victoryContent(result, sides);
    const back = () => goToScene(this, SceneKeys.Menu);
    const hasArt = Object.values(VICTORY_ART).every(({ key }) => this.textures.exists(key));
    if (hasArt) this.createIllustrated(content, back);
    else this.createProcedural(content, back);
  }

  private createIllustrated(content: VictoryContent, back: () => void): void {
    this.add
      .image(0, 0, VICTORY_ART.background.key)
      .setOrigin(0)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    createVictoryEffects(this);

    const card = new VictoryCard(
      this,
      VICTORY_ART.cardFrame.key,
      content.featured,
      content.nameLabel,
    );
    const title = createVictoryTitle(this, content.title);
    const result = createResultLine(this, VICTORY_ART.resultPanel.key, content.result);
    const { button: at } = VICTORY_LAYOUT;
    const button = new ArtButton(this, at.x, at.y, VICTORY_ART.button.key, back);

    this.playEntrance(title, card, result, button);
    onKeys(this, [...MENU_CONFIRM_KEYS, ...MENU_BACK_KEYS], () => {
      button.press();
      this.time.delayedCall(KEY_PRESS_MS, back);
    });
  }

  /** Background first, then title (pop + bounce), card (fade + rise), result, button. */
  private playEntrance(
    title: Phaser.GameObjects.Container,
    card: VictoryCard,
    result: Phaser.GameObjects.Container,
    button: ArtButton,
  ): void {
    title.setScale(TITLE_START_SCALE).setAlpha(0);
    this.tweens.add({
      targets: title,
      scale: 1,
      alpha: 1,
      ...ENTRANCE.title,
      ease: 'Back.easeOut',
      onComplete: () =>
        this.tweens.add({
          targets: title,
          y: title.y - TITLE_FLOAT_PX,
          duration: TITLE_FLOAT_MS,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        }),
    });

    const cardY = card.container.y;
    card.container.setAlpha(0).setY(cardY + CARD_RISE_PX);
    this.tweens.add({
      targets: card.container,
      alpha: 1,
      y: cardY,
      ...ENTRANCE.card,
      ease: 'Cubic.easeOut',
      onComplete: () => card.startFloat(),
    });

    const resultX = result.x;
    result.setAlpha(0).setX(resultX - RESULT_SLIDE_PX);
    this.tweens.add({
      targets: result,
      alpha: 1,
      x: resultX,
      ...ENTRANCE.result,
      ease: 'Cubic.easeOut',
    });

    button.setAlpha(0).setScale(BUTTON_START_SCALE);
    this.tweens.add({
      targets: button,
      alpha: 1,
      scale: 1,
      ...ENTRANCE.button,
      ease: 'Back.easeOut',
    });
  }

  /** Fallback when the art is missing: procedural background, portraits, text and button. */
  private createProcedural(content: VictoryContent, back: () => void): void {
    createArcadeBackground(this);
    const centerX = GAME_WIDTH / 2;
    const { featured } = content;
    featured.forEach((config, i) => {
      const offset = featured.length > 1 ? (i === 0 ? -130 : 130) : 0;
      createPortrait(this, centerX + offset, FALLBACK_PORTRAIT_Y, config, {
        ...FALLBACK_PORTRAIT_SIZE,
        pose: POSES.victory,
        mirrored: featured.length > 1 && i === 1,
      });
    });

    const titleText = this.add
      .text(centerX, 50, content.title, arcadeText(48, COLORS.gold, COLORS.magenta))
      .setOrigin(0.5);
    this.tweens.add({ targets: titleText, scale: 1.06, duration: 500, yoyo: true, repeat: -1 });
    const subtitle = content.result.map((segment) => segment.text).join('  -  ');
    this.add.text(centerX, 390, subtitle, bodyText(18, COLORS.white)).setOrigin(0.5);

    new MenuButton(this, centerX, 460, STRINGS.backToMenu, back, {
      width: 340,
      height: 56,
      fontSize: 26,
    }).setHighlighted(true);
    onKeys(this, [...MENU_CONFIRM_KEYS, ...MENU_BACK_KEYS], back);
  }
}
