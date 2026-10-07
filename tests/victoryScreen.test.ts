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
import { fitTitleScale, titleSeed } from '../src/ui/victory/fightTitle';
import { resultRole, victoryContent } from '../src/ui/victory/victoryContent';
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

  it('result typography roles: verdict leads, reason is detail, score is the scoreboard', () => {
    const won = victoryContent(result(augusto, 0, 'ko', [2, 0]), [augusto, fighterB]);
    expect(won.result.map(resultRole)).toEqual(['verdict', 'detail', 'score']);
    const lost = victoryContent(result(augusto, 1, 'timeout', [0, 2]), [augusto, fighterB]);
    expect(lost.result.map(resultRole)).toEqual(['verdict', 'detail', 'score']);
    const draw = victoryContent(result(filipe, null, 'timeout', [4, 4]), [filipe, fighterB]);
    expect(draw.result.map(resultRole)).toEqual(['detail', 'score']);
    // Campaign complete line (no explicit roles): the cheer leads, the route is detail.
    expect(resultRole({ text: 'MUNDO DOMINADO!', tone: 'win' })).toBe('verdict');
    expect(resultRole({ text: 'RECIFE  →  JOINVILLE', tone: 'neutral' })).toBe('detail');
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

describe('fight title lettering', () => {
  it.each([
    [augusto, 0, 'AUGUSTO VENCEU!'],
    [filipe, 0, 'FILIPE VENCEU!'],
    [fighterA, 0, 'FIGHTER_A VENCEU!'],
    [augusto, 1, 'FIGHTER_B VENCEU!'],
  ] as const)(
    '%s / winner %s -> "%s" (from the real winner, never hardcoded)',
    (player, winner, title) => {
      const content = victoryContent(result(player, winner, 'ko', [2, 1]), [player, fighterB]);
      expect(content.title).toBe(title);
    },
  );

  it('long names are fitted to the layout width; short ones are never enlarged', () => {
    const { maxWidth } = VICTORY_LAYOUT.title;
    expect(fitTitleScale(400, maxWidth)).toBe(1);
    expect(fitTitleScale(maxWidth, maxWidth)).toBe(1);
    expect(fitTitleScale(maxWidth * 2, maxWidth)).toBeCloseTo(0.5);
    expect(VICTORY_LAYOUT.title.x).toBe(480); // centered
  });

  it('brush streaks are deterministic per text (same title, same look)', () => {
    expect(titleSeed('FILIPE VENCEU!')).toBe(titleSeed('FILIPE VENCEU!'));
    expect(titleSeed('FILIPE VENCEU!')).not.toBe(titleSeed('AUGUSTO VENCEU!'));
  });

  it('the title font is bundled with its license', () => {
    expect(existsSync('public/fonts/bangers/Bangers-Regular.ttf')).toBe(true);
    expect(existsSync('public/fonts/bangers/OFL.txt')).toBe(true);
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
