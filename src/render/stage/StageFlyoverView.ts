import type Phaser from 'phaser';
import { GAME_WIDTH } from '../../config/display';
import type { StageFlyover } from '../../types/stage';
import { DEPTH } from '../../ui/theme';
import { bannerWave, planeBob, visualRng } from './stageMotion';

/** Off-screen margin before entering / after leaving, in pixels. */
const MARGIN = 40;
/** How quickly the banner follows the plane's bob (1/s): it trails slightly behind. */
const BANNER_FOLLOW = 3;
/** Dark rope: stays visible over both the blue sky and the white clouds. */
const TOW_LINE_COLOR = 0x2b2a3a;
/** Propeller blade heights through a spin (fractions), ~30 steps per second: a pixel blur. */
const PROPELLER_FRAMES = [1, 0.6, 0.2, 0.6] as const;
const PROPELLER_FPS = 30;

/** Fixed seed from the stage id: the same pauses every time this stage is played. */
function seedOf(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  return hash;
}

/**
 * A plane crossing the sky the way it faces in the art (right to left by default, or left to
 * right with `direction: 'right'`) with the banner in tow: off screen, a flight at constant speed, a pause, again. The banner is cut in
 * vertical strips that wave like cloth (still by the tow lines, freer at the tail) and follows
 * the plane's bob with a small delay. Created once and reused for every flight; driven by
 * render time only (presentation, never the simulation).
 */
export class StageFlyoverView {
  private readonly plane: Phaser.GameObjects.Image;
  private readonly propeller: Phaser.GameObjects.Image | null;
  private readonly strips: Phaser.GameObjects.Image[] = [];
  private readonly lines: Phaser.GameObjects.Graphics;
  private readonly random: () => number;
  private readonly bannerWidth: number;
  private readonly stripWidth: number;
  private readonly startX: number;
  private readonly endX: number;
  /** Flying to the right: the banner trails on the plane's left. */
  private readonly rightward: boolean;
  private startedAt: number | null = null;
  private nextFlightAt: number | null = null;
  private flying = false;
  private bannerBob = 0;
  private lastTimeMs: number | null = null;

  constructor(
    scene: Phaser.Scene,
    private readonly config: StageFlyover,
    stageId: string,
    stageScroll: number,
  ) {
    const depth = DEPTH.stage;
    const factor = config.scrollFactor;
    const { scale } = config;
    this.random = visualRng(seedOf(stageId));
    this.lines = scene.add.graphics().setDepth(depth).setScrollFactor(factor);
    this.plane = scene.add
      .image(0, 0, config.plane.key)
      .setOrigin(0.5)
      .setScale(scale)
      .setDepth(depth)
      .setScrollFactor(factor);
    this.propeller = config.propeller
      ? scene.add
          .image(0, 0, config.propeller.key)
          .setOrigin(0.5)
          .setScale(scale)
          .setDepth(depth)
          .setScrollFactor(factor)
      : null;
    const banner = scene.textures.get(config.banner.key).getSourceImage();
    this.bannerWidth = banner.width * scale;
    this.stripWidth = Math.ceil(banner.width / config.bannerStrips);
    for (let i = 0; i < config.bannerStrips; i++) {
      const x = i * this.stripWidth;
      this.strips.push(
        scene.add
          .image(0, 0, config.banner.key)
          .setOrigin(0)
          .setCrop(x, 0, Math.min(this.stripWidth, banner.width - x), banner.height)
          .setScale(scale)
          .setDepth(depth)
          .setScrollFactor(factor),
      );
    }
    // The group's left edge, from just past one side to fully past the other (the right side
    // at the camera's furthest scroll).
    const groupWidth = (this.plane.width + config.bannerGap) * scale + this.bannerWidth;
    this.rightward = config.direction === 'right';
    const offRight = GAME_WIDTH + stageScroll * factor + MARGIN;
    const offLeft = -groupWidth - MARGIN;
    this.startX = this.rightward ? offLeft : offRight;
    this.endX = this.rightward ? offRight : offLeft;
    this.setVisible(false);
  }

  /** Seconds a flight takes across the screen. */
  get flightSeconds(): number {
    return Math.abs(this.startX - this.endX) / this.config.speed;
  }

