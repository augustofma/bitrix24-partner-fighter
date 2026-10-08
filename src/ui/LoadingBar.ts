import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import { STRINGS } from '../config/strings';
import { COLORS } from './theme';

const BAR_WIDTH = 420;
const BAR_HEIGHT = 18;
const BAR_Y = GAME_HEIGHT / 2 + 24;

/**
 * Loading screen: title, a progress bar and the percentage, so a slow connection shows progress
 * instead of a black screen. Drawn from a scene's `preload` (the boot, or a screen whose art is
 * not cached yet) and removed when the load completes. Uses a system font: on boot the game
 * fonts are among the files still loading.
 */
export class LoadingBar {
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const font = 'Arial Black, Impact, sans-serif';
    const title = scene.add
      .text(GAME_WIDTH / 2, BAR_Y - 64, STRINGS.titleTop, { fontFamily: font, fontSize: '30px' })
      .setColor('#2fe0ff')
      .setOrigin(0.5);
    const subtitle = scene.add
      .text(GAME_WIDTH / 2, BAR_Y - 32, STRINGS.titleBottom, { fontFamily: font, fontSize: '22px' })
      .setColor('#ffd23f')
      .setOrigin(0.5);
    const frame = scene.add
      .rectangle(GAME_WIDTH / 2, BAR_Y, BAR_WIDTH + 6, BAR_HEIGHT + 6, COLORS.panel)
      .setStrokeStyle(2, COLORS.neon);
    this.fill = scene.add
      .rectangle(GAME_WIDTH / 2 - BAR_WIDTH / 2, BAR_Y, 0, BAR_HEIGHT, COLORS.gold)
      .setOrigin(0, 0.5);
    this.label = scene.add
      .text(GAME_WIDTH / 2, BAR_Y + 30, STRINGS.loading(0), { fontFamily: font, fontSize: '14px' })
      .setColor('#ffffff')
      .setOrigin(0.5);
    const onProgress = (progress: number) => this.update(progress);
    scene.load.on(Phaser.Loader.Events.PROGRESS, onProgress);
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
      scene.load.off(Phaser.Loader.Events.PROGRESS, onProgress);
      for (const object of [title, subtitle, frame, this.fill, this.label]) object.destroy();
    });
  }

  update(progress: number): void {
    this.fill.width = BAR_WIDTH * Phaser.Math.Clamp(progress, 0, 1);
    this.label.setText(STRINGS.loading(progress));
  }
}
