import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT, GAME_WIDTH } from '../src/config/display';
import { augusto } from '../src/fighters/augusto';
import { fighterB } from '../src/fighters/fighterB';
import { ROSTER, getPlayableFighters } from '../src/fighters/roster';
import { romualdo } from '../src/fighters/romualdo';
import { RATING_MAX, RATING_MIN, rateFighter } from '../src/ui/select/fighterRatings';
import {
  CARD_RULES,
  SELECT_LAYOUT,
  cardSlot,
  fillerSlots,
  moveInGrid,
  pageCount,
  portraitSize,
  rosterGrid,
  type RosterGrid,
} from '../src/ui/select/selectLayout';

/** Fighters on the select screen today, and the growth this layout must absorb. */
const CURRENT = getPlayableFighters().length;
const EXPANDED = CURRENT + 3;

/** Every slot (fighters + fillers) of a roster of `count`. */
const slotsOf = (count: number, grid: RosterGrid = rosterGrid(count)) =>
  Array.from({ length: pageCount(count, grid) * grid.perPage }, (_, i) => cardSlot(i, grid));

/** Window sizes the game runs at; Phaser FIT keeps the 960x540 logical layout and scales it. */
const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1280x720', width: 1280, height: 720 },
  { name: '844x390 (mobile landscape)', width: 844, height: 390 },
] as const;
const fitScale = (v: { width: number; height: number }) =>
  Math.min(v.width / GAME_WIDTH, v.height / GAME_HEIGHT);
/** Smallest comfortable touch target (css px). */
const MIN_TOUCH = 44;

describe('select screen layout: roster-driven grid', () => {
  const { gridArea, hero, difficulty, topBarY, title } = SELECT_LAYOUT;

  it.each(Array.from({ length: 24 }, (_, i) => i + 1))(
    '%s fighters: every card inside the grid area, none overlapping, portraits never tiny',
    (count) => {
      const grid = rosterGrid(count);
      const slots = slotsOf(count, grid);
      for (const { x, y } of slots) {
        expect(x - grid.cardWidth / 2).toBeGreaterThanOrEqual(gridArea.left - 1e-6);
        expect(x + grid.cardWidth / 2).toBeLessThanOrEqual(gridArea.left + gridArea.width + 1e-6);
        expect(y - grid.cardHeight / 2).toBeGreaterThanOrEqual(gridArea.top - 1e-6);
        expect(y + grid.cardHeight / 2).toBeLessThanOrEqual(gridArea.top + gridArea.height + 1e-6);
      }
      for (let page = 0; page < grid.pages; page++) {
        const onPage = slots.filter((s) => s.page === page);
        for (const a of onPage) {
          for (const b of onPage) {
            if (a === b) continue;
            const apart =
              Math.abs(a.x - b.x) >= grid.cardWidth + grid.gap - 1e-6 ||
              Math.abs(a.y - b.y) >= grid.cardHeight + grid.gap - 1e-6;
            expect(apart).toBe(true);
          }
        }
      }
      expect(portraitSize(grid.cardWidth, grid.cardHeight)).toBeGreaterThanOrEqual(
        CARD_RULES.minPortrait,
      );
      expect(grid.cardWidth).toBeLessThanOrEqual(CARD_RULES.maxWidth);
      expect(grid.cardHeight).toBeLessThanOrEqual(CARD_RULES.maxHeight);
    },
  );

  it('the grid area stays clear of the hero panel, the top bar and the difficulty', () => {
    expect(gridArea.left).toBeGreaterThanOrEqual(0);
    expect(gridArea.left + gridArea.width).toBeLessThan(hero.left);
    expect(gridArea.top).toBeGreaterThan(topBarY + title.height / 2);
    // Room for the selected card's scale-up and glow above the difficulty panel.
    expect(gridArea.top + gridArea.height).toBeLessThan(difficulty.y - difficulty.height / 2);
    expect(hero.left + hero.width).toBeLessThanOrEqual(GAME_WIDTH);
    expect(SELECT_LAYOUT.footerY).toBeLessThan(GAME_HEIGHT);
  });

  it('rosters up to twelve fit on a single page', () => {
    expect(CURRENT).toBeGreaterThanOrEqual(6);
    for (const count of [6, 9, 10, 11, 12]) {
      const grid = rosterGrid(count);
      expect(grid.pages).toBe(1);
      expect(grid.perPage).toBeGreaterThanOrEqual(count);
      // At most one row's worth of empty "coming soon" slots.
      expect(fillerSlots(count, grid)).toBeLessThan(grid.columns);
      expect(grid.rows).toBeLessThanOrEqual(2);
    }
    // Today's 6 keep the original 3 x 2 grid of 196 x 166 cards.
    expect(rosterGrid(6)).toMatchObject({ columns: 3, rows: 2, cardWidth: 196, cardHeight: 166 });
    // Roster + 3: more columns, smaller cards, still two rows.
    const expanded = rosterGrid(12);
    expect(expanded.columns).toBeGreaterThan(rosterGrid(6).columns);
    expect(expanded.cardWidth).toBeLessThan(rosterGrid(6).cardWidth);
  });

  it('only rosters too large for readable cards paginate, with every page the same grid', () => {
    const big = rosterGrid(30);
    expect(big.pages).toBeGreaterThan(1);
    expect(cardSlot(big.perPage, big)).toMatchObject({ ...cardSlot(0, big), page: 1 });
    expect(pageCount(30, big)).toBe(Math.ceil(30 / big.perPage));
    expect(fillerSlots(big.perPage, rosterGrid(big.perPage))).toBe(0);
  });

  it.each(VIEWPORTS)('cards stay comfortable touch targets at $name', (viewport) => {
    const scale = fitScale(viewport);
    for (const count of [CURRENT, EXPANDED, 12, 30]) {
      const grid = rosterGrid(count);
      expect(grid.cardWidth * scale, `${count} fighters`).toBeGreaterThanOrEqual(MIN_TOUCH);
      expect(grid.cardHeight * scale, `${count} fighters`).toBeGreaterThanOrEqual(MIN_TOUCH);
      // The scaled layout fits the window (FIT letterboxes, never crops).
      expect(GAME_WIDTH * scale).toBeLessThanOrEqual(viewport.width + 1e-6);
      expect(GAME_HEIGHT * scale).toBeLessThanOrEqual(viewport.height + 1e-6);
    }
  });
});

