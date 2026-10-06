/**
 * Geometry of the character select screen (960x540 logical px). Pure, so the grid math is
 * testable and the scene only places things.
 */
export const SELECT_LAYOUT = {
  topBarY: 40,
  backButton: { x: 84, width: 124, height: 46 },
  title: { x: 470, width: 470, height: 54 },
  pager: { x: 860, buttonWidth: 40, height: 40, gap: 46 },
  /** Shows the CPU opponent when the pager does not need the spot. */
  opponentBadge: { x: 822, width: 220, height: 42 },
  grid: { left: 24, top: 82, columns: 3, rows: 2, cardWidth: 196, cardHeight: 166, gap: 12 },
  hero: { left: 648, top: 82, width: 290, height: 344 },
  selectButton: { x: 793, y: 464, width: 290, height: 56 },
  difficulty: { x: 330, y: 464, width: 612, height: 56 },
  footerY: 522,
} as const;

export const CARDS_PER_PAGE = SELECT_LAYOUT.grid.columns * SELECT_LAYOUT.grid.rows;

export interface CardSlot {
  /** Card center. */
  x: number;
  y: number;
  page: number;
}

/** Where roster entry `index` goes: row-major within its page. */
export function cardSlot(index: number): CardSlot {
  const { left, top, columns, cardWidth, cardHeight, gap } = SELECT_LAYOUT.grid;
  const page = Math.floor(index / CARDS_PER_PAGE);
  const inPage = index - page * CARDS_PER_PAGE;
  const column = inPage % columns;
  const row = Math.floor(inPage / columns);
  return {
    x: left + cardWidth / 2 + column * (cardWidth + gap),
    y: top + cardHeight / 2 + row * (cardHeight + gap),
    page,
  };
}

export function pageCount(entries: number): number {
  return Math.max(1, Math.ceil(entries / CARDS_PER_PAGE));
}

/** Empty "coming soon" slots needed to fill the last page, so the grid never looks broken. */
export function fillerSlots(entries: number): number {
  return pageCount(entries) * CARDS_PER_PAGE - entries;
}
