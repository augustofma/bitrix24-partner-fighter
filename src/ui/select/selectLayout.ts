/**
 * Geometry of the character select screen (960x540 logical px; Phaser FIT-scales it to any
 * window, so 1280x720, 1920x1080 and a 844x390 phone all show the same layout). Pure, so the
 * grid math is testable and the scene only places things.
 *
 * The roster grid is derived from the number of fighters the mode offers: `rosterGrid(count)`
 * picks the columns / rows (and so the card size) that show the largest portraits with every
 * card on one page; only when even the smallest acceptable cards cannot fit everyone does it
 * paginate. Adding a fighter to the roster never needs a change here or in the scene.
 */
export const SELECT_LAYOUT = {
  topBarY: 40,
  backButton: { x: 84, width: 124, height: 46 },
  title: { x: 470, width: 470, height: 54 },
  pager: { x: 860, buttonWidth: 40, height: 40, gap: 46 },
  /** Shows the step / CPU opponent when the pager does not need the spot. */
  opponentBadge: { x: 822, width: 220, height: 42 },
  /** Area the roster cards fill, left of the hero panel and above the difficulty. */
  gridArea: { left: 24, top: 82, width: 612, height: 344 },
  hero: { left: 648, top: 82, width: 290, height: 344 },
  selectButton: { x: 793, y: 464, width: 290, height: 56 },
  difficulty: { x: 330, y: 464, width: 612, height: 56 },
  footerY: 522,
} as const;

/** Limits of a roster card. */
export const CARD_RULES = {
  gap: 12,
  /** Largest card (the original 3 x 2 grid): a short roster never gets giant cards. */
  maxWidth: 196,
  maxHeight: 166,
  /** Inset of the portrait and height of the name plate inside a card. */
  artInset: 7,
  namePlateHeight: 28,
  /**
   * Smallest portrait side (logical px) a card may have. At 844x390 (scale 0.72) this is still
   * ~55 css px, and the whole card stays a comfortable touch target.
   */
  minPortrait: 76,
  maxColumns: 8,
  maxRows: 3,
  /** Score lost per empty slot: a full grid beats one with holes when portraits are similar. */
  emptySlotPenalty: 4,
} as const;

export interface RosterGrid {
  columns: number;
  rows: number;
  cardWidth: number;
  cardHeight: number;
  gap: number;
  perPage: number;
  pages: number;
  /** Top-left of the first card: the grid is centered in the grid area. */
  left: number;
  top: number;
}

export interface CardSlot {
  /** Card center. */
  x: number;
  y: number;
  page: number;
  column: number;
  row: number;
}

type Area = { left: number; top: number; width: number; height: number };

/** Side of the square the portrait gets inside a card of this size. */
export function portraitSize(cardWidth: number, cardHeight: number): number {
  const { artInset, namePlateHeight } = CARD_RULES;
  return Math.min(cardWidth - artInset * 2, cardHeight - artInset * 2 - namePlateHeight);
}

function gridFor(columns: number, rows: number, count: number, area: Area): RosterGrid {
  const { gap, maxWidth, maxHeight } = CARD_RULES;
  const cardWidth = Math.min(maxWidth, (area.width - gap * (columns - 1)) / columns);
  const cardHeight = Math.min(maxHeight, (area.height - gap * (rows - 1)) / rows);
  const perPage = columns * rows;
  const usedWidth = cardWidth * columns + gap * (columns - 1);
  const usedHeight = cardHeight * rows + gap * (rows - 1);
  return {
    columns,
    rows,
    cardWidth,
    cardHeight,
    gap,
    perPage,
    pages: Math.max(1, Math.ceil(count / perPage)),
    left: area.left + (area.width - usedWidth) / 2,
    top: area.top + (area.height - usedHeight) / 2,
  };
}

/**
 * The grid for `count` fighters: fewest pages first (one, whenever cards of at least
 * CARD_RULES.minPortrait fit), then the largest portraits, then the fewest empty slots, then
 * the fewest rows.
 */