describe('select screen layout: keyboard navigation in the grid', () => {
  it('← → walk the roster in order and wrap (first and last reachable)', () => {
    const grid = rosterGrid(EXPANDED);
    expect(moveInGrid(0, 'left', EXPANDED, grid)).toBe(EXPANDED - 1);
    expect(moveInGrid(EXPANDED - 1, 'right', EXPANDED, grid)).toBe(0);
    let index = 0;
    const seen = new Set([index]);
    for (let i = 0; i < EXPANDED; i++)
      seen.add((index = moveInGrid(index, 'right', EXPANDED, grid)));
    expect(seen.size).toBe(EXPANDED);
  });

  it('↑ ↓ move one row in the same column, a short last row lands on its last card', () => {
    const count = 11;
    const grid = rosterGrid(count); // 2 rows, single page
    const { columns } = grid;
    expect(moveInGrid(1, 'down', count, grid)).toBe(1 + columns);
    expect(moveInGrid(1 + columns, 'up', count, grid)).toBe(1);
    // Last column of the top row, with no card under it: the last card of the row below.
    if (count % columns !== 0) {
      expect(moveInGrid(columns - 1, 'down', count, grid)).toBe(count - 1);
    }
    // Past the bottom / top edge: wraps to the other row (single page).
    expect(moveInGrid(columns, 'down', count, grid)).toBe(0);
    expect(moveInGrid(0, 'up', count, grid)).toBe(columns);
  });

  it('↑ ↓ cross pages when the roster paginates', () => {
    const count = 30;
    const grid = rosterGrid(count);
    const lastRowFirst = (grid.rows - 1) * grid.columns;
    // Bottom row of page 1 -> top row of page 2, same column.
    expect(cardSlot(moveInGrid(lastRowFirst + 1, 'down', count, grid), grid)).toMatchObject({
      page: 1,
      row: 0,
      column: 1,
    });
    // Top row of page 2 -> bottom row of page 1.
    expect(cardSlot(moveInGrid(grid.perPage + 1, 'up', count, grid), grid)).toMatchObject({
      page: 0,
      row: grid.rows - 1,
      column: 1,
    });
    // → alone reaches every fighter; ↓ alone walks one column through every page.
    const seen = new Set<number>();
    let index = 0;
    for (let i = 0; i < count; i++) seen.add((index = moveInGrid(index, 'right', count, grid)));
    expect(seen.size).toBe(count);
    const column = new Set<number>();
    index = 2;
    for (let i = 0; i < count; i++) column.add((index = moveInGrid(index, 'down', count, grid)));
    const expected = Array.from({ length: count }, (_, i) => i).filter(
      (i) => cardSlot(i, grid).column === 2,
    );
    expect([...column].sort((a, b) => a - b)).toEqual(expected);
  });

  it('entries the mode does not offer are skipped in every direction', () => {
    const grid = rosterGrid(EXPANDED);
    const locked = new Set([1, 1 + grid.columns]);
    const canPick = (i: number) => !locked.has(i);
    expect(moveInGrid(0, 'right', EXPANDED, grid, canPick)).toBe(2);
    expect(moveInGrid(2, 'left', EXPANDED, grid, canPick)).toBe(0);
    expect(locked.has(moveInGrid(1 + grid.columns + 1, 'up', EXPANDED, grid, canPick))).toBe(false);
    // Nothing else to pick: stays.
    expect(moveInGrid(0, 'right', EXPANDED, grid, (i) => i === 0)).toBe(0);
  });
});

describe('display-only fighter ratings', () => {
  it('stay within the bar and follow the configs (Romualdo hits hardest, Augusto is fastest)', () => {
    for (const fighter of ROSTER) {
      for (const value of Object.values(rateFighter(fighter, ROSTER))) {
        expect(value).toBeGreaterThanOrEqual(RATING_MIN);
        expect(value).toBeLessThanOrEqual(RATING_MAX);
      }
    }
    expect(rateFighter(romualdo, ROSTER).power).toBe(RATING_MAX);
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
