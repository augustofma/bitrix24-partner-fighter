import type Phaser from 'phaser';
import { STRINGS } from '../../config/strings';
import { createPortrait } from '../../render/PortraitView';
import type { FighterConfig } from '../../types/fighter';
import { COLORS, arcadeText, bodyText, css } from '../theme';
import { drawArcadeFrame } from './arcadeFrame';
import { RATING_MAX, rateFighter, type FighterRatings } from './fighterRatings';
import { SELECT_LAYOUT } from './selectLayout';

const { left: LEFT, top: TOP, width: WIDTH, height: HEIGHT } = SELECT_LAYOUT.hero;
const CENTER_X = LEFT + WIDTH / 2;
const PADDING = 14;
const NAME_Y = TOP + 32;
const NAME_RIBBON_HEIGHT = 42;
const ART_TOP = TOP + 58;
const ART_HEIGHT = 190;
const DESCRIPTION_Y = TOP + 262;
const STATS_TOP = TOP + 286;
const STAT_ROW = 20;
const PIP_WIDTH = 24;
const PIP_HEIGHT = 11;
const PIP_GAP = 4;
const ENTER_OFFSET = 18;
const ENTER_MS = 170;
const BORDER_PULSE_MS = 900;
/** Filled pips go from cold to hot along the bar (neon, neon, gold, gold, orange). */
const PIP_COLORS = [COLORS.neon, COLORS.neon, COLORS.gold, COLORS.gold, COLORS.orange] as const;
const EMPTY_PIP = 0x1b2170;
const NAME_GLOW_BLUR = 10;

const STAT_ROWS: readonly { key: keyof FighterRatings; label: string }[] = [
  { key: 'power', label: STRINGS.statPower },
  { key: 'speed', label: STRINGS.statSpeed },
  { key: 'reach', label: STRINGS.statReach },
];

/**
 * Large "hero" panel for the highlighted fighter: enlarged portrait under a spotlight, name
 * ribbon, short description and display-only rating bars. Content slides in on every change.
 */
export class HeroPanel {
  private content: Phaser.GameObjects.Container | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly roster: readonly FighterConfig[],
  ) {
    const frame = scene.add.graphics();
    drawArcadeFrame(frame, LEFT, TOP, WIDTH, HEIGHT, {
      fill: COLORS.navyDeep,
      fillAlpha: 0.95,
      border: COLORS.gold,
      inner: COLORS.violet,
      shadow: 6,
    });

    const pulse = scene.add.graphics();
    pulse.lineStyle(3, COLORS.neon, 1).strokeRect(LEFT - 4, TOP - 4, WIDTH + 8, HEIGHT + 8);
    scene.tweens.add({
      targets: pulse,
      alpha: 0.15,
      duration: BORDER_PULSE_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  show(config: FighterConfig): void {
    this.content?.destroy();
    const scene = this.scene;
    const content = scene.add.container(ENTER_OFFSET, 0).setAlpha(0);
    this.content = content;

    // The ribbon is part of the content so it always covers art that reaches the top.
    const ribbon = scene.add.graphics();
    // Two-tone violet like the title screen's button, with a gold underline.
    const ribbonTop = NAME_Y - NAME_RIBBON_HEIGHT / 2;
    ribbon.fillStyle(COLORS.violet, 1);
    ribbon.fillRect(LEFT + PADDING, ribbonTop, WIDTH - PADDING * 2, NAME_RIBBON_HEIGHT);
    ribbon.fillStyle(COLORS.violetLight, 1);
    ribbon.fillRect(LEFT + PADDING, ribbonTop, WIDTH - PADDING * 2, NAME_RIBBON_HEIGHT * 0.45);
    ribbon.fillStyle(COLORS.gold, 1);
    ribbon.fillRect(LEFT + PADDING, NAME_Y + NAME_RIBBON_HEIGHT / 2 - 3, WIDTH - PADDING * 2, 3);
    const name = scene.add
      .text(CENTER_X, NAME_Y, config.displayName, arcadeText(30, COLORS.gold))
      .setOrigin(0.5)
      .setShadow(0, 0, css(COLORS.neon), NAME_GLOW_BLUR, true, true);
    const maxNameWidth = WIDTH - PADDING * 4;
    if (name.width > maxNameWidth) name.setScale(maxNameWidth / name.width);

    const artCenterY = ART_TOP + ART_HEIGHT / 2;
    const spotlight = scene.add.graphics();
    for (let ring = 0; ring < 4; ring++) {
      spotlight.fillStyle(config.palette.body, 0.1 + ring * 0.06);
      spotlight.fillEllipse(CENTER_X, artCenterY + 8, 230 - ring * 44, 190 - ring * 36);
    }
    // A neon stage disc under the fighter, echoing the title screen arena floor.
    spotlight.fillStyle(COLORS.neon, 0.18);
    spotlight.fillEllipse(CENTER_X, ART_TOP + ART_HEIGHT - 4, 200, 26);
    spotlight.fillStyle(COLORS.ink, 0.6);
    spotlight.fillEllipse(CENTER_X, ART_TOP + ART_HEIGHT - 4, 160, 16);

    const portrait = createPortrait(scene, CENTER_X, artCenterY, config, {
      width: WIDTH - PADDING * 2,
      height: ART_HEIGHT,
      showName: false,
      framed: false,
    });

    const description = scene.add
      .text(CENTER_X, DESCRIPTION_Y, config.description, {
        ...bodyText(14, COLORS.white),
        wordWrap: { width: WIDTH - PADDING * 2 },
      })
      .setOrigin(0.5);

    content.add([spotlight, portrait, ribbon, name, description, ...this.createStats(config)]);
    scene.tweens.add({
      targets: content,
      x: 0,
      alpha: 1,
      duration: ENTER_MS,
      ease: 'Cubic.easeOut',
    });
  }

  private createStats(config: FighterConfig): Phaser.GameObjects.GameObject[] {
    const scene = this.scene;
    const ratings = rateFighter(config, this.roster);
    const pipsLeft = LEFT + WIDTH - PADDING - RATING_MAX * (PIP_WIDTH + PIP_GAP) + PIP_GAP;
    const objects: Phaser.GameObjects.GameObject[] = [];
    STAT_ROWS.forEach(({ key, label }, row) => {
      const y = STATS_TOP + row * STAT_ROW;
      objects.push(
        scene.add.text(LEFT + PADDING + 2, y, label, arcadeText(12, COLORS.neon)).setOrigin(0, 0.5),
      );
      const pips = scene.add.graphics();
      for (let pip = 0; pip < RATING_MAX; pip++) {
        const x = pipsLeft + pip * (PIP_WIDTH + PIP_GAP);
        pips
          .fillStyle(COLORS.ink, 1)
          .fillRect(x - 2, y - PIP_HEIGHT / 2 - 2, PIP_WIDTH + 4, PIP_HEIGHT + 4);
        const filled = pip < ratings[key];
        pips.fillStyle(filled ? (PIP_COLORS[pip] ?? COLORS.gold) : EMPTY_PIP, 1);
        pips.fillRect(x, y - PIP_HEIGHT / 2, PIP_WIDTH, PIP_HEIGHT);
        if (filled) {
          // Shine along the top of lit pips.
          pips.fillStyle(COLORS.white, 0.45).fillRect(x, y - PIP_HEIGHT / 2, PIP_WIDTH, 2);
        }
      }
      objects.push(pips);
    });
    return objects;
  }
}
