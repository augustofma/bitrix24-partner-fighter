import type Phaser from 'phaser';
import { SPECIAL_METER } from '../config/special';
import { STRINGS } from '../config/strings';
import type { ReadonlyFighter } from '../core/fighter/ReadonlyFighter';
import { SpecialReadyEffect, type BarRect } from './hud/SpecialReadyEffect';
import { SpecialReadyTracker, isSpecialReady } from './hud/specialReady';
import { COLORS, DEPTH, arcadeText } from './theme';

const HEIGHT = 9;
const FILL_COLOR = COLORS.cyan;
/** READY: brighter neon fill with a white top highlight and a gold frame. */
const READY_FILL_COLOR = COLORS.neon;
const READY_FRAME_COLOR = COLORS.gold;
const HIGHLIGHT_HEIGHT = 2;

/**
 * One fighter's special meter. READY follows the fighter's cheapest configured special
 * (see hud/specialReady.ts), never a full bar; fighters without specials never get it.
 */
export class SpecialMeterBar {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly effect: SpecialReadyEffect;
  private readonly tracker = new SpecialReadyTracker();
  private lastMeter = -1;

  constructor(
    scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly width: number,
    private readonly mirrored: boolean,
    /** Called once each time the meter crosses into SPECIAL READY (e.g. for its sound). */
    private readonly onReady: () => void = () => {},
  ) {
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.hud);
    this.label = scene.add
      .text(mirrored ? x + width : x, y + HEIGHT + 2, '', arcadeText(10))
      .setOrigin(mirrored ? 1 : 0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
    this.effect = new SpecialReadyEffect(scene, { x, y, width, height: HEIGHT }, mirrored);
  }

  get ready(): boolean {
    return this.tracker.ready;
  }

  update(fighter: ReadonlyFighter): void {
    const change = this.tracker.update(isSpecialReady(fighter.config, fighter.specialMeter));
    if (change === 'ready') {
      this.effect.burst();
      this.onReady();
    } else if (change === 'discharged') this.effect.discharge();
    const fill = this.fillRect(fighter.specialMeter);
    this.effect.update(fill);
    if (fighter.specialMeter === this.lastMeter && change === null) return;
    this.lastMeter = fighter.specialMeter;
    this.draw(fill, this.tracker.ready);
    this.label.setText(
      `${STRINGS.specialMeter(fighter.specialMeter)}${this.tracker.ready ? ` · ${STRINGS.specialReady}` : ''}`,
    );
    this.label.setColor(this.tracker.ready ? '#ffd23f' : '#ffffff');
  }

  private fillRect(meter: number): BarRect {
    const width = (this.width * meter) / SPECIAL_METER.max;
    return {
      x: this.mirrored ? this.x + this.width - width : this.x,
      y: this.y,
      width,
      height: HEIGHT,
    };
  }

  private draw(fill: BarRect, ready: boolean): void {
    const g = this.graphics.clear();
    g.fillStyle(COLORS.panel).fillRect(this.x, this.y, this.width, HEIGHT);
    g.fillStyle(ready ? READY_FILL_COLOR : FILL_COLOR).fillRect(fill.x, fill.y, fill.width, HEIGHT);
    if (ready) {
      g.fillStyle(COLORS.white, 0.55).fillRect(fill.x, fill.y, fill.width, HIGHLIGHT_HEIGHT);
    }
    g.lineStyle(ready ? 2 : 1, ready ? READY_FRAME_COLOR : FILL_COLOR, ready ? 1 : 0.5);
    g.strokeRect(this.x, this.y, this.width, HEIGHT);
  }
}