export function rosterGrid(count: number, area: Area = SELECT_LAYOUT.gridArea): RosterGrid {
  const entries = Math.max(1, count);
  let best: { grid: RosterGrid; score: number } | null = null;
  for (let columns = 1; columns <= CARD_RULES.maxColumns; columns++) {
    for (let rows = 1; rows <= CARD_RULES.maxRows; rows++) {
      const grid = gridFor(columns, rows, entries, area);
      const portrait = portraitSize(grid.cardWidth, grid.cardHeight);
      if (portrait < CARD_RULES.minPortrait) continue;
      // Never more cells than needed for a single page (no fully empty rows/columns).
      if (grid.pages === 1 && (columns - 1) * rows >= entries) continue;
      if (grid.pages === 1 && columns * (rows - 1) >= entries) continue;
      const empty = grid.pages * grid.perPage - entries;
      const score = portrait - empty * CARD_RULES.emptySlotPenalty;
      if (
        !best ||
        grid.pages < best.grid.pages ||
        (grid.pages === best.grid.pages && score > best.score) ||
        // Same quality: the flatter grid (fewer rows) reads better beside the hero panel.
        (grid.pages === best.grid.pages && score === best.score && rows < best.grid.rows)
      ) {
        best = { grid, score };
      }
    }
  }
  // The rules always allow a 1 x 1 grid; this only guards a misconfigured area.
  return best?.grid ?? gridFor(1, 1, entries, area);
}

/** Where entry `index` goes: row-major within its page. */
export function cardSlot(index: number, grid: RosterGrid): CardSlot {
  const page = Math.floor(index / grid.perPage);
  const inPage = index - page * grid.perPage;
  const column = inPage % grid.columns;
  const row = Math.floor(inPage / grid.columns);
  return {
    x: grid.left + grid.cardWidth / 2 + column * (grid.cardWidth + grid.gap),
    y: grid.top + grid.cardHeight / 2 + row * (grid.cardHeight + grid.gap),
    page,
    column,
    row,
  };
}

export function pageCount(entries: number, grid: RosterGrid = rosterGrid(entries)): number {
  return Math.max(1, Math.ceil(entries / grid.perPage));
}

/** Empty "coming soon" slots needed to fill the last page, so the grid never looks broken. */
export function fillerSlots(entries: number, grid: RosterGrid = rosterGrid(entries)): number {
  return pageCount(entries, grid) * grid.perPage - entries;
}

export type GridDirection = 'left' | 'right' | 'up' | 'down';

/**
 * Next entry from `index` in a direction. ← → walk the roster in order (wrapping, and so
 * crossing pages). ↑ ↓ move one row in the same column; past the last row of a page they go to
 * the next page (first row), before the first row to the previous page (last row); past the
 * end of the roster they wrap. `canPick` skips entries this mode does not offer (story locks):
 * the move continues in the same direction. Returns `index` when nothing can be reached.
 */
export function moveInGrid(
  index: number,
  direction: GridDirection,
  count: number,
  grid: RosterGrid,
  canPick: (index: number) => boolean = () => true,
): number {
  if (count <= 0) return index;
  if (direction === 'left' || direction === 'right') {
    const step = direction === 'right' ? 1 : -1;
    for (let i = 1; i <= count; i++) {
      const candidate = (((index + step * i) % count) + count) % count;
      if (canPick(candidate)) return candidate;
    }
    return index;
  }
  const step = direction === 'down' ? 1 : -1;
  let current = index;
  for (let tries = 0; tries < count * 2; tries++) {
    current = verticalNeighbour(current, step, count, grid);
    if (current === index) return index;
    if (canPick(current)) return current;
  }
  return index;
}

/** One row up/down in the same column, crossing pages and wrapping around the roster. */
function verticalNeighbour(index: number, step: 1 | -1, count: number, grid: RosterGrid): number {
  const { page, column, row } = cardSlot(index, grid);
  const pages = pageCount(count, grid);
  const rowsOn = (p: number) =>
    Math.ceil(Math.min(grid.perPage, count - p * grid.perPage) / grid.columns);
  let targetPage = page;
  let targetRow = row + step;
  if (targetRow >= rowsOn(page) || targetRow < 0) {
    targetPage = (page + step + pages) % pages;
    targetRow = step > 0 ? 0 : rowsOn(targetPage) - 1;
  }
  const rowStart = targetPage * grid.perPage + targetRow * grid.columns;
  const rowEnd = Math.min(count - 1, rowStart + grid.columns - 1);
  // A shorter last row: the same column, or its last card.
  return Math.min(rowStart + column, rowEnd);
}
