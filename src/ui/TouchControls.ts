import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import { STRINGS } from '../config/strings';
import type { InputAction, InputSource, InputState } from '../types/input';
import { COLORS, DEPTH, arcadeText } from './theme';

interface ButtonLayout {
  action: InputAction;
  label: string;
  x: number;
  y: number;
}

interface TouchButton {
  /** Pointer ids currently holding this button (multi-touch). */
  pointers: Set<number>;
  circle: Phaser.GameObjects.Arc;
}

const RADIUS = 36;
/** The touch area is larger than the drawn circle (fingers are imprecise). */
const HIT_PADDING = 10;
const IDLE_ALPHA = 0.3;
const PRESSED_ALPHA = 0.7;

const PAD_X = 132;
const PAD_Y = GAME_HEIGHT - 104;
const ACTION_X = GAME_WIDTH - 150;
const ACTION_Y = GAME_HEIGHT - 100;

/** Left: directions. Right: actions. Positions in logical (960x540) pixels. */
const LAYOUT: readonly ButtonLayout[] = [
  { action: 'left', label: '◀', x: PAD_X - 70, y: PAD_Y },
  { action: 'right', label: '▶', x: PAD_X + 70, y: PAD_Y },
  { action: 'up', label: '▲', x: PAD_X, y: PAD_Y - 62 },
  { action: 'down', label: '▼', x: PAD_X, y: PAD_Y + 62 },
  { action: 'punch', label: STRINGS.touchPunch, x: ACTION_X - 80, y: ACTION_Y + 20 },
  { action: 'kick', label: STRINGS.touchKick, x: ACTION_X + 10, y: ACTION_Y - 40 },
  { action: 'block', label: STRINGS.touchBlock, x: ACTION_X + 80, y: ACTION_Y + 40 },
];

/**
 * On-screen multi-touch buttons. Acts as an InputSource, merged with the keyboard
 * by PlayerController. A tap shorter than a frame is latched so it is never lost.
 */
export class TouchControls implements InputSource {
  private readonly buttons = new Map<InputAction, TouchButton>();
  private readonly latched = new Set<InputAction>();

  constructor(private readonly scene: Phaser.Scene) {
    for (const layout of LAYOUT) this.createButton(layout);

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

  read(): Partial<InputState> {
    const state: Partial<InputState> = {};
    for (const [action, button] of this.buttons) {
      state[action] = button.pointers.size > 0 || this.latched.has(action);
    }
    this.latched.clear();
    return state;
  }

  private createButton({ action, label, x, y }: ButtonLayout): void {
    const circle = this.scene.add
      .circle(x, y, RADIUS, COLORS.ink, IDLE_ALPHA)
      .setStrokeStyle(3, COLORS.white, 0.6);
    const text = this.scene.add
      .text(x, y, label, arcadeText(label.length > 1 ? 13 : 24, COLORS.white))
      .setOrigin(0.5)
      .setAlpha(0.85);
    for (const object of [circle, text]) object.setScrollFactor(0).setDepth(DEPTH.touch);

    const button: TouchButton = { pointers: new Set(), circle };
    this.buttons.set(action, button);

    const hitArea = new Phaser.Geom.Circle(RADIUS, RADIUS, RADIUS + HIT_PADDING);
    circle.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
    circle.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      button.pointers.add(pointer.id);
      this.latched.add(action);
      this.refresh(button);
    });
    // Finger lifted, or slid off the button.
    for (const event of ['pointerup', 'pointerout']) {
      circle.on(event, (pointer: Phaser.Input.Pointer) => {
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
