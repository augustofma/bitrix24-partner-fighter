import Phaser from 'phaser';

const HOVER_SCALE = 1.03;
const PRESS_SCALE = 0.97;
const SCALE_MS = 90;
/** Extra touch area around the visible button (game px on each side). */
const DEFAULT_HIT_PADDING = 16;
const GLOW_ALPHA = 0.22;
const GLOW_MS = 520;

export interface ArtButtonOptions {
  /** Extra hit area on each side (comfortable touch target on phones). */
  hitPadding?: number;
}

/**
 * A button whose look is a piece of approved art (an image layer): hover grows it to 1.03 and
 * lights a soft additive glow, pressing shrinks it to 0.97, releasing on it activates. The
 * container itself is free for entrance animations (alpha, position, scale).
 */
export class ArtButton extends Phaser.GameObjects.Container {
  private readonly image: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly glowPulse: Phaser.Tweens.Tween;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    onActivate: () => void,
    options: ArtButtonOptions = {},
  ) {
    super(scene, x, y);
    this.image = scene.add.image(0, 0, textureKey);
    this.glow = scene.add.image(0, 0, textureKey).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.add([this.image, this.glow]);
    this.glowPulse = scene.tweens.add({
      targets: this.glow,
      alpha: GLOW_ALPHA,
      duration: GLOW_MS,
      yoyo: true,
      repeat: -1,
      paused: true,
    });

    // Hit area in the image's local (unscaled) space, a bit larger than what is drawn.
    const pad = options.hitPadding ?? DEFAULT_HIT_PADDING;
    const hitArea = new Phaser.Geom.Rectangle(
      -pad,
      -pad,
      this.image.width + pad * 2,
      this.image.height + pad * 2,
    );
    this.image
      .setInteractive({
        hitArea,
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      })
      .on('pointerover', () => this.setHover(true))
      .on('pointerout', () => this.setHover(false))
      .on('pointerdown', () => this.press())
      .on('pointerup', () => {
        this.scaleTo(HOVER_SCALE);
        onActivate();
      });
    scene.add.existing(this);
  }

  /** The "pressed" look, also used for keyboard confirms. */
  press(): void {
    this.scaleTo(PRESS_SCALE);
  }

  private setHover(hover: boolean): void {
    this.scaleTo(hover ? HOVER_SCALE : 1);
    if (hover) this.glowPulse.resume();
    else {
      this.glowPulse.pause();
      this.glow.setAlpha(0);
    }
  }

  private scaleTo(scale: number): void {
    this.scene.tweens.add({ targets: [this.image, this.glow], scale, duration: SCALE_MS });
  }
}
