import Phaser from 'phaser';
import { createPortrait } from '../../render/PortraitView';
import { POSES } from '../../render/placeholder/poses';
import type { FighterConfig } from '../../types/fighter';
import { COLORS, arcadeText } from '../theme';
import { VICTORY_LAYOUT } from './victoryLayout';

const WINDOW_FILL = 0x00204e;
const STRIPE_COLOR = 0x0b4a8f;
/** Lengths (px) of the equalizer-like stripes on the window's sides, top to bottom. */
const STRIPES = [18, 34, 26, 44, 30, 52, 38, 24, 46, 28, 36] as const;
const STRIPE_HEIGHT = 7;
const STRIPE_GAP = 9;
/** Halo behind the card: concentric rings fading outward read as soft light, not a disc. */
const HALO_RINGS = 5;
const HALO_RING_ALPHA = 0.06;
const FRAME_GLOW_ALPHA = 0.32;
const PULSE_MS = 900;
const FLOAT_PX = 3;
const FLOAT_MS = 2400;
const SHINE_WIDTH = 22;
const SHINE_MS = 650;
const SHINE_EVERY_MS = 3200;
const NAME_FONT_SIZE = 22;

/**
 * The winner's card: the art's frame over a navy window with the real portrait (or both
 * portraits on a draw), the name on the plate, a pulsing frame glow, a halo behind, an idle
 * float and a shine sweeping the window now and then.
 */
export class VictoryCard {
  readonly container: Phaser.GameObjects.Container;

  constructor(
    private readonly scene: Phaser.Scene,
    frameKey: string,
    featured: readonly FighterConfig[],
    nameLabel: string,
  ) {
    const { card, cardWindow, namePlate } = VICTORY_LAYOUT;
    this.container = scene.add.container(card.x, card.y);
    const window = {
      x: cardWindow.x - card.x,
      y: cardWindow.y - card.y,
      width: cardWindow.width,
      height: cardWindow.height,
    };

    const frame = scene.add.image(0, 0, frameKey);
    const halo = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    for (let ring = 0; ring < HALO_RINGS; ring++) {
      const grow = 1.45 - ring * 0.1;
      halo.fillStyle(COLORS.neon, HALO_RING_ALPHA);
      halo.fillEllipse(0, 0, frame.width * grow, frame.height * grow);
    }
    const frameGlow = scene.add
      .image(0, 0, frameKey)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);
    const name = scene.add
      .text(namePlate.x - card.x, namePlate.y - card.y, nameLabel, arcadeText(NAME_FONT_SIZE))
      .setOrigin(0.5);
    if (name.width > namePlate.width) name.setScale(namePlate.width / name.width);

    this.container.add([
      halo,
      this.drawWindow(window, featured[0]?.palette.body ?? COLORS.neon),
      ...this.createPortraits(window, featured),
      frame,
      frameGlow,
      this.createShine(window),
      name,
    ]);

    scene.tweens.add({
      targets: frameGlow,
      alpha: FRAME_GLOW_ALPHA,
      duration: PULSE_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    scene.tweens.add({
      targets: halo,
      alpha: 0.5,
      scale: 0.95,
      duration: PULSE_MS * 1.3,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** Idle float after the entrance (kept small: the background behind it is a soft fill). */
  startFloat(): void {
    const { y } = VICTORY_LAYOUT.card;
    this.scene.tweens.add({
      targets: this.container,
      y: { from: y, to: y - FLOAT_PX },
      duration: FLOAT_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private drawWindow(window: Rect, glowColor: number): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    const left = window.x - window.width / 2;
    const top = window.y - window.height / 2;
    g.fillStyle(WINDOW_FILL, 1).fillRect(left, top, window.width, window.height);
    g.fillStyle(STRIPE_COLOR, 0.75);
    STRIPES.forEach((length, i) => {
      const y = top + 12 + i * (STRIPE_HEIGHT + STRIPE_GAP);
      if (y + STRIPE_HEIGHT > top + window.height - 6) return;
      g.fillRect(left + 6, y, length, STRIPE_HEIGHT);
      const mirrored = STRIPES[STRIPES.length - 1 - i] ?? length;
      g.fillRect(left + window.width - 6 - mirrored, y, mirrored, STRIPE_HEIGHT);
    });
    g.fillStyle(glowColor, 0.22).fillEllipse(
      window.x,
      window.y + 10,
      window.width * 0.8,
      window.height * 0.85,
    );
    return g;
  }

  /** The real portrait(s), standing on the bottom of the window ("contain" fit). */
  private createPortraits(
    window: Rect,
    featured: readonly FighterConfig[],
  ): Phaser.GameObjects.Container[] {
    const slotWidth = window.width / Math.max(1, featured.length);
    return featured.map((config, i) =>
      createPortrait(
        this.scene,
        window.x - window.width / 2 + slotWidth * (i + 0.5),
        window.y,
        config,
        {
          width: slotWidth - 8,
          height: window.height - 6,
          showName: false,
          framed: false,
          pose: POSES.victory,
          mirrored: featured.length > 1 && i === 1,
        },
      ),
    );
  }

  /** A soft vertical light that crosses the window every few seconds (stays inside it). */
  private createShine(window: Rect): Phaser.GameObjects.Rectangle {
    const left = window.x - window.width / 2 + SHINE_WIDTH;
    const right = window.x + window.width / 2 - SHINE_WIDTH;
    const shine = this.scene.add
      .rectangle(left, window.y, SHINE_WIDTH, window.height - 12, COLORS.white, 0.14)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);
    this.scene.tweens.add({
      targets: shine,
      x: { from: left, to: right },
      alpha: { from: 1, to: 0 },
      duration: SHINE_MS,
      delay: SHINE_EVERY_MS / 2,
      repeatDelay: SHINE_EVERY_MS,
      repeat: -1,
      ease: 'Sine.easeIn',
    });
    return shine;
  }
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
