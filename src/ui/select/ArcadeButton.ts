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
  /** Fill and upper band while hovered / focused. */
  hoverFill: number;
  hoverHighlight: number;
  /** Halo shown behind the button while hovered / focused. */
  glow: number;
  text: number;
  textStroke: number;
}

const LOOKS: Record<ArcadeButtonVariant, VariantLook> = {
  // Same language as the title screen's JOGAR: two-tone violet, gold frame, gold lettering.
  primary: {
    frame: { fill: COLORS.violet, highlight: 0x6a22e8, border: COLORS.gold, inner: COLORS.orange },
    hoverFill: 0x5d1fe6,
    hoverHighlight: 0x8a44ff,
    glow: COLORS.gold,
    text: COLORS.gold,
    textStroke: COLORS.ink,
  },
  secondary: {
    frame: { fill: COLORS.indigo, highlight: 0x1f2a9a, border: COLORS.neon, inner: COLORS.royal },
    hoverFill: 0x2318a0,
    hoverHighlight: 0x2d3fc4,
    glow: COLORS.neon,
    text: COLORS.white,
    textStroke: COLORS.ink,
  },
};
/** Halo size beyond the button on each side, and its strength while hovered. */
const GLOW_PAD = 7;
const GLOW_ALPHA = 0.32;
const GLOW_MS = 140;

const PRESS_OFFSET = 2;
const HOVER_SCALE = 1.05;
const PULSE_SCALE = 1.035;
const PULSE_MS = 620;

/** Chunky pixel-art button with hover, press and (optional) idle pulse feedback. */
export class ArcadeButton extends Phaser.GameObjects.Container {
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Rectangle;
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
    this.glow = scene.add
      .rectangle(0, 0, options.width + GLOW_PAD * 2, options.height + GLOW_PAD * 2, this.look.glow)
      .setAlpha(0);
    this.frame = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, text, arcadeText(options.fontSize, this.look.text, this.look.textStroke))
      .setOrigin(0.5);
    this.add([this.glow, this.frame, this.label]);
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
    this.scene.tweens.add({
      targets: this.glow,
      alpha: highlighted ? GLOW_ALPHA : 0,
      duration: GLOW_MS,
    });
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
    const { frame, hoverFill, hoverHighlight } = this.look;
    this.frame.clear();
    drawArcadeFrame(this.frame, -width / 2, -height / 2, width, height, {
      ...frame,
      ...(highlighted ? { fill: hoverFill, highlight: hoverHighlight } : {}),
    });
  }
}
