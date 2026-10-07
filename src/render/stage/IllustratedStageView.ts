import type Phaser from 'phaser';
import { GAME_WIDTH } from '../../config/display';
import type {
  PerformerMotion,
  StageArt,
  StageConfig,
  StageMood,
  StagePerformer,
} from '../../types/stage';
import { DEPTH } from '../../ui/theme';
import type { StageBackdrop } from './StageBackdrop';
import {
  EXCITEMENT_RATE,
  MOOD_EXCITEMENT,
  approach,
  crowdOffset,
  handAngle,
  headPose,
  motionRates,
} from './stageMotion';

/** Longest step the loops advance in one render frame (avoids jumps after a pause). */
const MAX_DT_SECONDS = 0.1;

interface CrowdColumn {
  image: Phaser.GameObjects.Image;
  index: number;
}

interface Performer {
  image: Phaser.GameObjects.Image;
  motion: PerformerMotion;
}

/**
 * Stage drawn from its art (StageConfig.art): the background image, the crowd as columns cut
 * from that same image bouncing in a wave under a copy of the barrier, and small performer
 * layers (head, hand) that loop around their pivots. Every layer shares the background's
 * parallax, so they stay glued to it while the camera scrolls. Presentation only.
 */
export class IllustratedStageView implements StageBackdrop {
  private readonly columns: CrowdColumn[] = [];
  private readonly performers: Performer[] = [];
  private excitement = 0;
  private targetExcitement = 0;
  private lastTimeMs: number | null = null;
  // Phases in cycles; only their fractional part matters.
  private crowdPhase = 0;
  private lookPhase = 0;
  private nodPhase = 0;
  private handPhase = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    stage: StageConfig,
    private readonly art: StageArt,
  ) {
    const background = this.addArtImage();
    // Spans the whole arena: no parallax needed if the art is not wider than the screen.
    const travel = stage.width - GAME_WIDTH;
    const scrollFactor = travel > 0 ? Math.max(0, (background.width - GAME_WIDTH) / travel) : 0;
    background.setScrollFactor(scrollFactor);
    this.createCrowd(scrollFactor);
    for (const performer of art.performers ?? []) this.addPerformer(performer, scrollFactor);
  }

  setMood(mood: StageMood): void {
    this.targetExcitement = MOOD_EXCITEMENT[mood];
  }

  update(timeMs: number): void {
    const dt =
      this.lastTimeMs === null ? 0 : Math.min(MAX_DT_SECONDS, (timeMs - this.lastTimeMs) / 1000);
    this.lastTimeMs = timeMs;
    this.excitement = approach(this.excitement, this.targetExcitement, dt, EXCITEMENT_RATE);
    const rates = motionRates(this.excitement);
    this.crowdPhase += rates.crowdHz * dt;
    this.lookPhase += rates.lookHz * dt;
    this.nodPhase += rates.nodHz * dt;
    this.handPhase += rates.handHz * dt;

    for (const { image, index } of this.columns) {
      image.setY(this.art.top + crowdOffset(this.crowdPhase, index, rates.crowdAmplitude));
    }
    for (const { image, motion } of this.performers) {
      if (motion === 'headLook') {
        const pose = headPose(this.lookPhase, this.nodPhase, rates.nodDegrees);
        image.setScale(pose.scaleX, 1).setAngle(pose.angle);
      } else {
        image.setAngle(handAngle(this.handPhase, rates.handDegrees));
      }
    }
  }

  private addArtImage(): Phaser.GameObjects.Image {
    return this.scene.add
      .image(0, this.art.top, this.art.background.key)
      .setOrigin(0)
      .setDepth(DEPTH.stage);
  }

  /** Bouncing columns cut from the background, then the barrier copied on top of them. */
  private createCrowd(scrollFactor: number): void {
    const crowd = this.art.crowd;
    if (!crowd) return;
    let index = 0;
    for (const band of crowd.bands) {
      for (let x = band.x; x < band.x + band.width; x += crowd.columnWidth) {
        const width = Math.min(crowd.columnWidth, band.x + band.width - x);
        const image = this.addArtImage()
          .setCrop(x, band.y, width, band.height)
          .setScrollFactor(scrollFactor);
        this.columns.push({ image, index: index++ });
      }
    }
    const { barrier } = crowd;
    this.addArtImage()
      .setCrop(barrier.x, barrier.y, barrier.width, barrier.height)
      .setScrollFactor(scrollFactor);
  }

  private addPerformer(performer: StagePerformer, scrollFactor: number): void {
    const image = this.scene.add
      .image(performer.pivotX, this.art.top + performer.pivotY, performer.image.key)
      .setOrigin(performer.originX, performer.originY)
      .setScrollFactor(scrollFactor)
      .setDepth(DEPTH.stage);
    this.performers.push({ image, motion: performer.motion });
  }
}
