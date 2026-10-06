import Phaser from 'phaser';
import { MENU_BACK_KEYS, MENU_CONFIRM_KEYS } from '../config/controls';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import { DEFAULT_AI_DIFFICULTY } from '../config/match';
import { RegistryKeys } from '../config/registryKeys';
import { SceneKeys } from '../config/sceneKeys';
import { STRINGS } from '../config/strings';
import { ROSTER, pickCpuOpponent } from '../fighters/roster';
import { onKeys } from '../input/menuKeys';
import { createPortrait } from '../render/PortraitView';
import { DEFAULT_STAGE_ID } from '../stages/stageRegistry';
import { isAIDifficulty, type AIDifficulty, type MatchSetup } from '../types/match';
import { createArcadeBackground } from '../ui/ArcadeBackground';
import { DifficultySelector } from '../ui/DifficultySelector';
import { MenuButton } from '../ui/MenuButton';
import { COLORS, arcadeText, bodyText } from '../ui/theme';
import { fadeIn, goToScene } from './transitions';

const CARD_WIDTH = 160;
const CARD_HEIGHT = 210;
const CARD_GAP = 36;
const CARDS_Y = 232;
const CARDS_PER_PAGE = 4;
const PAGE_BUTTON_INSET = 30;
const PAGE_BUTTON_STYLE = { width: 44, height: 60, fontSize: 24 };
const CURSOR_PADDING = 10;
const INFO_NAME_Y = 358;
const INFO_DESCRIPTION_Y = 388;
const DIFFICULTY_Y = 434;
const CONFIRM_Y = 486;
const CONFIRM_STYLE = { width: 220, height: 46, fontSize: 24 };

/**
 * Character grid built from ROSTER. Works for any number of fighters; non-selectable
 * ones are shown locked (CPU only in v0.1).
 */
export class CharacterSelectScene extends Phaser.Scene {
  private selectedIndex = 0;
  private cards: Phaser.GameObjects.Container[] = [];
  private cursor!: Phaser.GameObjects.Rectangle;
  private infoName!: Phaser.GameObjects.Text;
  private infoDescription!: Phaser.GameObjects.Text;
  private difficulty!: DifficultySelector;

  constructor() {
    super(SceneKeys.CharacterSelect);
  }

  create(): void {
    fadeIn(this);
    createArcadeBackground(this);
    const centerX = GAME_WIDTH / 2;
    this.add.text(centerX, 52, STRINGS.selectTitle, arcadeText(36, COLORS.gold)).setOrigin(0.5);

    this.selectedIndex = ROSTER.findIndex((fighter) => fighter.selectable);
    if (this.selectedIndex < 0) throw new Error('The roster has no selectable fighter.');

    this.cursor = this.add
      .rectangle(0, CARDS_Y, CARD_WIDTH + CURSOR_PADDING, CARD_HEIGHT + CURSOR_PADDING)
      .setStrokeStyle(5, COLORS.gold);
    this.tweens.add({ targets: this.cursor, alpha: 0.4, duration: 400, yoyo: true, repeat: -1 });
    this.cards = [];
    this.createCards();
    if (ROSTER.length > CARDS_PER_PAGE) {
      new MenuButton(
        this,
        PAGE_BUTTON_INSET,
        CARDS_Y,
        STRINGS.previousFighter,
        () => this.moveSelection(-1),
        PAGE_BUTTON_STYLE,
      );
      new MenuButton(
        this,
        GAME_WIDTH - PAGE_BUTTON_INSET,
        CARDS_Y,
        STRINGS.nextFighter,
        () => this.moveSelection(1),
        PAGE_BUTTON_STYLE,
      );
    }

    this.infoName = this.add
      .text(centerX, INFO_NAME_Y, '', arcadeText(26, COLORS.cyan))
      .setOrigin(0.5);
    this.infoDescription = this.add
      .text(centerX, INFO_DESCRIPTION_Y, '', bodyText(16, COLORS.white))
      .setOrigin(0.5);

    this.difficulty = new DifficultySelector(
      this,
      centerX,
      DIFFICULTY_Y,
      this.savedDifficulty(),
      (difficulty) => this.registry.set(RegistryKeys.aiDifficulty, difficulty),
    );
    new MenuButton(this, centerX, CONFIRM_Y, STRINGS.confirm, () => this.confirm(), CONFIRM_STYLE);
    this.add
      .text(centerX, GAME_HEIGHT - 18, STRINGS.selectHint, bodyText(13, COLORS.white))
      .setOrigin(0.5)
      .setAlpha(0.7);

    onKeys(this, ['LEFT'], () => this.moveSelection(-1));
    onKeys(this, ['RIGHT'], () => this.moveSelection(1));
    onKeys(this, ['UP'], () => this.difficulty.step(1));
    onKeys(this, ['DOWN'], () => this.difficulty.step(-1));
    onKeys(this, MENU_CONFIRM_KEYS, () => this.confirm());
    onKeys(this, MENU_BACK_KEYS, () => goToScene(this, SceneKeys.Menu));

    this.refreshSelection();
  }

