import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import { STRINGS } from '../config/strings';
import {
  DIRECTION_ACTIONS,
  JumpLatch,
  directionInputs,
  joystickFrame,
  type DirectionAction,
  type JoystickDirection,
} from '../input/joystick';
import type { InputAction, InputReadContext, InputSource, InputState } from '../types/input';
import { specialButtonStyle } from './hud/specialReady';
import { COLORS, DEPTH, arcadeText } from './theme';
import { TouchCircle, ringTexture } from './TouchCircle';
import { VirtualJoystick } from './VirtualJoystick';

interface ButtonLayout {
  action: InputAction;
  label: string;
  x: number;
  y: number;
}

interface TouchButton {
  /** Pointer ids currently holding this button (multi-touch). */
  pointers: Set<number>;
  circle: TouchCircle;
}

const RADIUS = 36;
/** The touch area is larger than the drawn circle (fingers are imprecise). */
const HIT_PADDING = 10;
const IDLE_ALPHA = 0.3;
const PRESSED_ALPHA = 0.7;
/** SPECIAL READY on the ESP button: a ring just outside it that breathes (kept small). */
const READY_RING_GAP = 5;
const READY_RING_SCALE = 1.06;
const READY_PULSE_MS = 800;

/** Joystick center: bottom-left, clear of the HUD and of the action buttons. */
const STICK_X = 126;
const STICK_Y = GAME_HEIGHT - 96;
const ACTION_X = GAME_WIDTH - 150;
const ACTION_Y = GAME_HEIGHT - 100;

/** Action buttons on the right; positions in logical (960x540) pixels. */
const LAYOUT: readonly ButtonLayout[] = [
  { action: 'punch', label: STRINGS.touchPunch, x: ACTION_X - 80, y: ACTION_Y + 20 },
  { action: 'kick', label: STRINGS.touchKick, x: ACTION_X + 10, y: ACTION_Y - 40 },
  { action: 'block', label: STRINGS.touchBlock, x: ACTION_X + 80, y: ACTION_Y + 40 },
  { action: 'special', label: STRINGS.touchSpecial, x: ACTION_X + 80, y: ACTION_Y - 140 },
];

/**
 * On-screen multi-touch controls: a virtual joystick on the left (8 directions, mapped to the
 * same up/down/left/right the arrow keys hold) and the action buttons on the right. Acts as an
 * InputSource, merged with the keyboard by PlayerController. Taps or flicks shorter than a
 * frame are latched so they are never lost. Each pointer is tracked independently.
 */
export class TouchControls implements InputSource {
  private readonly buttons = new Map<InputAction, TouchButton>();
  private readonly latched = new Set<InputAction>();
  private readonly joystick: VirtualJoystick;
  private readonly jumpLatch = new JumpLatch();
  private specialReady = false;
  private readyRing: Phaser.GameObjects.Image | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    for (const layout of LAYOUT) this.createButton(layout);
    this.joystick = new VirtualJoystick(scene, STICK_X, STICK_Y, (direction) =>
      this.latchDirection(direction),
    );

