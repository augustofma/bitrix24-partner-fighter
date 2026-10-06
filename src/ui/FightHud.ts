import type Phaser from 'phaser';
import { GAME_WIDTH } from '../config/display';
import { ROUND_NUMBER } from '../config/match';
import { STRINGS } from '../config/strings';
import type { ReadonlyFighter } from '../core/fighter/ReadonlyFighter';
import { HealthBar } from './HealthBar';
import { SpecialMeterBar } from './SpecialMeterBar';
import { COLORS, DEPTH, arcadeText, css } from './theme';

const MARGIN_X = 36;
const BAR_Y = 26;
const BAR_HEIGHT = 24;
const TIMER_BOX_WIDTH = 84;
const BAR_WIDTH = (GAME_WIDTH - MARGIN_X * 2 - TIMER_BOX_WIDTH - 24) / 2;
const LOW_TIME_SECONDS = 10;

/** Health bars, names, clock and round label. Fixed to the screen (not the world). */
export class FightHud {
  private readonly bars: readonly [HealthBar, HealthBar];
  private readonly timerText: Phaser.GameObjects.Text;
  private readonly meters: readonly [SpecialMeterBar, SpecialMeterBar];

  constructor(scene: Phaser.Scene, fighters: readonly [ReadonlyFighter, ReadonlyFighter]) {
    const [left, right] = fighters;
    const rightBarX = GAME_WIDTH - MARGIN_X - BAR_WIDTH;
    this.bars = [
      new HealthBar(scene, MARGIN_X, BAR_Y, BAR_WIDTH, BAR_HEIGHT, 'right'),
      new HealthBar(scene, rightBarX, BAR_Y, BAR_WIDTH, BAR_HEIGHT, 'left'),
    ];

    this.meters = [
      new SpecialMeterBar(scene, MARGIN_X, BAR_Y + BAR_HEIGHT + 6, BAR_WIDTH, false),
      new SpecialMeterBar(scene, rightBarX, BAR_Y + BAR_HEIGHT + 6, BAR_WIDTH, true),
    ];
    const nameY = BAR_Y + BAR_HEIGHT + 32;
    const leftName = scene.add.text(MARGIN_X, nameY, left.config.displayName, arcadeText(18));
    const rightName = scene.add
      .text(GAME_WIDTH - MARGIN_X, nameY, right.config.displayName, arcadeText(18))
      .setOrigin(1, 0);

    const centerX = GAME_WIDTH / 2;
    const timerBox = scene.add
      .rectangle(centerX, BAR_Y + BAR_HEIGHT / 2 + 4, TIMER_BOX_WIDTH, 58, COLORS.ink, 0.9)
      .setStrokeStyle(3, COLORS.gold);
    this.timerText = scene.add
      .text(centerX, BAR_Y + BAR_HEIGHT / 2 + 4, '', arcadeText(40, COLORS.gold))
      .setOrigin(0.5);
    const roundLabel = scene.add
      .text(centerX, BAR_Y + 64, STRINGS.round(ROUND_NUMBER), arcadeText(14, COLORS.cyan))
      .setOrigin(0.5, 0);

    const objects = [
      ...this.bars.map((bar) => bar.gameObject),
      leftName,
      rightName,
      timerBox,
      this.timerText,
      roundLabel,
    ];
    for (const object of objects) object.setScrollFactor(0).setDepth(DEPTH.hud);
  }

  update(fighters: readonly [ReadonlyFighter, ReadonlyFighter], secondsRemaining: number): void {
    fighters.forEach((fighter, i) => {
      const bar = this.bars[i as 0 | 1];
      bar.setRatio(fighter.health / fighter.maxHealth);
      bar.update();
      this.meters[i as 0 | 1].update(fighter);
    });
    const label = String(Math.max(0, secondsRemaining)).padStart(2, '0');
    if (this.timerText.text !== label) this.timerText.setText(label);
    this.timerText.setColor(
      css(secondsRemaining <= LOW_TIME_SECONDS ? COLORS.healthLow : COLORS.gold),
    );
  }
}
