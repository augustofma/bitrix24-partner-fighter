import Phaser from 'phaser';
import { gameMusic, playSfx } from '../audio/gameAudio';
import { SCENE_MUSIC } from '../config/audio';
import { MENU_BACK_KEYS, MENU_CONFIRM_KEYS } from '../config/controls';
import { GAME_WIDTH } from '../config/display';
import { SceneKeys } from '../config/sceneKeys';
import { STRINGS } from '../config/strings';
import { getFighterConfig } from '../fighters/roster';
import { onKeys } from '../input/menuKeys';
import { getSelectableStages } from '../stages/stageRegistry';
import { quickFightStageId } from '../story/storyProfiles';
import type { AIDifficulty, MatchSetup } from '../types/match';
import type { StageConfig } from '../types/stage';
import { ArcadeButton } from '../ui/select/ArcadeButton';
import { drawArcadeFrame } from '../ui/select/arcadeFrame';
import { createSelectBackground } from '../ui/select/SelectBackground';
import {
  STAGE_SELECT_LAYOUT,
  coverCrop,
  listRowY,
  listWindowStart,
} from '../ui/stageSelect/stageSelectLayout';
import { COLORS, arcadeText, bodyText, css } from '../ui/theme';
import type { CharacterSelectData } from './CharacterSelectScene';
import { fadeIn, goToScene } from './transitions';

/** What the character select hands over: both fighters and the CPU difficulty. */
export interface StageSelectData {
  playerFighterId: string;
  cpuFighterId: string;
  difficulty: AIDifficulty;
}

const FOOTER_HEIGHT = 28;
const TITLE_GLOW_BLUR = 10;
/** Frame border inside the preview / list rows, around the stage image. */
const PREVIEW_INSET = 8;
const ROW_INSET = 5;
/** The list thumbnails show the upper part of the art (sky, landmark), the preview the middle. */
const THUMB_BIAS = 0.35;
const MATCH_BAND_HEIGHT = 34;
const PREVIEW_ENTER_MS = 160;

interface StageRow {
  container: Phaser.GameObjects.Container;
  frame: Phaser.GameObjects.Graphics;
  stage: StageConfig;
}

/**
 * Quick fight, step 3: the stage. A large preview of the highlighted stage (its own background
 * art), its name and place, and the list of illustrated stages (getSelectableStages). Starts
 * on the stage the fighters' cities suggest (quickFightStageId); any stage can be picked.
 * ESC goes back to the rival pick, keeping both fighters.
 */
export class StageSelectScene extends Phaser.Scene {
  private stages: readonly StageConfig[] = [];
  private selectedIndex = 0;
  private match!: StageSelectData;
  private rows: StageRow[] = [];
  private preview: Phaser.GameObjects.Container | null = null;
  private nameText!: Phaser.GameObjects.Text;
  private locationText!: Phaser.GameObjects.Text;
  private fightButton!: ArcadeButton;

  constructor() {
    super(SceneKeys.StageSelect);
  }

  create(data: StageSelectData): void {
    this.match = data;
    this.stages = getSelectableStages();
    if (this.stages.length === 0) throw new Error('No illustrated stage to select.');
    const suggested = quickFightStageId(data.playerFighterId, data.cpuFighterId);
    this.selectedIndex = Math.max(
      0,
      this.stages.findIndex((stage) => stage.id === suggested),
    );
    this.preview = null;
    this.rows = [];

    fadeIn(this);
    gameMusic(this).play(SCENE_MUSIC.characterSelect);
    createSelectBackground(this);
    this.createTopBar();
    this.createPreviewFrame();
    this.createRows();

    const { fightButton, footerY, caption } = STAGE_SELECT_LAYOUT;
    this.nameText = this.add
      .text(caption.x, caption.nameY, '', arcadeText(28, COLORS.gold))
      .setOrigin(0.5)
      .setShadow(0, 0, css(COLORS.magenta), TITLE_GLOW_BLUR, true, true);
    this.locationText = this.add
      .text(caption.x, caption.locationY, '', bodyText(15, COLORS.neon))
      .setOrigin(0.5);
    this.fightButton = new ArcadeButton(
      this,
      fightButton.x,
      fightButton.y,
      STRINGS.stageSelectButton,
      () => this.confirm(),
      { width: fightButton.width, height: fightButton.height, fontSize: 28, pulse: true },
    );
    this.add
      .rectangle(GAME_WIDTH / 2, footerY, GAME_WIDTH, FOOTER_HEIGHT, COLORS.navyDeep, 0.85)
      .setStrokeStyle(2, COLORS.royal);
    this.add
      .text(GAME_WIDTH / 2, footerY, STRINGS.stageSelectHint, bodyText(13, COLORS.white))
      .setOrigin(0.5)
      .setAlpha(0.92);

    onKeys(this, ['UP', 'LEFT'], () => this.move(-1));
    onKeys(this, ['DOWN', 'RIGHT'], () => this.move(1));
    onKeys(this, MENU_CONFIRM_KEYS, () => {
      this.fightButton.flash();
      this.confirm();
    });
    onKeys(this, MENU_BACK_KEYS, () => this.back());

    this.refresh(false);
  }

