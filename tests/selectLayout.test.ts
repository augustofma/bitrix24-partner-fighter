import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT, GAME_WIDTH } from '../src/config/display';
import { augusto } from '../src/fighters/augusto';
import { fighterB } from '../src/fighters/fighterB';
import { ROSTER } from '../src/fighters/roster';
import { RATING_MAX, RATING_MIN, rateFighter } from '../src/ui/select/fighterRatings';
import {
  CARDS_PER_PAGE,
  SELECT_LAYOUT,
  cardSlot,
  fillerSlots,
  pageCount,
} from '../src/ui/select/selectLayout';

describe('select screen layout', () => {
  const { grid, hero } = SELECT_LAYOUT;

  it('every card of a page fits on screen, left of the hero panel, without overlaps', () => {
    const slots = Array.from({ length: CARDS_PER_PAGE }, (_, i) => cardSlot(i));
    for (const { x, y } of slots) {
      expect(x - grid.cardWidth / 2).toBeGreaterThanOrEqual(0);
      expect(x + grid.cardWidth / 2).toBeLessThan(hero.left);
      expect(y - grid.cardHeight / 2).toBeGreaterThan(0);
      expect(y + grid.cardHeight / 2).toBeLessThan(SELECT_LAYOUT.difficulty.y);
    }
    for (const a of slots) {
      for (const b of slots) {
        if (a === b) continue;
        const apart =
          Math.abs(a.x - b.x) >= grid.cardWidth || Math.abs(a.y - b.y) >= grid.cardHeight;
        expect(apart).toBe(true);
      }
    }
    expect(hero.left + hero.width).toBeLessThanOrEqual(GAME_WIDTH);
    expect(SELECT_LAYOUT.footerY).toBeLessThan(GAME_HEIGHT);
  });

  it('pages repeat the same positions and filler slots complete the last page', () => {
    expect(cardSlot(CARDS_PER_PAGE)).toEqual({ ...cardSlot(0), page: 1 });
    expect(pageCount(ROSTER.length)).toBe(1);
    expect(fillerSlots(ROSTER.length)).toBe(CARDS_PER_PAGE - ROSTER.length);
    expect(pageCount(CARDS_PER_PAGE + 1)).toBe(2);
    expect(fillerSlots(CARDS_PER_PAGE)).toBe(0);
    expect(fillerSlots(0)).toBe(CARDS_PER_PAGE);
  });
});

describe('display-only fighter ratings', () => {
  it('stay within the bar and follow the configs (FIGHTER_B hits hardest, Augusto is fastest)', () => {
    for (const fighter of ROSTER) {
      for (const value of Object.values(rateFighter(fighter, ROSTER))) {
        expect(value).toBeGreaterThanOrEqual(RATING_MIN);
        expect(value).toBeLessThanOrEqual(RATING_MAX);
      }
    }
    expect(rateFighter(fighterB, ROSTER).power).toBe(RATING_MAX);
    expect(rateFighter(augusto, ROSTER).speed).toBe(RATING_MAX);
    expect(rateFighter(fighterB, ROSTER).speed).toBe(RATING_MIN);
  });

  it('a roster where everyone is equal rates everyone in the middle', () => {
    const middle = Math.ceil((RATING_MIN + RATING_MAX) / 2);
    expect(rateFighter(augusto, [augusto])).toEqual({
      power: middle,
      speed: middle,
      reach: middle,
    });
  });
});
