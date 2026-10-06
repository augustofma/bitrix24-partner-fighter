import Phaser from 'phaser';
import { COLORS, arcadeText } from './theme';

export interface MenuButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
}

/** Clickable/tappable arcade button. Keyboard activation is handled by the scene. */
export class MenuButton extends Phaser.GameObjects.Container {
  private readonly background: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    onActivate: () => void,
    options: MenuButtonOptions = {},
  ) {
    super(scene, x, y);
    const { width = 260, height = 60, fontSize = 30 } = options;

    this.background = scene.add
      .rectangle(0, 0, width, height, COLORS.panel, 0.95)
      .setStrokeStyle(4, COLORS.gold);
    const text = scene.add.text(0, 0, label, arcadeText(fontSize, COLORS.gold)).setOrigin(0.5);
    this.add([this.background, text]);
    this.setSize(width, height);

    this.setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.setHighlighted(true))
      .on('pointerout', () => this.setHighlighted(false))
      .on('pointerup', onActivate);

    scene.add.existing(this);
  }

  setHighlighted(highlighted: boolean): this {
    this.background.setFillStyle(highlighted ? COLORS.panelLight : COLORS.panel, 0.95);
    this.setScale(highlighted ? 1.05 : 1);
    return this;
  }
}