  /** VOLTAR, the framed title and the step badge (same top bar as the character select). */
  private createTopBar(): void {
    const { topBarY, backButton, title, stepBadge } = STAGE_SELECT_LAYOUT;
    new ArcadeButton(this, backButton.x, topBarY, STRINGS.back, () => this.back(), {
      width: backButton.width,
      height: backButton.height,
      fontSize: 18,
      variant: 'secondary',
    });
    const banner = this.add.graphics();
    drawArcadeFrame(
      banner,
      title.x - title.width / 2,
      topBarY - title.height / 2,
      title.width,
      title.height,
      {
        fill: COLORS.violet,
        highlight: COLORS.violetLight,
        border: COLORS.gold,
        inner: COLORS.orange,
        shadow: 5,
      },
    );
    this.add
      .text(title.x, topBarY, STRINGS.stageSelectTitle, arcadeText(30, COLORS.gold))
      .setOrigin(0.5)
      .setShadow(0, 0, css(COLORS.magenta), TITLE_GLOW_BLUR, true, true);
    const badge = this.add.graphics();
    drawArcadeFrame(
      badge,
      stepBadge.x - stepBadge.width / 2,
      topBarY - stepBadge.height / 2,
      stepBadge.width,
      stepBadge.height,
      { fill: COLORS.navyDeep, fillAlpha: 0.9, border: COLORS.magenta, inner: COLORS.violet },
    );
    this.add
      .text(stepBadge.x, topBarY, STRINGS.selectStep(3, 3), arcadeText(17, COLORS.white))
      .setOrigin(0.5);
  }

  private createPreviewFrame(): void {
    const { preview } = STAGE_SELECT_LAYOUT;
    const frame = this.add.graphics();
    drawArcadeFrame(frame, preview.left, preview.top, preview.width, preview.height, {
      fill: COLORS.navyDeep,
      border: COLORS.gold,
      inner: COLORS.violet,
      shadow: 6,
    });
  }

