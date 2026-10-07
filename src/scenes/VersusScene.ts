import Phaser from 'phaser';
import { MENU_CONFIRM_KEYS } from '../config/controls';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import { SceneKeys } from '../config/sceneKeys';
import { STRINGS } from '../config/strings';
import { getFighterConfig } from '../fighters/roster';
import { onKeys } from '../input/menuKeys';
import { createPortrait } from '../render/PortraitView';
import { getStageConfig } from '../stages/stageRegistry';
import { locationLabel } from '../story/locations';
import { fighterOrigin, storyRouteFor } from '../story/storyProfiles';
import type { MatchSetup } from '../types/match';
import { getStoryProgress } from './story/storyFlow';
import { COLORS, arcadeText, bodyText, pixelText } from '../ui/theme';
import { fadeIn, goToScene } from './transitions';

const DURATION_MS = 2600;
const PORTRAIT_WIDTH = 300;
const PORTRAIT_HEIGHT = 380;
const SLIDE_MS = 450;
/** Horizontal offset of the diagonal split between both sides. */
const SPLIT_SKEW = 120;
/** Final x of the left portrait (the right one mirrors it). */
const PORTRAIT_SIDE_X = 220;
const ORIGIN_Y = 462;
const STAGE_LABEL_Y = 40;

/**
 * "FIGHTER_A VS FIGHTER_B" presentation, then starts the fight. Story fights also show where
 * each fighter comes from and the campaign stage.
 */
export class VersusScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Versus);
  }

  create(setup: MatchSetup): void {
    fadeIn(this);
    const player = getFighterConfig(setup.playerFighterId);
    const cpu = getFighterConfig(setup.cpuFighterId);
    const stage = getStageConfig(setup.stageId);
    const half = GAME_WIDTH / 2;

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.ink, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.fillStyle(player.palette.body, 0.35);
    bg.fillPoints([
      { x: 0, y: 0 },
      { x: half + SPLIT_SKEW / 2, y: 0 },
      { x: half - SPLIT_SKEW / 2, y: GAME_HEIGHT },
      { x: 0, y: GAME_HEIGHT },
    ]);
    bg.fillStyle(cpu.palette.body, 0.35);
    bg.fillPoints([
      { x: half + SPLIT_SKEW / 2, y: 0 },
      { x: GAME_WIDTH, y: 0 },
      { x: GAME_WIDTH, y: GAME_HEIGHT },
      { x: half - SPLIT_SKEW / 2, y: GAME_HEIGHT },
    ]);

    const size = { width: PORTRAIT_WIDTH, height: PORTRAIT_HEIGHT };
    const left = createPortrait(this, -PORTRAIT_WIDTH, 250, player, size);
    const right = createPortrait(this, GAME_WIDTH + PORTRAIT_WIDTH, 250, cpu, {
      ...size,
      mirrored: true,
    });
    this.tweens.add({
      targets: left,
      x: PORTRAIT_SIDE_X,
      duration: SLIDE_MS,
      ease: 'Cubic.easeOut',
    });
    this.tweens.add({
      targets: right,
      x: GAME_WIDTH - PORTRAIT_SIDE_X,
      duration: SLIDE_MS,
      ease: 'Cubic.easeOut',
    });

    const vs = this.add
      .text(half, 240, STRINGS.versus, arcadeText(110, COLORS.gold, COLORS.magenta))
      .setOrigin(0.5)
      .setScale(0);
    this.tweens.add({
      targets: vs,
      scale: 1,
      delay: SLIDE_MS,
      duration: 300,
      ease: 'Back.easeOut',
    });

    this.add
      .text(half, GAME_HEIGHT - 70, stage.displayName, arcadeText(22, COLORS.cyan))
      .setOrigin(0.5);
    if (setup.mode === 'story') this.addStoryDetails(setup);
    this.add
      .text(half, GAME_HEIGHT - 30, STRINGS.vsSkipHint, bodyText(13, COLORS.white))
      .setOrigin(0.5)
      .setAlpha(0.6);

    const start = () => goToScene(this, SceneKeys.Fight, setup);
    this.time.delayedCall(DURATION_MS, start);
    this.input.once('pointerup', start);
    onKeys(this, MENU_CONFIRM_KEYS, start);
  }

  /** Story fights: each fighter's city and UF under the portraits, and the campaign stage. */
  private addStoryDetails(setup: MatchSetup): void {
    const sides = [
      { id: setup.playerFighterId, x: PORTRAIT_SIDE_X },
      { id: setup.cpuFighterId, x: GAME_WIDTH - PORTRAIT_SIDE_X },
    ];
    for (const { id, x } of sides) {
      const origin = fighterOrigin(id);
      if (!origin) continue;
      const label = this.add
        .text(x, ORIGIN_Y, locationLabel(origin), pixelText(19, COLORS.neon))
        .setOrigin(0.5)
        .setAlpha(0);
      this.tweens.add({ targets: label, alpha: 1, delay: SLIDE_MS, duration: 250 });
    }
    const progress = getStoryProgress(this);
    const route = storyRouteFor(setup.playerFighterId);
    if (progress && route) {
      this.add
        .text(
          GAME_WIDTH / 2,
          STAGE_LABEL_Y,
          STRINGS.storyLeg(progress.currentStage + 1, route.length),
          pixelText(20, COLORS.gold),
        )
        .setOrigin(0.5);
    }
  }
}
