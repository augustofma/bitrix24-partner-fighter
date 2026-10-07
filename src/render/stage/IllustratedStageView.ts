import type Phaser from 'phaser';
import { GAME_WIDTH } from '../../config/display';
import type {
  CrowdReaction,
  PerformerMotion,
  StageArt,
  StageConfig,
  StageCrowd,
  StageMood,
  StagePerformer,
} from '../../types/stage';
import { DEPTH } from '../../ui/theme';
import type { StageBackdrop } from './StageBackdrop';
import { StageFlyoverView } from './StageFlyoverView';
import {
  BURST_DECAY,
  EXCITEMENT_RATE,
  MOOD_EXCITEMENT,
  REACTION_EXCITEMENT,
  approach,
  crowdColumnStyle,
  crowdGroupOffset,
  crowdOffset,
  flashRate,
  handAngle,
  hash01,
  headPose,
  motionRates,
  visualRng,
  type CrowdColumnStyle,
} from './stageMotion';

/** Longest step the loops advance in one render frame (avoids jumps after a pause). */
const MAX_DT_SECONDS = 0.1;
/** Phone flashes on screen at once (a fixed pool, redrawn every frame). */
const FLASH_POOL = 6;
const FLASH_MS = 140;
const FLASH_SEED = 0x5eed;

interface CrowdColumn {
  image: Phaser.GameObjects.Image;
  index: number;
  /** 'groups' style: own loop and phase. */
  style: CrowdColumnStyle;
  phase: number;
}

interface Performer {
  image: Phaser.GameObjects.Image;
  motion: PerformerMotion;
}

interface Flash {
  x: number;
  y: number;
  bornAt: number;
}

/**
 * Stage drawn from its art (StageConfig.art): the background image, the crowd as columns cut
 * from that same image bouncing under a copy of the barrier (as one wave, or in independent
 * groups), phone flashes, small performer layers (head, hand) looping around their pivots and
 * an optional plane flyover. Every crowd layer shares the background's parallax, so it stays
 * glued to it while the camera scrolls. Everything is created once here (nothing per frame)
 * and driven by render time. Presentation only.
 */
