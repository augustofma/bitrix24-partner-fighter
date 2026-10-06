import type Phaser from 'phaser';
import { STRINGS } from '../config/strings';
import { AI_DIFFICULTIES, type AIDifficulty } from '../types/match';
import { MenuButton } from './MenuButton';
import { COLORS, arcadeText, bodyText, css } from './theme';

/** Horizontal distance between the centers of two neighbouring options. */
const OPTION_SPACING = 124;
const OPTION_FONT_SIZE = 20;
const LABEL_FONT_SIZE = 16;
/** Gap between the label's right edge and the "<" button, and between buttons and options. */
const LABEL_GAP = 18;
const ARROW_BUTTON_STYLE = { width: 48, height: 40, fontSize: 22 };
const UNSELECTED_ALPHA = 0.45;

/**
 * "DIFICULDADE  < FÁCIL | NORMAL | DIFÍCIL >": shows every option with the chosen one
 * highlighted. The < > buttons and the options themselves work by touch; keyboard handling
 * stays in the scene, which calls `step()`.
 */
export class DifficultySelector {
  private readonly options: Phaser.GameObjects.Text[] = [];
  private index: number;

  constructor(
    scene: Phaser.Scene,
    centerX: number,
    y: number,
    initial: AIDifficulty,
    private readonly onChange: (difficulty: AIDifficulty) => void,
  ) {
    this.index = AI_DIFFICULTIES.indexOf(initial);
    const firstX = centerX - OPTION_SPACING * ((AI_DIFFICULTIES.length - 1) / 2);
    const lastX = firstX + OPTION_SPACING * (AI_DIFFICULTIES.length - 1);
    const leftButtonX = firstX - OPTION_SPACING / 2 - LABEL_GAP;
    const rightButtonX = lastX + OPTION_SPACING / 2 + LABEL_GAP;

    scene.add
      .text(
        leftButtonX - ARROW_BUTTON_STYLE.width / 2 - LABEL_GAP,
        y,
        STRINGS.difficultyLabel,
        bodyText(LABEL_FONT_SIZE, COLORS.cyan),
      )
      .setOrigin(1, 0.5);
    new MenuButton(
      scene,
      leftButtonX,
      y,
      STRINGS.previousDifficulty,
      () => this.step(-1),
      ARROW_BUTTON_STYLE,
    );
    new MenuButton(
      scene,
      rightButtonX,
      y,
      STRINGS.nextDifficulty,
      () => this.step(1),
      ARROW_BUTTON_STYLE,
    );

    AI_DIFFICULTIES.forEach((difficulty, index) => {
      const x = firstX + OPTION_SPACING * index;
      if (index > 0) {
        scene.add
          .text(x - OPTION_SPACING / 2, y, STRINGS.difficultySeparator, bodyText(18))
          .setOrigin(0.5)
          .setAlpha(UNSELECTED_ALPHA);
      }
      const option = scene.add
        .text(x, y, STRINGS.difficultyNames[difficulty], arcadeText(OPTION_FONT_SIZE))
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => this.select(index));
      this.options.push(option);
    });
    this.refresh();
  }

  get value(): AIDifficulty {
    return AI_DIFFICULTIES[this.index] ?? AI_DIFFICULTIES[0];
  }

  /** Moves toward harder (+1) or easier (-1); stops at the ends instead of wrapping. */
  step(delta: number): void {
    this.select(Math.min(Math.max(this.index + delta, 0), AI_DIFFICULTIES.length - 1));
  }

  private select(index: number): void {
    if (index === this.index) return;
    this.index = index;
    this.refresh();
    this.onChange(this.value);
  }

  private refresh(): void {
    this.options.forEach((option, index) => {
      const selected = index === this.index;
      option.setColor(css(selected ? COLORS.gold : COLORS.white));
      option.setAlpha(selected ? 1 : UNSELECTED_ALPHA);
    });
  }
}