    const releasePointer = (pointer: Phaser.Input.Pointer) => this.release(pointer.id);
    const releaseAll = () => this.release(null);
    scene.input.on('pointerup', releasePointer);
    scene.input.on('pointerupoutside', releasePointer);
    scene.game.events.on(Phaser.Core.Events.BLUR, releaseAll);
    scene.events.once('shutdown', () => {
      scene.input.off('pointerup', releasePointer);
      scene.input.off('pointerupoutside', releasePointer);
      scene.game.events.off(Phaser.Core.Events.BLUR, releaseAll);
    });
  }

  read(context?: InputReadContext): Partial<InputState> {
    const state: Partial<InputState> = {};
    for (const [action, button] of this.buttons) {
      state[action] = button.pointers.size > 0 || this.latched.has(action);
    }
    const latchedDirections = new Set<DirectionAction>(
      DIRECTION_ACTIONS.filter((action) => this.latched.has(action)),
    );
    Object.assign(
      state,
      joystickFrame(
        this.joystick.direction,
        latchedDirections,
        this.jumpLatch,
        context?.selfAirborne ?? false,
      ),
    );
    this.latched.clear();
    return state;
  }

  reset(): void {
    this.jumpLatch.reset();
  }

  /** Releases every button and the stick (the fight is being paused). */
  releaseAll(): void {
    this.release(null);
    this.joystick.release();
    this.latched.clear();
  }

  /** Lights the ESP button while the player's special is available. Cheap to call per frame. */
  setSpecialReady(ready: boolean): void {
    if (ready === this.specialReady) return;
    this.specialReady = ready;
    const button = this.buttons.get('special');
    if (!button) return;
    const style = specialButtonStyle(ready);
    button.circle.setStrokeStyle(style.strokeWidth, style.strokeColor, style.strokeAlpha);
    const ring = this.ensureReadyRing(button.circle);
    this.scene.tweens.killTweensOf(ring);
    ring
      .setVisible(style.glow)
      .setScale(1)
      .setAlpha(style.glow ? 0.9 : 0);
    if (style.glow) {
      this.scene.tweens.add({
        targets: ring,
        scale: READY_RING_SCALE,
        alpha: 0.45,
        duration: READY_PULSE_MS,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  get isSpecialReady(): boolean {
    return this.specialReady;
  }

  private ensureReadyRing(circle: TouchCircle): Phaser.GameObjects.Image {
    if (!this.readyRing) {
      this.readyRing = this.scene.add
        .image(circle.x, circle.y, ringTexture(this.scene, RADIUS + READY_RING_GAP, 3))
        .setTint(COLORS.gold)
        .setScrollFactor(0)
        .setDepth(DEPTH.touch)
        .setVisible(false);
    }
    return this.readyRing;
  }

  /** A direction entered between two frames still counts on the next one. */
  private latchDirection(direction: JoystickDirection | null): void {
    const inputs = directionInputs(direction);
    for (const action of DIRECTION_ACTIONS) {
      if (inputs[action]) this.latched.add(action);
    }
  }

  private createButton({ action, label, x, y }: ButtonLayout): void {
    const circle = new TouchCircle(this.scene, x, y, RADIUS)
      .setFillStyle(COLORS.ink, IDLE_ALPHA)
      .setStrokeStyle(3, COLORS.white, 0.6);
    const text = this.scene.add
      .text(x, y, label, arcadeText(label.length > 1 ? 13 : 24, COLORS.white))
      .setOrigin(0.5)
      .setAlpha(0.85);
    for (const object of [circle, text]) object.setScrollFactor(0).setDepth(DEPTH.touch);

    const button: TouchButton = { pointers: new Set(), circle };
    this.buttons.set(action, button);

    const hit = circle.fill;
    const hitArea = new Phaser.Geom.Circle(hit.width / 2, hit.height / 2, RADIUS + HIT_PADDING);
    hit.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
    hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      button.pointers.add(pointer.id);
      this.latched.add(action);
      this.refresh(button);
    });
    // Finger lifted, or slid off the button.
    for (const event of ['pointerup', 'pointerout']) {
      hit.on(event, (pointer: Phaser.Input.Pointer) => {
        button.pointers.delete(pointer.id);
        this.refresh(button);
      });
    }
  }

  /** Releases one pointer from every button (or all pointers when null). */
  private release(pointerId: number | null): void {
    for (const button of this.buttons.values()) {
      if (pointerId === null) button.pointers.clear();
      else button.pointers.delete(pointerId);
      this.refresh(button);
    }
  }

  private refresh(button: TouchButton): void {
    button.circle.setFillStyle(COLORS.ink, button.pointers.size > 0 ? PRESSED_ALPHA : IDLE_ALPHA);
  }
}
