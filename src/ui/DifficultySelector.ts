import type Phaser from 'phaser';
import { STRINGS } from '../config/strings';
import { AI_DIFFICULTIES, type AIDifficulty } from '../types/match';
import { ArcadeButton } from './select/ArcadeButton';
import { drawArcadeFrame } from './select/arcadeFrame';
import { COLORS, arcadeText, css } from './theme';

/** Horizontal distance between the centers of two neighbouring options. */
const OPTION_SPACING = 116;
/** The options sit right of center, leaving room for the label on the left. */
const OPTIONS_OFFSET_X = 60;
const OPTION_FONT_SIZE = 18;
const CHIP_WIDTH = 106;
const CHIP_HEIGHT = 32;
const LABEL_INSET = 18;
const ARROW_GAP = 30;
const ARROW_BUTTON = { width: 50, height: 42, fontSize: 22, variant: 'secondary' } as const;
const UNSELECTED_ALPHA = 0.82;

/**
 * Framed "DIFICULDADE  < FÁCIL  NORMAL  DIFÍCIL >" panel; the chosen option sits on a gold chip.
 * The < > buttons and the options themselves work by touch; keyboard handling stays in the
 * scene, which calls `step()`.
 */
export class DifficultySelector {
  private readonly options: Phaser.GameObjects.Text[] = [];
  private readonly chip: Phaser.GameObjects.Rectangle;
  private index: number;

  constructor(
    scene: Phaser.Scene,
    centerX: number,
    y: number,
    width: number,
    height: number,
    initial: AIDifficulty,
    private readonly onChange: (difficulty: AIDifficulty) => void,
  ) {
    this.index = AI_DIFFICULTIES.indexOf(initial);
    const left = centerX - width / 2;
    const panel = scene.add.graphics();
    drawArcadeFrame(panel, left, y - height / 2, width, height, {
      fill: COLORS.navy,
      fillAlpha: 0.95,
      border: COLORS.neon,
      inner: COLORS.royal,
    });
    scene.add
      .text(left + LABEL_INSET, y, STRINGS.difficultyLabel, arcadeText(14, COLORS.gold))
      .setOrigin(0, 0.5);

    const optionsCenter = centerX + OPTIONS_OFFSET_X;
    const firstX = optionsCenter - OPTION_SPACING * ((AI_DIFFICULTIES.length - 1) / 2);
    const lastX = firstX + OPTION_SPACING * (AI_DIFFICULTIES.length - 1);
    this.chip = scene.add
      .rectangle(firstX, y, CHIP_WIDTH, CHIP_HEIGHT, COLORS.gold)
      .setStrokeStyle(3, COLORS.orange);
    const arrowOffset = OPTION_SPACING / 2 + ARROW_GAP;
    new ArcadeButton(
      scene,
      firstX - arrowOffset,
      y,
      STRINGS.previousDifficulty,
      () => this.step(-1),
      ARROW_BUTTON,
    );
    new ArcadeButton(
      scene,
      lastX + arrowOffset,
      y,
      STRINGS.nextDifficulty,
      () => this.step(1),
      ARROW_BUTTON,
    );

    AI_DIFFICULTIES.forEach((difficulty, index) => {
      const option = scene.add
        .text(
          firstX + OPTION_SPACING * index,
          y,
          STRINGS.difficultyNames[difficulty],
          arcadeText(OPTION_FONT_SIZE),
        )
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
      option.setColor(css(selected ? COLORS.ink : COLORS.white));
      option.setStroke(css(selected ? COLORS.white : COLORS.ink), 3);
      option.setAlpha(selected ? 1 : UNSELECTED_ALPHA);
      if (selected) this.chip.setX(option.x);
    });
  }
}