  private createRows(): void {
    const { list, thumb } = STAGE_SELECT_LAYOUT;
    this.stages.forEach((stage, index) => {
      const container = this.add.container(list.left, 0);
      const frame = this.add.graphics();
      container.add(frame);
      const thumbTop = (list.rowHeight - thumb.height) / 2;
      container.add(
        this.stageImage(stage, ROW_INSET + 4, thumbTop, thumb.width, thumb.height, THUMB_BIAS),
      );
      const textX = ROW_INSET + thumb.width + 16;
      container.add(
        this.add.text(textX, list.rowHeight / 2 - 10, stage.displayName, arcadeText(14)),
      );
      if (stage.location) {
        container.add(
          this.add.text(textX, list.rowHeight / 2 + 8, stage.location, bodyText(10, COLORS.neon)),
        );
      }
      container.setSize(list.width, list.rowHeight);
      container.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, list.width, list.rowHeight),
        Phaser.Geom.Rectangle.Contains,
      );
      container.on('pointerup', () => {
        // First tap selects, a tap on the selected stage confirms (like the fighter cards).
        if (this.selectedIndex === index) this.confirm();
        else {
          playSfx(this, 'menu-move');
          this.selectedIndex = index;
          this.refresh(true);
        }
      });
      this.rows.push({ container, frame, stage });
    });
  }

  /**
   * The stage's background art cropped to a box (top-left at x, y), or its fallback palette
   * when the art is not loaded (same colors as the procedural stage).
   */
  private stageImage(
    stage: StageConfig,
    x: number,
    y: number,
    width: number,
    height: number,
    bias: number,
  ): Phaser.GameObjects.GameObject {
    const key = stage.art?.background.key;
    if (key && this.textures.exists(key)) {
      const frame = this.textures.getFrame(key);
      const { scale, crop } = coverCrop(frame.width, frame.height, width, height, bias);
      return this.add
        .image(x - crop.x * scale, y - crop.y * scale, key)
        .setOrigin(0, 0)
        .setScale(scale)
        .setCrop(crop.x, crop.y, crop.width, crop.height);
    }
    const { skyTop, skyBottom, floor } = stage.palette;
    const g = this.add.graphics();
    g.fillGradientStyle(skyTop, skyTop, skyBottom, skyBottom, 1);
    g.fillRect(x, y, width, height * 0.7);
    g.fillStyle(floor, 1).fillRect(x, y + height * 0.7, width, height * 0.3);
    return g;
  }

  private move(step: number): void {
    const count = this.stages.length;
    const next = (this.selectedIndex + step + count) % count;
    if (next === this.selectedIndex) return;
    playSfx(this, 'menu-move');
    this.selectedIndex = next;
    this.refresh(true);
  }

  private refresh(animate: boolean): void {
    const stage = this.stages[this.selectedIndex];
    if (!stage) return;
    const { list } = STAGE_SELECT_LAYOUT;
    const start = listWindowStart(this.selectedIndex, this.stages.length);
    this.rows.forEach((row, index) => {
      const shown = index >= start && index < start + list.visibleRows;
      const selected = index === this.selectedIndex;
      row.container.setVisible(shown);
      if (row.container.input) row.container.input.enabled = shown;
      row.container.setY(listRowY(index - start) - list.rowHeight / 2);
      row.frame.clear();
      drawArcadeFrame(row.frame, 0, 0, list.width, list.rowHeight, {
        fill: selected ? COLORS.violet : COLORS.navyDeep,
        fillAlpha: selected ? 1 : 0.9,
        border: selected ? COLORS.gold : COLORS.royal,
        inner: selected ? COLORS.orange : COLORS.indigo,
        shadow: selected ? 4 : 2,
      });
    });
    this.nameText.setText(stage.displayName);
    this.locationText.setText(stage.location ?? '');
    this.showPreview(stage, animate);
  }

  /** The big picture of the highlighted stage, with the match on a band at its top. */
  private showPreview(stage: StageConfig, animate: boolean): void {
    this.preview?.destroy();
    const { preview } = STAGE_SELECT_LAYOUT;
    const width = preview.width - PREVIEW_INSET * 2;
    const height = preview.height - PREVIEW_INSET * 2;
    const container = this.add.container(preview.left + PREVIEW_INSET, preview.top + PREVIEW_INSET);
    container.add(this.stageImage(stage, 0, 0, width, height, 0.5));
    container.add(
      this.add.rectangle(
        width / 2,
        MATCH_BAND_HEIGHT / 2,
        width,
        MATCH_BAND_HEIGHT,
        COLORS.ink,
        0.7,
      ),
    );
    const player = getFighterConfig(this.match.playerFighterId);
    const cpu = getFighterConfig(this.match.cpuFighterId);
    container.add(
      this.add
        .text(
          width / 2,
          MATCH_BAND_HEIGHT / 2,
          STRINGS.stageSelectMatch(player.displayName, cpu.displayName),
          arcadeText(17, COLORS.white),
        )
        .setOrigin(0.5),
    );
    this.preview = container;
    if (animate) {
      container.setAlpha(0);
      this.tweens.add({ targets: container, alpha: 1, duration: PREVIEW_ENTER_MS });
    }
  }

  private back(): void {
    playSfx(this, 'menu-back');
    const data: CharacterSelectData = {
      mode: 'quick',
      step: 'rival',
      playerFighterId: this.match.playerFighterId,
      cpuFighterId: this.match.cpuFighterId,
    };
    goToScene(this, SceneKeys.CharacterSelect, data);
  }

  private confirm(): void {
    const stage = this.stages[this.selectedIndex];
    if (!stage) return;
    playSfx(this, 'menu-confirm');
    const setup: MatchSetup = {
      playerFighterId: this.match.playerFighterId,
      cpuFighterId: this.match.cpuFighterId,
      stageId: stage.id,
      difficulty: this.match.difficulty,
    };
    this.cameras.main.flash(150, 255, 255, 255);
    goToScene(this, SceneKeys.Versus, setup);
  }
}
