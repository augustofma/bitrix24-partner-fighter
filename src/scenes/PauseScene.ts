import Phaser from 'phaser';
import { playSfx } from '../audio/gameAudio';
import { MENU_CONFIRM_KEYS, PAUSE_KEYS } from '../config/controls';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import { SceneKeys } from '../config/sceneKeys';
import { STRINGS } from '../config/strings';
import { onKeys } from '../input/menuKeys';
import type { MatchSetup } from '../types/match';
import { MenuButton } from '../ui/MenuButton';
import { COLORS, arcadeText, bodyText } from '../ui/theme';
import { setStoryProgress } from './story/storyFlow';
import { goToScene } from './transitions';

const BUTTON_Y = 250;
const BUTTON_GAP = 72;

/**
 * Pause screen, drawn over the paused FightScene (launched by it). The fight is frozen as it is
 * (simulation, timers and tweens stop with the scene). CONTINUAR resumes it, REINICIAR LUTA
 * starts the same match again, SAIR PARA O MENU leaves it (in story mode the campaign is
 * dropped, as with the story's own quit). Keyboard, mouse and touch.
 */
export class PauseScene extends Phaser.Scene {
  private buttons: MenuButton[] = [];
  private selected = 0;

  constructor() {
    super(SceneKeys.Pause);
  }

  create(setup: MatchSetup): void {
    this.selected = 0;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.ink, 0.72).setOrigin(0);
    this.add
      .text(GAME_WIDTH / 2, 150, STRINGS.pauseTitle, arcadeText(64, COLORS.gold, COLORS.magenta))
      .setOrigin(0.5);

    const actions: [string, () => void][] = [
      [STRINGS.pauseResume, () => this.resumeFight()],
      [STRINGS.pauseRestart, () => this.restartFight(setup)],
      [STRINGS.pauseQuit, () => this.quitFight(setup)],
    ];
    this.buttons = actions.map(([label, action], i) => {
      const button = new MenuButton(
        this,
        GAME_WIDTH / 2,
        BUTTON_Y + i * BUTTON_GAP,
        label,
        () => {
          playSfx(this, 'menu-confirm');
          action();
        },
        { width: 340, height: 56, fontSize: 24 },
      );
      button.on('pointerover', () => this.select(i));
      return button;
    });
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 40, STRINGS.pauseHint, bodyText(14, COLORS.white))
      .setOrigin(0.5)
      .setAlpha(0.7);
    this.select(0);

    onKeys(this, ['UP'], () => this.select(this.selected - 1, true));
    onKeys(this, ['DOWN'], () => this.select(this.selected + 1, true));
    onKeys(this, MENU_CONFIRM_KEYS, () => {
      playSfx(this, 'menu-confirm');
      actions[this.selected]?.[1]();
    });
    onKeys(this, PAUSE_KEYS, () => this.resumeFight());
  }

  private select(index: number, withSound = false): void {
    const count = this.buttons.length;
    const next = (index + count) % count;
    if (withSound && next !== this.selected) playSfx(this, 'menu-move');
    this.selected = next;
    this.buttons.forEach((button, i) => button.setHighlighted(i === next));
  }

  private resumeFight(): void {
    this.scene.resume(SceneKeys.Fight);
    this.scene.stop();
  }

  private restartFight(setup: MatchSetup): void {
    this.scene.stop();
    this.scene.get(SceneKeys.Fight).scene.restart(setup);
  }

  private quitFight(setup: MatchSetup): void {
    if (setup.mode === 'story') setStoryProgress(this, null);
    this.scene.stop(SceneKeys.Fight);
    goToScene(this, SceneKeys.Menu);
  }
}
