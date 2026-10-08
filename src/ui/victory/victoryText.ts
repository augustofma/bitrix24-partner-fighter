import Phaser from 'phaser';
import { STRINGS } from '../../config/strings';
import { COLORS, arcadeText, hudText } from '../theme';
import { createFightTitle, fitTitleScale } from './fightTitle';
import { resultRole } from './victoryContent';
import type { ResultRole, ResultSegment, ResultTone } from './victoryContent';
import { VICTORY_LAYOUT } from './victoryLayout';

const TITLE_GLOW_ALPHA = 0.16;
const TITLE_GLOW_MS = 900;
const RESULT_GAP = 14;
const RESULT_PADDING = 36;
/** Rendered at 2x so the small arcade lettering stays crisp when the canvas is scaled up. */
const RESULT_RESOLUTION = 2;
/** Neutral detail ("Vitória por nocaute"): a cool off-white, quieter than the verdict. */
const DETAIL_COLOR = 0xd9e4ff;

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
  at: { x: number; y: number; maxWidth: number } = VICTORY_LAYOUT.title,
): Phaser.GameObjects.Container {
  const { x, y, maxWidth } = at;
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

/**
 * Lettering of each role, in the game's own families (see config/fonts.ts): the verdict in the
 * arcade face (Russo One) with outline, shadow and tracking; the detail smaller and plainer in
 * the same face; the score in the HUD scoreboard digits (Press Start 2P), gold like the timer.
 */
function resultStyle(role: ResultRole, tone: ResultTone): Phaser.Types.GameObjects.Text.TextStyle {
  switch (role) {
    case 'verdict':
      return { ...arcadeText(20, TONE_COLOR[tone]), resolution: RESULT_RESOLUTION };
    case 'detail':
      return {
        ...arcadeText(14, tone === 'neutral' ? DETAIL_COLOR : TONE_COLOR[tone]),
        strokeThickness: 3,
        shadow: { offsetX: 0, offsetY: 1, color: '#000000', blur: 0, fill: true },
        resolution: RESULT_RESOLUTION,
      };
    case 'score':
      return { ...hudText(15, COLORS.gold), resolution: RESULT_RESOLUTION };
  }
}

const LETTER_SPACING: Record<ResultRole, number> = { verdict: 1.5, detail: 0.5, score: 1 };

/** The result panel (art, when loaded) with "VERDICT ■ Reason ■ score" centered on it. */
export function createResultLine(
  scene: Phaser.Scene,
  panelKey: string | null,
  segments: readonly ResultSegment[],
): Phaser.GameObjects.Container {
  const { x, y, width } = VICTORY_LAYOUT.resultPanel;
  const container = scene.add.container(x, y, panelKey ? [scene.add.image(0, 0, panelKey)] : []);
  const parts: Phaser.GameObjects.Text[] = [];
  segments.forEach((segment, i) => {
    if (i > 0) {
      parts.push(
        scene.add
          .text(0, 0, STRINGS.resultSeparator, {
            // Neon square from the arcade stack's fallback (Russo One has no "■").
            ...arcadeText(9, COLORS.neon),
            strokeThickness: 2,
            resolution: RESULT_RESOLUTION,
          })
          .setAlpha(0.85),
      );
    }
    const role = resultRole(segment);
    parts.push(
      scene.add
        .text(0, 0, segment.text, resultStyle(role, segment.tone))
        .setLetterSpacing(LETTER_SPACING[role]),
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