  get isFlying(): boolean {
    return this.flying;
  }

  update(timeMs: number): void {
    const dt = this.lastTimeMs === null ? 0 : Math.min(0.1, (timeMs - this.lastTimeMs) / 1000);
    this.lastTimeMs = timeMs;
    this.nextFlightAt ??= timeMs + this.config.firstDelayMs;
    if (!this.flying && timeMs >= this.nextFlightAt) {
      this.flying = true;
      this.startedAt = timeMs;
      this.setVisible(true);
    }
    if (!this.flying || this.startedAt === null) return;

    const seconds = (timeMs - this.startedAt) / 1000;
    const travelled = this.config.speed * seconds;
    const left = this.rightward ? this.startX + travelled : this.startX - travelled;
    if (this.rightward ? left >= this.endX : left <= this.endX) {
      this.flying = false;
      this.setVisible(false);
      const [min, max] = this.config.pauseMs;
      this.nextFlightAt = timeMs + min + (max - min) * this.random();
      return;
    }
    this.place(left, seconds, dt);
  }

  destroy(): void {
    for (const object of this.objects) {
      object.destroy();
    }
  }

  /** `left`: the flying group's left edge (the plane's, or the banner's when flying right). */
  private place(groupLeft: number, seconds: number, dt: number): void {
    const { config, rightward } = this;
    const { scale } = config;
    const gap = config.bannerGap * scale;
    // The plane's left edge, and the banner's left edge, on either side of it.
    const left = rightward ? groupLeft + this.bannerWidth + gap : groupLeft;
    const bob = planeBob(seconds);
    const top = config.y + bob.y;
    this.plane
      .setPosition(left + (this.plane.width * scale) / 2, top + (this.plane.height * scale) / 2)
      .setAngle(bob.angle);
    const blade = PROPELLER_FRAMES[Math.floor(seconds * PROPELLER_FPS) % PROPELLER_FRAMES.length];
    if (this.propeller && config.propeller)
      this.propeller
        .setPosition(left + config.propeller.x * scale, top + config.propeller.y * scale)
        .setScale(scale, scale * (blade ?? 1));

    // The banner trails: its height follows the plane's bob a moment later.
    this.bannerBob += (bob.y - this.bannerBob) * Math.min(1, dt * BANNER_FOLLOW);
    const bannerLeft = rightward ? groupLeft : left + this.plane.width * scale + gap;
    const bannerTop = config.y + config.bannerOffsetY * scale + this.bannerBob;
    const count = this.strips.length;
    // The edge held by the tow lines (still) faces the plane; the free tail waves.
    const fromLines = (i: number) => (rightward ? count - 1 - i : i);
    this.strips.forEach((strip, i) => {
      // Crops are in texture space, so every strip sits at the banner's own left edge.
      const wave = bannerWave(seconds, fromLines(i), count, config.waveAmplitude);
      strip.setPosition(Math.round(bannerLeft), Math.round(bannerTop + wave));
    });

    // Two tow lines from the plane's tail to the banner's leading edge (top and lower corner).
    const hookX = left + config.hook.x * scale;
    const hookY = top + config.hook.y * scale;
    const edgeTop = bannerTop + bannerWave(seconds, 0, count, config.waveAmplitude);
    this.lines.clear().lineStyle(1, TOW_LINE_COLOR, 0.9);
    const [attachTop, attachBottom] = config.bannerAttach;
    const edge = rightward ? bannerLeft + this.bannerWidth : bannerLeft;
    const inward = rightward ? -1 : 1;
    this.lines.lineBetween(hookX, hookY, edge + inward, edgeTop + attachTop * scale);
    this.lines.lineBetween(hookX, hookY, edge + 2 * inward, edgeTop + attachBottom * scale);
  }

  private get objects(): (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] {
    const objects: (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] = [
      this.plane,
      this.lines,
      ...this.strips,
    ];
    if (this.propeller) objects.push(this.propeller);
    return objects;
  }

  private setVisible(visible: boolean): void {
    for (const object of this.objects) {
      object.setVisible(visible);
    }
  }
}
