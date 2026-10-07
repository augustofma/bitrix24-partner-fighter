import Phaser from 'phaser';
import { STRINGS } from '../../config/strings';
import { COLORS, bodyText } from '../theme';
import { createFightTitle, fitTitleScale } from './fightTitle';
import type { ResultSegment, ResultTone } from './victoryContent';
import { VICTORY_LAYOUT } from './victoryLayout';

const TITLE_GLOW_ALPHA = 0.16;
const TITLE_GLOW_MS = 900;
const RESULT_FONT_SIZE = 18;
const RESULT_GAP = 16;
const RESULT_PADDING = 36;

const TONE_COLOR: Record<ResultTone, number> = {
  win: COLORS.gold,
  lose: COLORS.magenta,
  neutral: COLORS.white,
};

/**
 * "<NAME> VENCEU!" in the fight title lettering (see fightTitle.ts), with a warm additive glow
 * that breathes softly. Long names are fitted to the layout's width.
 */
export function createVictoryTitle(
  scene: Phaser.Scene,
  text: string,
): Phaser.GameObjects.Container {
  const { x, y, maxWidth } = VICTORY_LAYOUT.title;
  const title = createFightTitle(scene, 0, 0, text);
  const glow = createFightTitle(scene, 0, 0, text)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setAlpha(TITLE_GLOW_ALPHA);
  const fit = fitTitleScale(title.displayWidth, maxWidth);
  for (const image of [glow, title]) image.setScale(image.scaleX * fit);
  scene.tweens.add({
    targets: glow,
    alpha: 0,
    duration: TITLE_GLOW_MS,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  return scene.add.container(x, y, [title, glow]);
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
