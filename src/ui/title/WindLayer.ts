import type Phaser from 'phaser';
import {
  STRIP_PX,
  stripOffset,
  type WindAnchor,
  type WindStrips,
  type WindStyle,
} from './windMotion';

export interface WindLayerConfig {
  textureKey: string;
  /** Top-left corner of the part in game pixels (where it sits in the art). */
  x: number;
  y: number;
  anchor: WindAnchor;
  strips: WindStrips;
  style: WindStyle;
}

/**
 * A wind-moved part of the title art (hair, collar, hem...): its texture drawn as thin strips
 * (crops of the same texture, created once), each shifted a little by the wind every frame.
 * At offset 0 it is pixel-identical to the art. Presentation only; nothing is created after
 * construction.
 */
export class WindLayer {
  private readonly strips: Phaser.GameObjects.Image[] = [];

  constructor(
    scene: Phaser.Scene,
    private readonly config: WindLayerConfig,
    depth: number,
  ) {
    const source = scene.textures.get(config.textureKey).getSourceImage();
    const rows = config.strips === 'rows';
    const length = rows ? source.height : source.width;
    for (let start = 0; start < length; start += STRIP_PX) {
      const size = Math.min(STRIP_PX, length - start);
      this.strips.push(
        scene.add
          .image(config.x, config.y, config.textureKey)
          .setOrigin(0)
          .setDepth(depth)
          .setCrop(
            rows ? 0 : start,
            rows ? start : 0,
            rows ? source.width : size,
            rows ? size : source.height,
          ),
      );
    }
  }

  get stripCount(): number {
    return this.strips.length;
  }

  /** All the strips, e.g. for entrance tweens (alpha). */
  get objects(): readonly Phaser.GameObjects.Image[] {
    return this.strips;
  }

  update(timeSeconds: number): void {
    const { x, y, anchor, strips, style } = this.config;
    const count = this.strips.length;
    this.strips.forEach((strip, i) => {
      const offset = stripOffset(timeSeconds, i, count, anchor, style);
      if (strips === 'rows') strip.setPosition(x + offset, y);
      else strip.setPosition(x, y + offset);
    });
  }

  destroy(): void {
    for (const strip of this.strips) strip.destroy();
    this.strips.length = 0;
  }
}
