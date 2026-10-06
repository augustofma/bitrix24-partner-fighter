import type Phaser from 'phaser';
import { SPECIAL_METER } from '../config/special';
import { STRINGS } from '../config/strings';
import type { ReadonlyFighter } from '../core/fighter/ReadonlyFighter';
import { COLORS, DEPTH, arcadeText } from './theme';

const HEIGHT = 9;
const READY_COLOR = 0x43e6a0;

export class SpecialMeterBar {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly width: number,
    private readonly mirrored: boolean,
  ) {
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.hud);
    this.label = scene.add
      .text(mirrored ? x + width : x, y + HEIGHT + 2, '', arcadeText(10))
      .setOrigin(mirrored ? 1 : 0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
  }

  update(fighter: ReadonlyFighter): void {
    const ready = fighter.config.specials.some((move) => fighter.specialMeter >= move.meterCost);
    const color = ready ? READY_COLOR : COLORS.cyan;
    const fillWidth = (this.width * fighter.specialMeter) / SPECIAL_METER.max;
    this.graphics.clear().fillStyle(COLORS.panel).fillRect(this.x, this.y, this.width, HEIGHT);
    this.graphics
      .fillStyle(color)
      .fillRect(
        this.mirrored ? this.x + this.width - fillWidth : this.x,
        this.y,
        fillWidth,
        HEIGHT,
      );
    this.graphics
      .lineStyle(ready ? 2 : 1, color, ready ? 1 : 0.5)
      .strokeRect(this.x, this.y, this.width, HEIGHT);
    this.label.setText(
      `${STRINGS.specialMeter(fighter.specialMeter)}${ready ? ` · ${STRINGS.specialReady}` : ''}`,
    );
  }
}
