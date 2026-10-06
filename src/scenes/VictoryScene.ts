import Phaser from 'phaser';
import { MENU_BACK_KEYS, MENU_CONFIRM_KEYS } from '../config/controls';
import { GAME_WIDTH } from '../config/display';
import { SceneKeys } from '../config/sceneKeys';
import { STRINGS } from '../config/strings';
import { getFighterConfig } from '../fighters/roster';
import { onKeys } from '../input/menuKeys';
import { POSES } from '../render/placeholder/poses';
import { createPortrait } from '../render/PortraitView';
import type { MatchResult } from '../types/match';
import { createArcadeBackground } from '../ui/ArcadeBackground';
import { MenuButton } from '../ui/MenuButton';
import { COLORS, arcadeText, bodyText } from '../ui/theme';
import { fadeIn, goToScene } from './transitions';

const PORTRAIT_SIZE = { width: 220, height: 260 };
const PORTRAIT_Y = 240;

/** Shows the winner (or a draw) and returns to the main menu. */
export class VictoryScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Victory);
  }

  create(result: MatchResult): void {
    fadeIn(this);
    createArcadeBackground(this);
    const centerX = GAME_WIDTH / 2;
    const { setup, winnerIndex, reason, roundWins } = result;
    const sides = [getFighterConfig(setup.playerFighterId), getFighterConfig(setup.cpuFighterId)];
    const score = STRINGS.matchScore(roundWins[0], roundWins[1]);

    let title: string = STRINGS.draw;
    let subtitle = `${STRINGS.reasonMatchDraw}  -  ${score}`;
    if (winnerIndex !== null) {
      const winner = sides[winnerIndex];
      title = STRINGS.wins(winner?.displayName ?? '');
      const verdict = winnerIndex === 0 ? STRINGS.youWin : STRINGS.youLose;
      const why = reason === 'ko' ? STRINGS.reasonKo : STRINGS.reasonTimeout;
      subtitle = `${verdict}  -  ${why}  -  ${score}`;
      if (winner) {
        createPortrait(this, centerX, PORTRAIT_Y, winner, {
          ...PORTRAIT_SIZE,
          pose: POSES.victory,
        });
      }
    } else {
      sides.forEach((config, i) => {
        if (!config) return;
        createPortrait(this, centerX + (i === 0 ? -130 : 130), PORTRAIT_Y, config, {
          ...PORTRAIT_SIZE,
          mirrored: i === 1,
        });
      });
    }

    const titleText = this.add
      .text(centerX, 50, title, arcadeText(48, COLORS.gold, COLORS.magenta))
      .setOrigin(0.5);
    this.tweens.add({ targets: titleText, scale: 1.06, duration: 500, yoyo: true, repeat: -1 });
    this.add.text(centerX, 390, subtitle, bodyText(18, COLORS.white)).setOrigin(0.5);

    const back = () => goToScene(this, SceneKeys.Menu);
    new MenuButton(this, centerX, 460, STRINGS.backToMenu, back, {
      width: 340,
      height: 56,
      fontSize: 26,
    }).setHighlighted(true);
    onKeys(this, [...MENU_CONFIRM_KEYS, ...MENU_BACK_KEYS], back);
  }
}
