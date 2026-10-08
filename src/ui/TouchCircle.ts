import type Phaser from 'phaser';

/** Margin around the drawn circle in its texture, so antialiased edges are not clipped. */
const PAD = 2;

/** A white filled disc of this radius, drawn once and shared (tinted per use). */
export function discTexture(scene: Phaser.Scene, radius: number): string {
  return cachedTexture(scene, `touch:disc:${radius}`, radius, (g, c) =>
    g.fillStyle(0xffffff, 1).fillCircle(c, c, radius),
  );
}

/** A white ring (outline) of this radius and line width, drawn once and shared. */
export function ringTexture(scene: Phaser.Scene, radius: number, width: number): string {
  return cachedTexture(scene, `touch:ring:${radius}:${width}`, radius + width, (g, c) =>
    g.lineStyle(width, 0xffffff, 1).strokeCircle(c, c, radius),
  );
}

function cachedTexture(
  scene: Phaser.Scene,
  key: string,
  extent: number,
  draw: (g: Phaser.GameObjects.Graphics, center: number) => void,
): string {
  if (!scene.textures.exists(key)) {
    const size = Math.ceil(extent + PAD) * 2;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    draw(g, size / 2);
    g.generateTexture(key, size, size);
    g.destroy();
  }
  return key;
}

/**
 * A translucent circle with an outline, as two tinted images of shared textures. Same look as a
 * filled `Arc` with a stroke, but a filled Arc is re-triangulated (earcut) on every frame it
 * renders, which costs measurable CPU on slow phones for controls that are always on screen;
 * images are plain quads. The API mirrors the Arc calls the touch controls used.
 */
export class TouchCircle {
  readonly fill: Phaser.GameObjects.Image;
  readonly ring: Phaser.GameObjects.Image;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly radius: number,
  ) {
    this.fill = scene.add.image(x, y, discTexture(scene, radius));
    this.ring = scene.add.image(x, y, ringTexture(scene, radius, 1)).setAlpha(0);
  }

  get x(): number {
    return this.fill.x;
  }

  get y(): number {
    return this.fill.y;
  }

  setFillStyle(color: number, alpha: number): this {
    this.fill.setTint(color).setAlpha(alpha);
    return this;
  }

  setStrokeStyle(width: number, color: number, alpha: number): this {
    this.ring
      .setTexture(ringTexture(this.scene, this.radius, width))
      .setTint(color)
      .setAlpha(alpha);
    return this;
  }

  setPosition(x: number, y: number): this {
    this.fill.setPosition(x, y);
    this.ring.setPosition(x, y);
    return this;
  }

  setScrollFactor(factor: number): this {
    this.fill.setScrollFactor(factor);
    this.ring.setScrollFactor(factor);
    return this;
  }

  setDepth(depth: number): this {
    this.fill.setDepth(depth);
    this.ring.setDepth(depth);
    return this;
  }
}
