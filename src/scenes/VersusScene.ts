import { playSfx } from '../audio/gameAudio';
import Phaser from 'phaser';
import { MENU_CONFIRM_KEYS } from '../config/controls';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import { SceneKeys } from '../config/sceneKeys';
import { STRINGS } from '../config/strings';
import { getFighterConfig } from '../fighters/roster';
import { onKeys } from '../input/menuKeys';
import { pickQuote } from '../config/fighterQuotes';
import { createPortrait } from '../render/PortraitView';
import { SpeechBubble } from '../ui/SpeechBubble';
import { matchAssets } from '../render/assets/sceneAssets';
import { getStageConfig } from '../stages/stageRegistry';
import { getStoryLocation, locationLabel, locationName } from '../story/locations';
import { currentLeg } from '../story/storyProgress';
import { fighterOrigin, isFinalBossEncounter } from '../story/storyProfiles';
import type { MatchSetup } from '../types/match';
import { getStoryProgress } from './story/storyFlow';
import { COLORS, arcadeText, bodyText, pixelText } from '../ui/theme';
import { loadInBackground } from './assetLoading';
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
/** Story fights: where the fight happens, under the VS. */
const PLACE_Y = 352;
const BOSS_LABEL_Y = 310;
/**
 * The fighters' lines, one after the other: above each portrait (in the free band over the
 * cards), toward the inner side, the tail pointing down at it. Never over a face: the portraits'
 * heads sit near the top of the card, at different heights.
 */
const QUOTE = { x: 300, y: 34, maxWidth: 230, delayMs: 100, gapMs: 750 } as const;

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

    // Each fighter's line, from the inner corner of its portrait: the player first, then the rival.
    [player, cpu].forEach((config, side) => {
      const line = pickQuote(config.id, 'versus');
      if (!line) return;
      const x = side === 0 ? QUOTE.x : GAME_WIDTH - QUOTE.x;
      new SpeechBubble(this, x, QUOTE.y, line, {
        maxWidth: QUOTE.maxWidth,
        tail: side === 0 ? 'left' : 'right',
      }).show(SLIDE_MS + QUOTE.delayMs + side * QUOTE.gapMs);
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
      .text(half, GAME_HEIGHT - 74, stage.displayName, arcadeText(22, COLORS.cyan))
      .setOrigin(0.5);
    if (stage.location) {
      this.add
        .text(half, GAME_HEIGHT - 52, stage.location, arcadeText(14, COLORS.white))
        .setOrigin(0.5)
        .setAlpha(0.85);
    }
    if (setup.mode === 'story') this.addStoryDetails(setup);
    const skipHint = this.add
      .text(half, GAME_HEIGHT - 30, STRINGS.vsSkipHint, bodyText(13, COLORS.white))
      .setOrigin(0.5)
      .setAlpha(0.6);

    // The fight's art (both fighters, the stage, the story ending) downloads during the VS
    // screen; if it is not in when the screen ends (or is skipped), it waits with a progress line.
    const loading = this.add
      .text(half, GAME_HEIGHT - 30, STRINGS.loading(0), bodyText(13, COLORS.gold))
      .setOrigin(0.5)
      .setVisible(false);
    let ready = false;
    let wantsStart = false;
    const start = () => {
      if (ready) {
        goToScene(this, SceneKeys.Fight, setup);
        return;
      }
      wantsStart = true;
      skipHint.setVisible(false);
      loading.setVisible(true);
    };
    loadInBackground(
      this,
      matchAssets([player, cpu], stage, setup.mode === 'story' ? player.id : undefined),
      () => {
        ready = true;
        if (wantsStart) start();
      },
      (progress) => loading.setText(STRINGS.loading(progress)),
    );
    this.time.delayedCall(DURATION_MS, start);
    const skip = () => {
      playSfx(this, 'menu-confirm');
      start();
    };
    this.input.once('pointerup', skip);
    onKeys(this, MENU_CONFIRM_KEYS, skip);
  }

  /**
   * Story fights: each fighter's official origin under the portraits, the place of this fight
   * under the VS (it may differ from the rival's origin, e.g. abroad) and the campaign stage.
   */
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
    const leg = progress ? currentLeg(progress) : undefined;
    if (leg) {
      if (isFinalBossEncounter(leg)) {
        this.add
          .text(
            GAME_WIDTH / 2,
            BOSS_LABEL_Y,
            STRINGS.storyFinalBoss,
            arcadeText(22, COLORS.magenta),
          )
          .setOrigin(0.5);
      }
      const place = this.add
        .text(
          GAME_WIDTH / 2,
          PLACE_Y,
          locationName(getStoryLocation(leg.destination)),
          arcadeText(28, COLORS.gold),
        )
        .setOrigin(0.5)
        .setAlpha(0);
      this.tweens.add({ targets: place, alpha: 1, delay: SLIDE_MS + 100, duration: 300 });
    }
    if (progress) {
      this.add
        .text(
          GAME_WIDTH / 2,
          STAGE_LABEL_Y,
          STRINGS.storyLeg(progress.currentStage + 1, progress.route.length),
          pixelText(20, COLORS.gold),
        )
        .setOrigin(0.5);
    }
  }
}
