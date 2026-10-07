import type Phaser from 'phaser';
import { STRINGS } from '../../config/strings';
import { createPortrait } from '../../render/PortraitView';
import type { FighterConfig } from '../../types/fighter';
import { COLORS, arcadeText } from '../theme';
import { drawArcadeFrame } from './arcadeFrame';
import { SELECT_LAYOUT } from './selectLayout';

const { cardWidth: WIDTH, cardHeight: HEIGHT } = SELECT_LAYOUT.grid;
const NAME_PLATE_HEIGHT = 28;
const ART_INSET = 7;
const GLOW_PAD = 7;
const SELECTED_SCALE = 1.05;
const SELECT_TWEEN_MS = 120;
const GLOW_PULSE_MS = 520;
const DIMMED_ALPHA = 0.82;
const LOCKED_ALPHA = 0.55;
const LOCKED_BORDER = 0x2b2f78;

/**
 * One square of the roster grid: portrait over a palette-tinted backdrop, a name plate and,
 * when selected, a gold border, pulsing glow and the P1 marker. `config` null draws an empty
 * "coming soon" slot that only completes the grid.
 */
export class RosterCard {
  readonly container: Phaser.GameObjects.Container;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Rectangle;
  private readonly marker: Phaser.GameObjects.Container;
  private selected = false;
  private readonly selectable: boolean;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    readonly config: FighterConfig | null,
    onPress: () => void,
    /** Whether this mode lets the player pick it, and the tag shown when it does not. */
    options: { selectable?: boolean; lockedTag?: string } = {},
  ) {
    this.selectable = options.selectable ?? config?.selectable ?? false;
    this.container = scene.add.container(x, y);
    this.glow = scene.add
      .rectangle(0, 0, WIDTH + GLOW_PAD * 2, HEIGHT + GLOW_PAD * 2, COLORS.neon, 0.6)
      .setVisible(false);
    this.frame = scene.add.graphics();
    this.container.add([this.glow, this.frame]);
    this.drawFrame();

    if (config) this.addFighter(config, options.lockedTag ?? STRINGS.cpuOnly);
    else this.addEmptySlot();

    this.marker = this.createMarker();
    this.container.add(this.marker);
    scene.tweens.add({
      targets: this.glow,
      alpha: 0.08,
      duration: GLOW_PULSE_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    if (config && this.selectable) {
      this.container
        .setSize(WIDTH, HEIGHT)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', onPress);
    }
    this.setSelected(false);
  }

  setSelected(selected: boolean): void {
    const changed = selected !== this.selected;
    this.selected = selected;
    this.drawFrame();
    this.glow.setVisible(selected);
    this.marker.setVisible(selected);
    if (this.config && this.selectable) this.container.setAlpha(selected ? 1 : DIMMED_ALPHA);
    if (changed) {
      this.scene.tweens.add({
        targets: this.container,
        scale: selected ? SELECTED_SCALE : 1,
        duration: SELECT_TWEEN_MS,
        ease: 'Back.easeOut',
      });
    }
    // The selected card draws over its neighbours so its glow is never covered.
    if (selected) this.container.setDepth(1);
    else this.container.setDepth(0);
  }

  /** Cards on other pages are hidden and ignore input. */
  setShown(shown: boolean): void {
    this.container.setVisible(shown);
    if (this.container.input) this.container.input.enabled = shown;
  }

  private drawFrame(): void {
    const locked = !this.config || !this.selectable;
    this.frame.clear();
    drawArcadeFrame(this.frame, -WIDTH / 2, -HEIGHT / 2, WIDTH, HEIGHT, {
      fill: COLORS.navy,
      border: this.selected ? COLORS.gold : locked ? LOCKED_BORDER : COLORS.royal,
      inner: this.selected ? COLORS.neon : COLORS.navyDeep,
      shadow: 4,
    });
  }

  private addFighter(config: FighterConfig, lockedTag: string): void {
    const scene = this.scene;
    const artWidth = WIDTH - ART_INSET * 2;
    const artHeight = HEIGHT - ART_INSET * 2 - NAME_PLATE_HEIGHT;
    const artTop = -HEIGHT / 2 + ART_INSET;

    // Palette-tinted bands behind the portrait (lighter at the top, like stage lighting).
    const backdrop = scene.add.graphics();
    const bands = 4;
    for (let band = 0; band < bands; band++) {
      backdrop.fillStyle(config.palette.body, 0.42 - band * 0.09);
      backdrop.fillRect(
        -artWidth / 2,
        artTop + (artHeight / bands) * band,
        artWidth,
        artHeight / bands,
      );
    }
    const portrait = createPortrait(scene, 0, artTop + artHeight / 2, config, {
      width: artWidth,
      height: artHeight,
      showName: false,
      framed: false,
    });
    const plateY = HEIGHT / 2 - ART_INSET - NAME_PLATE_HEIGHT / 2;
    const plate = scene.add.rectangle(
      0,
      plateY,
      artWidth,
      NAME_PLATE_HEIGHT,
      COLORS.navyDeep,
      0.92,
    );
    const name = scene.add
      .text(0, plateY, config.displayName, arcadeText(15, COLORS.white))
      .setOrigin(0.5);
    if (name.width > artWidth - 8) name.setScale((artWidth - 8) / name.width);
    this.container.add([backdrop, portrait, plate, name]);

    if (!this.selectable) {
      this.container.setAlpha(LOCKED_ALPHA);
      const tag = scene.add
        .text(WIDTH / 2 - 10, -HEIGHT / 2 + 10, lockedTag, arcadeText(15, COLORS.magenta))
        .setOrigin(1, 0);
      this.container.add(tag);
    }
  }

  private addEmptySlot(): void {
    const scene = this.scene;
    const mark = scene.add
      .text(0, -14, STRINGS.lockedSlot, arcadeText(54, COLORS.royal, COLORS.ink))
      .setOrigin(0.5);
    const label = scene.add
      .text(0, HEIGHT / 2 - 24, STRINGS.comingSoon, arcadeText(13, COLORS.neon))
      .setOrigin(0.5);
    this.container.add([mark, label]).setAlpha(LOCKED_ALPHA);
  }

  private createMarker(): Phaser.GameObjects.Container {
    const scene = this.scene;
    const x = -WIDTH / 2 + 4;
    const y = -HEIGHT / 2 - 6;
    const badge = scene.add.rectangle(0, 0, 38, 22, COLORS.magenta).setStrokeStyle(3, COLORS.ink);
    const text = scene.add
      .text(0, 0, STRINGS.playerOneTag, arcadeText(15, COLORS.white))
      .setOrigin(0.5);
    return scene.add.container(x + 19, y + 11, [badge, text]);
  }
}
