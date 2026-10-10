import type Phaser from 'phaser';
import { COLORS, bodyText } from './theme';

const PADDING = { x: 14, y: 10 } as const;
const TAIL = 14;
const BORDER = 3;
const RADIUS = 10;
const POP_MS = 220;

export interface SpeechBubbleOptions {
  /** Text wraps at this width. */
  maxWidth: number;
  /** Where the tail points: towards the speaker, below-left or below-right of the bubble. */
  tail: 'left' | 'right';
  fontSize?: number;
  /**
   * What x, y is: the bubble's centre (default) or the tip of its tail, so a bubble of any
   * length still points at the same spot (a speaker's face).
   */
  anchor?: 'center' | 'tail';
}

/**
 * A comic speech bubble (white, ink border, a tail towards the speaker) holding a fighter's
 * line, centred on x, y (or with its tail tip there). Drawn once (not per frame). Pops in with `show`.
 */
export class SpeechBubble {
  readonly container: Phaser.GameObjects.Container;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    { maxWidth, tail, fontSize = 15, anchor = 'center' }: SpeechBubbleOptions,
  ) {
    const label = scene.add
      .text(0, 0, text, {
        ...bodyText(fontSize, COLORS.ink),
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: maxWidth - PADDING.x * 2 },
      })
      .setOrigin(0.5);
    const width = Math.ceil(label.width + PADDING.x * 2);
    const height = Math.ceil(label.height + PADDING.y * 2);
    const g = scene.add.graphics();
    const left = -width / 2;
    const top = -height / 2;
    // Tail first (under the body), then the bordered body.
    const baseX = tail === 'left' ? left + width * 0.22 : left + width * 0.78;
    const tipX = baseX + (tail === 'left' ? -TAIL : TAIL);
    const bottom = top + height;
    g.fillStyle(COLORS.ink, 1).fillTriangle(
      baseX - 10,
      bottom - 2,
      baseX + 10,
      bottom - 2,
      tipX,
      bottom + TAIL + BORDER,
    );
    g.fillStyle(COLORS.ink, 1).fillRoundedRect(
      left - BORDER,
      top - BORDER,
      width + BORDER * 2,
      height + BORDER * 2,
      RADIUS + BORDER,
    );
    g.fillStyle(COLORS.white, 1).fillRoundedRect(left, top, width, height, RADIUS);
    g.fillTriangle(
      baseX - 7,
      bottom - 3,
      baseX + 7,
      bottom - 3,
      tipX + (tail === 'left' ? 2 : -2),
      bottom + TAIL - 1,
    );
    const offset = anchor === 'tail' ? { x: tipX, y: bottom + TAIL + BORDER } : { x: 0, y: 0 };
    this.container = scene.add
      .container(x - offset.x, y - offset.y, [g, label])
      .setScale(0)
      .setAlpha(0);
  }

  /** Pops the bubble in after `delayMs`. */
  show(delayMs = 0): this {
    this.scene.tweens.add({
      targets: this.container,
      scale: 1,
      alpha: 1,
      delay: delayMs,
      duration: POP_MS,
      ease: 'Back.easeOut',
    });
    return this;
  }
}