  /** Last difficulty chosen in this session (game registry), or the default. */
  private savedDifficulty(): AIDifficulty {
    const saved: unknown = this.registry.get(RegistryKeys.aiDifficulty);
    return isAIDifficulty(saved) ? saved : DEFAULT_AI_DIFFICULTY;
  }

  private cardX(index: number): number {
    const pageStart = Math.floor(index / CARDS_PER_PAGE) * CARDS_PER_PAGE;
    const count = Math.min(CARDS_PER_PAGE, ROSTER.length - pageStart);
    const totalWidth = count * CARD_WIDTH + (count - 1) * CARD_GAP;
    return (
      (GAME_WIDTH - totalWidth) / 2 + CARD_WIDTH / 2 + (index - pageStart) * (CARD_WIDTH + CARD_GAP)
    );
  }

  private createCards(): void {
    ROSTER.forEach((config, index) => {
      const card = createPortrait(this, this.cardX(index), CARDS_Y, config, {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
      });
      this.cards.push(card);
      if (!config.selectable) {
        card.setAlpha(0.55);
        const tag = this.add
          .text(
            CARD_WIDTH / 2 - 8,
            -CARD_HEIGHT / 2 + 8,
            STRINGS.cpuOnly,
            arcadeText(16, COLORS.red),
          )
          .setOrigin(1, 0);
        card.add(tag);
        return;
      }
      card.setSize(CARD_WIDTH, CARD_HEIGHT).setInteractive({ useHandCursor: true });
      // First tap selects, a tap on the selected card confirms.
      card.on('pointerup', () => {
        if (this.selectedIndex === index) this.confirm();
        else {
          this.selectedIndex = index;
          this.refreshSelection();
        }
      });
    });
  }

  private moveSelection(step: number): void {
    const count = ROSTER.length;
    for (let i = 1; i <= count; i++) {
      const candidate = (this.selectedIndex + step * i + count * i) % count;
      if (ROSTER[candidate]?.selectable) {
        this.selectedIndex = candidate;
        this.refreshSelection();
        return;
      }
    }
  }

  private refreshSelection(): void {
    const fighter = ROSTER[this.selectedIndex];
    if (!fighter) return;
    const page = Math.floor(this.selectedIndex / CARDS_PER_PAGE);
    this.cards.forEach((card, index) => {
      const visible = Math.floor(index / CARDS_PER_PAGE) === page;
      card.setVisible(visible);
      if (card.input) card.input.enabled = visible;
    });
    this.cursor.setX(this.cardX(this.selectedIndex));
    this.infoName.setText(fighter.displayName);
    this.infoDescription.setText(fighter.description);
  }

  private confirm(): void {
    const player = ROSTER[this.selectedIndex];
    if (!player?.selectable) return;
    const setup: MatchSetup = {
      playerFighterId: player.id,
      cpuFighterId: pickCpuOpponent(player.id).id,
      stageId: DEFAULT_STAGE_ID,
      difficulty: this.difficulty.value,
    };
    this.cameras.main.flash(150, 255, 255, 255);
    goToScene(this, SceneKeys.Versus, setup);
  }
}
