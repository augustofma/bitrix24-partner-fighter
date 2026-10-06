import Phaser from 'phaser';
import { COLORS, arcadeText } from '../theme';
import { drawArcadeFrame, type ArcadeFrameStyle } from './arcadeFrame';

export type ArcadeButtonVariant = 'primary' | 'secondary';

export interface ArcadeButtonOptions {
  width: number;
  height: number;
  fontSize: number;
  variant?: ArcadeButtonVariant;
  /** Gentle idle "breathing" to draw the eye (the main call to action). */
  pulse?: boolean;
}

interface VariantLook {
  frame: ArcadeFrameStyle;
  hoverFill: number;
  text: number;
  textStroke: number;
}

const LOOKS: Record<ArcadeButtonVariant, VariantLook> = {
  primary: {
    frame: { fill: COLORS.gold, border: COLORS.orange, inner: COLORS.white },
    hoverFill: 0xffe680,
    text: COLORS.ink,
    textStroke: 0xfff3c4,
  },
  secondary: {
    frame: { fill: COLORS.teal, border: COLORS.tealLight, inner: COLORS.petrol },
    hoverFill: 0x147a85,
    text: COLORS.gold,
    textStroke: COLORS.ink,
  },
};

const PRESS_OFFSET = 2;
const HOVER_SCALE = 1.05;
const PULSE_SCALE = 1.035;
const PULSE_MS = 620;

/** Chunky pixel-art button with hover, press and (optional) idle pulse feedback. */
export class ArcadeButton extends Phaser.GameObjects.Container {
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly look: VariantLook;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    onActivate: () => void,
    private readonly options: ArcadeButtonOptions,
  ) {
    super(scene, x, y);
    this.look = LOOKS[options.variant ?? 'primary'];
    this.frame = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, text, arcadeText(options.fontSize, this.look.text, this.look.textStroke))
      .setOrigin(0.5);
    this.add([this.frame, this.label]);
    this.setSize(options.width, options.height);
    this.draw(false);

    this.setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.setHighlighted(true))
      .on('pointerout', () => this.setHighlighted(false))
      .on('pointerdown', () => this.label.setY(PRESS_OFFSET))
      .on('pointerup', () => {
        this.label.setY(0);
        onActivate();
      });
    scene.add.existing(this);

    if (options.pulse) {
      scene.tweens.add({
        targets: this,
        scale: PULSE_SCALE,
        duration: PULSE_MS,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /** Hover (pointer) or keyboard focus. */
  setHighlighted(highlighted: boolean): this {
    this.draw(highlighted);
    if (!this.options.pulse) this.setScale(highlighted ? HOVER_SCALE : 1);
    if (!highlighted) this.label.setY(0);
    return this;
  }

  /** Quick "pressed" flash, e.g. when confirmed from the keyboard. */
  flash(): void {
    this.draw(true);
    this.label.setY(PRESS_OFFSET);
  }

  private draw(highlighted: boolean): void {
    const { width, height } = this.options;
    const fill = highlighted ? this.look.hoverFill : this.look.frame.fill;
    this.frame.clear();
    drawArcadeFrame(this.frame, -width / 2, -height / 2, width, height, {
      ...this.look.frame,
      fill,
    });
  }
}