export class IllustratedStageView implements StageBackdrop {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly columns: CrowdColumn[] = [];
  private readonly performers: Performer[] = [];
  private readonly flashes: (Flash | null)[] = Array.from({ length: FLASH_POOL }, () => null);
  private readonly flashGraphics: Phaser.GameObjects.Graphics | null = null;
  private readonly flyover: StageFlyoverView | null = null;
  private readonly random = visualRng(FLASH_SEED);
  private excitement = 0;
  private targetExcitement = 0;
  /** Short bursts on big moments, decaying back to the mood. */
  private burst = 0;
  private flashBudget = 0;
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
    if (art.flyover) {
      this.flyover = new StageFlyoverView(scene, art.flyover, stage.id, Math.max(0, travel));
    }
    this.createCrowd(scrollFactor);
    if (art.crowd?.flashes) {
      this.flashGraphics = this.track(
        scene.add.graphics().setDepth(DEPTH.stage).setScrollFactor(scrollFactor),
      );
    }
    for (const performer of art.performers ?? []) this.addPerformer(performer, scrollFactor);
  }

  /** Every game object this stage owns (fixed after construction). */
  get objectCount(): number {
    return this.objects.length;
  }

  setMood(mood: StageMood): void {
    this.targetExcitement = MOOD_EXCITEMENT[mood];
  }

  react(reaction: CrowdReaction): void {
    this.burst = Math.max(this.burst, REACTION_EXCITEMENT[reaction]);
  }

  update(timeMs: number): void {
    const dt =
      this.lastTimeMs === null ? 0 : Math.min(MAX_DT_SECONDS, (timeMs - this.lastTimeMs) / 1000);
    this.lastTimeMs = timeMs;
    this.excitement = approach(this.excitement, this.targetExcitement, dt, EXCITEMENT_RATE);
    this.burst = Math.max(0, this.burst - BURST_DECAY * dt);
    const excitement = Math.max(this.excitement, this.burst);
    const rates = motionRates(excitement);
    this.crowdPhase += rates.crowdHz * dt;
    this.lookPhase += rates.lookHz * dt;
    this.nodPhase += rates.nodHz * dt;
    this.handPhase += rates.handHz * dt;

    const groups = this.art.crowd?.style === 'groups';
    for (const column of this.columns) {
      if (groups) {
        column.phase += rates.crowdHz * column.style.speed * dt;
        const offset = crowdGroupOffset(
          column.style,
          column.phase,
          rates.crowdAmplitude,
          excitement,
        );
        column.image.setPosition(offset.x, this.art.top + offset.y);
      } else {
        column.image.setY(
          this.art.top + crowdOffset(this.crowdPhase, column.index, rates.crowdAmplitude),
        );
      }
    }
    for (const { image, motion } of this.performers) {
      if (motion === 'headLook') {
        const pose = headPose(this.lookPhase, this.nodPhase, rates.nodDegrees);
        image.setScale(pose.scaleX, 1).setAngle(pose.angle);
      } else {
        image.setAngle(handAngle(this.handPhase, rates.handDegrees));
      }
    }
    this.updateFlashes(timeMs, dt, excitement);
    this.flyover?.update(timeMs);
  }

  destroy(): void {
    this.flyover?.destroy();
    for (const object of this.objects) object.destroy();
    this.objects.length = 0;
    this.columns.length = 0;
    this.performers.length = 0;
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.objects.push(object);
    return object;
  }

  private addArtImage(): Phaser.GameObjects.Image {
    return this.track(
      this.scene.add
        .image(0, this.art.top, this.art.background.key)
        .setOrigin(0)
        .setDepth(DEPTH.stage),
    );
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
        const style = crowdColumnStyle(index);
        this.columns.push({ image, index, style, phase: style.phase });
        index++;
      }
    }
    const { barrier } = crowd;
    this.addArtImage()
      .setCrop(barrier.x, barrier.y, barrier.width, barrier.height)
      .setScrollFactor(scrollFactor);
  }

  private addPerformer(performer: StagePerformer, scrollFactor: number): void {
    const image = this.track(
      this.scene.add
        .image(performer.pivotX, this.art.top + performer.pivotY, performer.image.key)
        .setOrigin(performer.originX, performer.originY)
        .setScrollFactor(scrollFactor)
        .setDepth(DEPTH.stage),
    );
    this.performers.push({ image, motion: performer.motion });
  }

  /** Phone camera flashes over the raised hands: a few when calm, many on big moments. */
  private updateFlashes(timeMs: number, dt: number, excitement: number): void {
    const g = this.flashGraphics;
    const area = this.art.crowd?.flashes;
    const crowd = this.art.crowd;
    if (!g || !area || !crowd) return;
    this.flashBudget += flashRate(excitement) * dt;
    while (this.flashBudget >= 1) {
      this.flashBudget -= 1;
      const slot = this.flashes.findIndex((flash) => flash === null);
      if (slot < 0) break;
      this.flashes[slot] = this.randomFlash(crowd, area, timeMs);
    }
    g.clear();
    this.flashes.forEach((flash, i) => {
      if (!flash) return;
      const age = (timeMs - flash.bornAt) / FLASH_MS;
      if (age >= 1) {
        this.flashes[i] = null;
        return;
      }
      // A bright pixel with a short cross: a phone camera flash in pixel art.
      const alpha = 1 - age;
      const y = this.art.top + flash.y;
      g.fillStyle(0xffffff, alpha).fillRect(flash.x - 1, y - 1, 3, 3);
      g.fillStyle(0xfff6c8, alpha * 0.7)
        .fillRect(flash.x - 3, y, 7, 1)
        .fillRect(flash.x, y - 3, 1, 7);
    });
  }

  private randomFlash(crowd: StageCrowd, area: { top: number; bottom: number }, now: number) {
    const band = crowd.bands[Math.floor(this.random() * crowd.bands.length)] ?? crowd.bands[0];
    const x = band ? band.x + this.random() * band.width : 0;
    const y = area.top + hash01(Math.round(x)) * (area.bottom - area.top);
    return { x: Math.round(x), y: Math.round(y), bornAt: now };
  }
}
