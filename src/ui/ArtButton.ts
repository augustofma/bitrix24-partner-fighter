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
  /**
   * Glow strength while idle (0..1, default 0: no glow until hovered). With it, the glow keeps
   * breathing softly at this level and rises to the hover level under the pointer.
   */
  idleGlow?: number;
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
  private readonly idleGlow: number;
  private hovered = false;

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
    this.idleGlow = options.idleGlow ?? 0;
    // One breathing counter (0..1) drives the glow at the idle or the hover level.
    this.glowPulse = scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: GLOW_MS,
      yoyo: true,
      repeat: -1,
      paused: this.idleGlow === 0,
      onUpdate: (tween) => {
        const level = this.hovered ? GLOW_ALPHA : this.idleGlow * GLOW_ALPHA;
        this.glow.setAlpha((tween.getValue() ?? 0) * level);
      },
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
    this.hovered = hover;
    this.scaleTo(hover ? HOVER_SCALE : 1);
    if (hover || this.idleGlow > 0) this.glowPulse.resume();
    else {
      this.glowPulse.pause();
      this.glow.setAlpha(0);
    }
  }

  private scaleTo(scale: number): void {
    this.scene.tweens.add({ targets: [this.image, this.glow], scale, duration: SCALE_MS });
  }
}
