import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STRINGS } from '../src/config/strings';
import { augusto } from '../src/fighters/augusto';
import { fighterA } from '../src/fighters/fighterA';
import { fighterB } from '../src/fighters/fighterB';
import { filipe } from '../src/fighters/filipe';
import { VICTORY_ART, VICTORY_ASSETS } from '../src/render/assets/victoryAssets';
import type { FighterConfig } from '../src/types/fighter';
import type { MatchResult } from '../src/types/match';
import { victoryContent } from '../src/ui/victory/victoryContent';
import { VICTORY_LAYOUT } from '../src/ui/victory/victoryLayout';
import { jpegSize, readRgbaPng } from './png';

function result(
  player: FighterConfig,
  winnerIndex: 0 | 1 | null,
  reason: 'ko' | 'timeout',
  roundWins: [number, number],
): MatchResult {
  const setup = {
    playerFighterId: player.id,
    cpuFighterId: fighterB.id,
    stageId: 'partner-summit',
    difficulty: 'normal' as const,
  };
  return { setup, winnerIndex, reason, roundWins };
}
const texts = (content: ReturnType<typeof victoryContent>) => content.result.map((s) => s.text);

describe('victory screen content (from the real MatchResult)', () => {
  it.each([augusto, filipe, fighterA])('%s wins: dynamic title, card and result', (player) => {
    const content = victoryContent(result(player, 0, 'ko', [2, 0]), [player, fighterB]);
    expect(content.title).toBe(`${player.displayName} VENCEU!`);
    expect(content.featured).toEqual([player]);
    expect(content.nameLabel).toBe(player.displayName);
    expect(texts(content)).toEqual([STRINGS.youWin, STRINGS.reasonKo, '2 x 0']);
    expect(content.result[0]?.tone).toBe('win');
  });

  it('time over and a 2 x 1 score', () => {
    const content = victoryContent(result(filipe, 0, 'timeout', [2, 1]), [filipe, fighterB]);
    expect(texts(content)).toEqual([STRINGS.youWin, STRINGS.reasonTimeout, '2 x 1']);
  });

  it('the CPU wins: its name and portrait, and the player is told they lost', () => {
    const content = victoryContent(result(augusto, 1, 'ko', [1, 2]), [augusto, fighterB]);
    expect(content.title).toBe(`${fighterB.displayName} VENCEU!`);
    expect(content.featured).toEqual([fighterB]);
    expect(texts(content)).toEqual([STRINGS.youLose, STRINGS.reasonKo, '1 x 2']);
    expect(content.result[0]?.tone).toBe('lose');
  });

  it('a drawn match shows both fighters and the draw reason', () => {
    const content = victoryContent(result(filipe, null, 'timeout', [4, 4]), [filipe, fighterB]);
    expect(content.title).toBe(STRINGS.draw);
    expect(content.featured).toEqual([filipe, fighterB]);
    expect(content.nameLabel).toBe(STRINGS.drawNames(filipe.displayName, fighterB.displayName));
    expect(texts(content)).toEqual([STRINGS.reasonMatchDraw, '4 x 4']);
  });
});

describe('victory screen art', () => {
  it('declares four layers with unique keys, all on disk', () => {
    expect(new Set(VICTORY_ASSETS.map((asset) => asset.key)).size).toBe(4);
    for (const asset of VICTORY_ASSETS) expect(existsSync(`public/${asset.path}`)).toBe(true);
  });

  it('the background fills the 960x540 screen without distortion', () => {
    expect(jpegSize(`public/${VICTORY_ART.background.path}`)).toEqual({ width: 960, height: 540 });
  });

  it('the card frame has a see-through window where the portrait goes', () => {
    const frame = readRgbaPng(`public/${VICTORY_ART.cardFrame.path}`);
    const { card, cardWindow } = VICTORY_LAYOUT;
    const cx = Math.round(frame.width / 2 + cardWindow.x - card.x);
    const cy = Math.round(frame.height / 2 + cardWindow.y - card.y);
    expect(frame.alpha(cx, cy)).toBe(0);
    expect(frame.alpha(Math.round(frame.width / 2), frame.height - 8)).toBe(255);
  });

  it('every piece of the layout stays on screen, in reading order', () => {
    const { title, card, resultPanel, button } = VICTORY_LAYOUT;
    expect(title.y).toBeLessThan(card.y);
    expect(card.y).toBeLessThan(resultPanel.y);
    expect(resultPanel.y).toBeLessThan(button.y);
    expect(button.y).toBeLessThan(540);
    expect(title.maxWidth).toBeLessThanOrEqual(960);
  });
});
