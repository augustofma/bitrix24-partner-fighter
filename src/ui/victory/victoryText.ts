import Phaser from 'phaser';
import { STRINGS } from '../../config/strings';
import { COLORS, arcadeText, bodyText, css } from '../theme';
import type { ResultSegment, ResultTone } from './victoryContent';
import { VICTORY_LAYOUT } from './victoryLayout';

const TITLE_FONT_SIZE = 56;
const TITLE_STROKE = 9;
const TITLE_GLOW_STROKE = 15;
const TITLE_GLOW_ALPHA = 0.38;
const TITLE_GLOW_MS = 700;
const RESULT_FONT_SIZE = 18;
const RESULT_GAP = 16;
const RESULT_PADDING = 36;

const TONE_COLOR: Record<ResultTone, number> = {
  win: COLORS.gold,
  lose: COLORS.magenta,
  neutral: COLORS.white,
};

/**
 * "<NAME> VENCEU!": gold letters with a magenta outline, over a softly blinking neon copy of
 * the outline. Scaled down to fit long names.
 */
export function createVictoryTitle(
  scene: Phaser.Scene,
  text: string,
): Phaser.GameObjects.Container {
  const { x, y, maxWidth } = VICTORY_LAYOUT.title;
  const glow = scene.add
    .text(0, 0, text, {
      ...arcadeText(TITLE_FONT_SIZE, COLORS.magenta, COLORS.magenta),
      strokeThickness: TITLE_GLOW_STROKE,
    })
    .setOrigin(0.5)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setAlpha(TITLE_GLOW_ALPHA);
  const title = scene.add
    .text(0, 0, text, {
      ...arcadeText(TITLE_FONT_SIZE, COLORS.gold, COLORS.magenta),
      strokeThickness: TITLE_STROKE,
    })
    .setOrigin(0.5)
    .setShadow(0, 5, css(COLORS.ink), 0, true, true);
  const container = scene.add.container(x, y, [glow, title]);
  if (title.width > maxWidth) {
    const fit = maxWidth / title.width;
    glow.setScale(fit);
    title.setScale(fit);
  }
  scene.tweens.add({
    targets: glow,
    alpha: 0.08,
    duration: TITLE_GLOW_MS,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  return container;
}

/** The result panel (art) with "VERDICT ■ Reason ■ score" centered on it. */
export function createResultLine(
  scene: Phaser.Scene,
  panelKey: string,
  segments: readonly ResultSegment[],
): Phaser.GameObjects.Container {
  const { x, y, width } = VICTORY_LAYOUT.resultPanel;
  const container = scene.add.container(x, y, [scene.add.image(0, 0, panelKey)]);
  const parts: Phaser.GameObjects.Text[] = [];
  segments.forEach((segment, i) => {
    if (i > 0) {
      parts.push(scene.add.text(0, 0, STRINGS.resultSeparator, bodyText(10, COLORS.neon)));
    }
    const strong = segment.tone !== 'neutral' || i === segments.length - 1;
    parts.push(
      scene.add.text(0, 0, segment.text, {
        ...bodyText(RESULT_FONT_SIZE, TONE_COLOR[segment.tone]),
        fontStyle: strong ? 'bold' : 'normal',
      }),
    );
  });
  const total = parts.reduce((sum, part) => sum + part.width, 0) + RESULT_GAP * (parts.length - 1);
  const scale = Math.min(1, (width - RESULT_PADDING * 2) / total);
  let cursor = (-total * scale) / 2;
  for (const part of parts) {
    part.setOrigin(0, 0.5).setScale(scale).setPosition(cursor, 0);
    cursor += (part.width + RESULT_GAP) * scale;
  }
  container.add(parts);
  return container;
}
