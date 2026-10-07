import Phaser from 'phaser';
import { JoystickTracker, type JoystickDirection } from '../input/joystick';
import { COLORS, DEPTH } from './theme';

const BASE_RADIUS = 62;
const KNOB_RADIUS = 26;
/** Full deflection distance; the knob is drawn at most this far from the center. */
const TRAVEL_RADIUS = 46;
/** Touches that start this close to the center grab the stick (forgiving on glass). */
const ACTIVATION_RADIUS = 104;
const IDLE_BASE_ALPHA = 0.26;
const ACTIVE_BASE_ALPHA = 0.38;
const IDLE_RING_ALPHA = 0.45;
const ACTIVE_RING_ALPHA = 0.95;
const IDLE_KNOB_ALPHA = 0.45;
const ACTIVE_KNOB_ALPHA = 0.8;
const RETURN_MS = 110;

/**
 * Virtual stick drawn on the left of the screen: a translucent base and a knob that follows
 * the owning finger (clamped to the base). Purely a device: it reports a direction, the touch
 * input turns it into the usual digital inputs. Every pointer is handled independently.
 */
export class VirtualJoystick {
  private readonly tracker: JoystickTracker;
  private readonly base: Phaser.GameObjects.Arc;
  private readonly knob: Phaser.GameObjects.Arc;
  private returnTween: Phaser.Tweens.Tween | null = null;
  private lastDirection: JoystickDirection | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    /** Called as soon as the direction changes (so even a sub-frame flick is latched). */
    private readonly onDirectionChange: (direction: JoystickDirection | null) => void,
  ) {
    this.tracker = new JoystickTracker(x, y, TRAVEL_RADIUS, ACTIVATION_RADIUS);
    this.base = scene.add.circle(x, y, BASE_RADIUS, COLORS.navyDeep, IDLE_BASE_ALPHA);
    this.knob = scene.add.circle(x, y, KNOB_RADIUS, COLORS.neon, IDLE_KNOB_ALPHA);
    for (const object of [this.base, this.knob]) object.setScrollFactor(0).setDepth(DEPTH.touch);
    this.refresh();

    const down = (pointer: Phaser.Input.Pointer) => {
      if (this.tracker.pointerDown(pointer.id, pointer.x, pointer.y)) this.update();
    };
    const move = (pointer: Phaser.Input.Pointer) => {
      // Keeps steering even after the finger slides outside the base.
      this.tracker.pointerMove(pointer.id, pointer.x, pointer.y);
      if (this.tracker.active) this.update();
    };
    const up = (pointer: Phaser.Input.Pointer) => {
      if (this.tracker.pointerUp(pointer.id)) this.update();
    };
    const releaseAll = () => {
      this.tracker.release();
      this.update();
    };
    const input = scene.input;
    input.on('pointerdown', down);
    input.on('pointermove', move);
    input.on('pointerup', up);
    input.on('pointerupoutside', up);
    scene.game.events.on(Phaser.Core.Events.BLUR, releaseAll);
    scene.events.once('shutdown', () => {
      input.off('pointerdown', down);
      input.off('pointermove', move);
      input.off('pointerup', up);
      input.off('pointerupoutside', up);
      scene.game.events.off(Phaser.Core.Events.BLUR, releaseAll);
    });
  }

  get direction(): JoystickDirection | null {
    return this.tracker.direction;
  }

  private update(): void {
    const direction = this.tracker.direction;
    if (direction !== this.lastDirection) {
      this.lastDirection = direction;
      this.onDirectionChange(direction);
    }
    this.returnTween?.stop();
    this.returnTween = null;
    if (this.tracker.active) {
      const { x, y } = this.tracker.knobOffset;
      this.knob.setPosition(this.x + x, this.y + y);
    } else {
      // Inputs are already released; only the knob glides home.
      this.returnTween = this.scene.tweens.add({
        targets: this.knob,
        x: this.x,
        y: this.y,
        duration: RETURN_MS,
        ease: 'Quad.easeOut',
      });
    }
    this.refresh();
  }

  /** Discreet feedback: brighter ring and knob while a direction is held. */
  private refresh(): void {
    const engaged = this.tracker.direction !== null;
    this.base
      .setFillStyle(COLORS.navyDeep, engaged ? ACTIVE_BASE_ALPHA : IDLE_BASE_ALPHA)
      .setStrokeStyle(3, COLORS.neon, engaged ? ACTIVE_RING_ALPHA : IDLE_RING_ALPHA);
    this.knob
      .setFillStyle(COLORS.neon, engaged ? ACTIVE_KNOB_ALPHA : IDLE_KNOB_ALPHA)
      .setStrokeStyle(2, COLORS.white, engaged ? 0.9 : 0.6);
  }
}
