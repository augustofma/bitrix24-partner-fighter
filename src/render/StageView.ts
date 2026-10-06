import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import { createRng, randomInt } from '../core/random';
import type { StageConfig } from '../types/stage';
import { COLORS, DEPTH, arcadeText } from '../ui/theme';

/** Parallax factors: 0 = glued to the screen, 1 = moves with the world. */
const PARALLAX = { sky: 0, skyline: 0.35, banner: 0.6, crowd: 0.8 } as const;
/** Banner sits between the HUD and the announcer text, so it never covers either. */
const BANNER_Y = 136;
const BANNER_ALPHA = 0.7;
const HORIZON_Y = 400;
const FLOOR_TOP_Y = 425;
const WALL_WIDTH = 26;
const WALL_TOP_Y = 230;
/** Fixed seed: the procedural stage looks the same every time. */
const STAGE_SEED = 2024;

/**
 * Procedural placeholder for a stage (sky, skyline, banner, crowd, floor, walls).
 * Future: when `stage.backgroundAsset` exists, draw layered images instead.
 */
export class StageView {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly stage: StageConfig,
  ) {
    this.drawSky();
    this.drawSkyline();
    this.drawBanner();
    this.drawCrowd();
    this.drawFloor();
    this.drawWalls();
  }

  /** World width a parallax layer must cover so it never shows an empty edge. */
  private layerWidth(factor: number): number {
    return GAME_WIDTH + (this.stage.width - GAME_WIDTH) * factor + 40;
  }

  private drawSky(): void {
    const { skyTop, skyBottom } = this.stage.palette;
    this.scene.add
      .graphics()
      .fillGradientStyle(skyTop, skyTop, skyBottom, skyBottom, 1)
      .fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      .setScrollFactor(PARALLAX.sky)
      .setDepth(DEPTH.stage);
  }

  private drawSkyline(): void {
    const rng = createRng(STAGE_SEED);
    const g = this.scene.add.graphics().setScrollFactor(PARALLAX.skyline).setDepth(DEPTH.stage);
    const width = this.layerWidth(PARALLAX.skyline);
    for (let x = -20; x < width;) {
      const w = randomInt(rng, 40, 90);
      const h = randomInt(rng, 70, 190);
      g.fillStyle(this.stage.palette.skyline, 1).fillRect(x, HORIZON_Y - h, w - 4, h);
      g.fillStyle(this.stage.palette.accent, 0.35);
      for (let wy = HORIZON_Y - h + 10; wy < HORIZON_Y - 12; wy += 16) {
        for (let wx = x + 6; wx < x + w - 12; wx += 12) {
          if (rng() < 0.45) g.fillRect(wx, wy, 5, 7);
        }
      }
      x += w;
    }
  }

  private drawBanner(): void {
    const centerX = GAME_WIDTH / 2 + ((this.stage.width - GAME_WIDTH) / 2) * PARALLAX.banner;
    const banner = this.scene.add.container(centerX, BANNER_Y);
    banner.setScrollFactor(PARALLAX.banner).setDepth(DEPTH.stage).setAlpha(BANNER_ALPHA);
    const panel = this.scene.add
      .rectangle(0, 0, 300, 44, COLORS.ink, 0.75)
      .setStrokeStyle(3, this.stage.palette.accent);
    const title = this.scene.add
      .text(0, 0, this.stage.displayName, arcadeText(24, COLORS.gold))
      .setOrigin(0.5);
    banner.add([panel, title]);
  }

  private drawCrowd(): void {
    const rng = createRng(STAGE_SEED + 1);
    const g = this.scene.add.graphics().setScrollFactor(PARALLAX.crowd).setDepth(DEPTH.stage);
    const width = this.layerWidth(PARALLAX.crowd);
    const tints = [0x3b2a73, 0x4a2f86, 0x2e2361, 0x5a3a8f];
    for (let row = 0; row < 3; row++) {
      const baseY = HORIZON_Y - 28 + row * 14;
      for (let x = -10 + row * 9; x < width; x += 18) {
        const color = tints[randomInt(rng, 0, tints.length - 1)] ?? this.stage.palette.crowd;
        g.fillStyle(color, 1);
        g.fillRoundedRect(x - 9, baseY, 18, 26, 6);
        g.fillCircle(x, baseY - 6, 7);
      }
    }
    this.scene.tweens.add({
      targets: g,
      y: -3,
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private drawFloor(): void {
    const { floor, floorLine, accent } = this.stage.palette;
    const { width } = this.stage;
    const g = this.scene.add.graphics().setDepth(DEPTH.stage);

    // Advertising barrier between crowd and floor.
    g.fillStyle(COLORS.ink, 1).fillRect(0, HORIZON_Y, width, FLOOR_TOP_Y - HORIZON_Y);
    g.fillStyle(accent, 0.8).fillRect(0, HORIZON_Y, width, 3);

    g.fillStyle(floor, 1).fillRect(0, FLOOR_TOP_Y, width, GAME_HEIGHT - FLOOR_TOP_Y);

    // Perspective lines converging toward the arena center.
    g.lineStyle(2, floorLine, 0.7);
    const center = width / 2;
    for (let offset = -width; offset <= width; offset += 90) {
      g.lineBetween(center + offset * 0.6, FLOOR_TOP_Y, center + offset, GAME_HEIGHT);
    }
    for (const y of [445, 470, 500, 535]) g.lineBetween(0, y, width, y);
    g.lineStyle(3, accent, 0.5).lineBetween(0, this.stage.groundY, width, this.stage.groundY);
  }

  /** Glowing pillars that mark the arena's side limits. */
  private drawWalls(): void {
    const { accent } = this.stage.palette;
    const g = this.scene.add.graphics().setDepth(DEPTH.stage);
    for (const x of [0, this.stage.width - WALL_WIDTH]) {
      g.fillStyle(COLORS.ink, 1).fillRect(x, WALL_TOP_Y, WALL_WIDTH, GAME_HEIGHT - WALL_TOP_Y);
      g.fillStyle(accent, 0.9).fillRect(x + WALL_WIDTH / 2 - 2, WALL_TOP_Y + 8, 4, 220);
    }
  }
}
