import type Phaser from 'phaser';
import { ArcadeButton } from './select/ArcadeButton';

export interface ModeMenuItem {
  label: string;
  onSelect: () => void;
}

const BUTTON = { width: 230, height: 58, fontSize: 24 } as const;
const GAP = 24;
const POP_MS = 160;

/**
 * Row of game-mode buttons (HISTÓRIA / LUTA RÁPIDA) that opens in place of the JOGAR button.
 * Touch or click picks directly; the scene drives keyboard focus through move / confirm.
 */
export class ModeMenu {
  private readonly buttons: ArcadeButton[];
  private focus = 0;
  private opened = false;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly items: readonly ModeMenuItem[],
  ) {
    const span = items.length * BUTTON.width + (items.length - 1) * GAP;
    this.buttons = items.map((item, i) =>
      new ArcadeButton(
        scene,
        x - span / 2 + BUTTON.width / 2 + i * (BUTTON.width + GAP),
        y,
        item.label,
        () => item.onSelect(),
        BUTTON,
      )
        .setVisible(false)
        .setAlpha(0),
    );
  }

  get isOpen(): boolean {
    return this.opened;
  }

  open(): void {
    this.opened = true;
    this.buttons.forEach((button, i) => {
      button.setVisible(true).setScale(0.8);
      this.scene.tweens.add({
        targets: button,
        alpha: 1,
        scale: 1,
        duration: POP_MS,
        delay: i * 60,
        ease: 'Back.easeOut',
      });
    });
    this.setFocus(0);
  }

  close(): void {
    this.opened = false;
    for (const button of this.buttons) button.setVisible(false).setAlpha(0);
  }

  /** Keyboard: moves the highlighted option (wraps around). */
  move(step: number): void {
    const count = this.buttons.length;
    this.setFocus((this.focus + step + count) % count);
  }

  confirm(): void {
    this.buttons[this.focus]?.flash();
    this.items[this.focus]?.onSelect();
  }

  private setFocus(index: number): void {
    this.focus = index;
    this.buttons.forEach((button, i) => button.setHighlighted(i === index));
  }
}
