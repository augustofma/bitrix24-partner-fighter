import { describe, expect, it } from 'vitest';
import { FIGHTER_QUOTES, pickQuote } from '../src/config/fighterQuotes';
import { STRINGS } from '../src/config/strings';
import { ROSTER } from '../src/fighters/roster';
import { COMBO_WINDOW_FRAMES, ComboTracker } from '../src/ui/hud/comboTracker';

describe('combo counter (hit streaks)', () => {
  it('counts hits in a row within the window', () => {
    const combos = new ComboTracker();
    expect(combos.hit(0, 10)).toBe(1);
    expect(combos.hit(0, 40)).toBe(2);
    expect(combos.hit(0, 40 + COMBO_WINDOW_FRAMES)).toBe(3);
    // Too slow: a new streak.
    expect(combos.hit(0, 40 + COMBO_WINDOW_FRAMES * 2 + 1)).toBe(1);
  });

  it('getting hit or being blocked ends the streak; a new round starts clean', () => {
    const combos = new ComboTracker();
    combos.hit(0, 1);
    combos.hit(0, 2);
    expect(combos.hit(1, 3)).toBe(1);
    expect(combos.count(0)).toBe(0);
    combos.hit(1, 4);
    combos.blocked(1);
    expect(combos.hit(1, 5)).toBe(1);
    combos.reset();
    expect(combos.hit(1, 6)).toBe(1);
    expect(STRINGS.comboHits(3)).toBe('3 HITS!');
  });
});

describe('fighter quotes', () => {
  it('every playable fighter and the boss has VS and victory lines, short enough for a bubble', () => {
    for (const fighter of ROSTER.filter((f) => f.playable || f.unlock)) {
      const quotes = FIGHTER_QUOTES[fighter.id];
      expect(quotes, fighter.id).toBeDefined();
      for (const line of [...quotes!.versus, ...quotes!.victory]) {
        expect(line.length, line).toBeLessThanOrEqual(56);
      }
      expect(quotes!.versus.length).toBeGreaterThan(0);
      expect(quotes!.victory.length).toBeGreaterThan(0);
    }
    // Lines only for real fighters (a typo in an id would never show).
    for (const id of Object.keys(FIGHTER_QUOTES)) {
      expect(
        ROSTER.some((f) => f.id === id),
        id,
      ).toBe(true);
    }
  });

  it('picks one of the lines; fighters without lines say nothing', () => {
    expect(pickQuote('gabriele', 'versus', () => 0)).toBe(FIGHTER_QUOTES.gabriele!.versus[0]);
    expect(pickQuote('gabriele', 'victory', () => 0.99)).toBe(
      FIGHTER_QUOTES.gabriele!.victory.at(-1),
    );
    expect(pickQuote('fighter-a', 'versus')).toBeUndefined();
  });
});
