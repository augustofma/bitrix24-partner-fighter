/** Geometry of the ending gallery (960x540 logical pixels). */
export const GALLERY_LAYOUT = {
  topBarY: 40,
  backButton: { x: 84, width: 124, height: 46 },
  title: { x: 470, width: 470, height: 54 },
  counter: { x: 822, width: 220, height: 42 },
  /** Where the cards go; their size comes from the number of entries (galleryGrid). */
  area: { left: 36, top: 82, width: 888, height: 368 },
  caption: { y: 466 },
  /** The hidden fighter teaser / reward line. */
  reward: { y: 492 },
  footerY: 522,
  /** Name plate under each thumbnail. */
  nameHeight: 28,
  gap: 16,
  maxColumns: 5,
  /** Ending art is 16:9. */
  thumbAspect: 16 / 9,
} as const;

export interface GalleryCard {
  x: number;
  y: number;
  width: number;
  /** Thumbnail height (the name plate goes under it). */
  thumbHeight: number;
}

export interface GalleryGrid {
  columns: number;
  rows: number;
  cards: GalleryCard[];
}

/** Card width for `count` entries in `columns` columns (16:9 thumbnail + name plate). */
function cardWidthFor(count: number, columns: number, layout: typeof GALLERY_LAYOUT): number {
  const { area, gap, nameHeight, thumbAspect } = layout;
  const rows = Math.max(1, Math.ceil(count / columns));
  const byWidth = (area.width - gap * (columns - 1)) / columns;
  const byHeight = ((area.height - gap * (rows - 1)) / rows - nameHeight) * thumbAspect;
  return Math.floor(Math.min(byWidth, byHeight));
}

/**
 * Cards for `count` entries: the number of columns (up to 5) that gives the largest cards,
 * fewer columns on a tie (8 entries: 4 x 2; 9 or 10: 5 x 2), centred. Top-left corners.
 */
export function galleryGrid(count: number, layout = GALLERY_LAYOUT): GalleryGrid {
  const { area, gap, nameHeight, maxColumns, thumbAspect } = layout;
  let columns = 1;
  for (let c = 2; c <= Math.min(maxColumns, Math.max(1, count)); c++) {
    if (cardWidthFor(count, c, layout) > cardWidthFor(count, columns, layout)) columns = c;
  }
  const rows = Math.max(1, Math.ceil(count / columns));
  const width = cardWidthFor(count, columns, layout);
  const thumbHeight = Math.round(width / thumbAspect);
  const cardHeight = thumbHeight + nameHeight;
  const spanX = columns * width + (columns - 1) * gap;
  const spanY = rows * cardHeight + (rows - 1) * gap;
  const left = area.left + (area.width - spanX) / 2;
  const top = area.top + (area.height - spanY) / 2;
  const cards = Array.from({ length: count }, (_, i) => ({
    x: Math.round(left + (i % columns) * (width + gap)),
    y: Math.round(top + Math.floor(i / columns) * (cardHeight + gap)),
    width,
    thumbHeight,
  }));
  return { columns, rows, cards };
}

/** Keyboard move in the gallery grid (wraps around). */
export function moveInGallery(
  index: number,
  direction: 'left' | 'right' | 'up' | 'down',
  count: number,
  columns: number,
): number {
  if (count <= 0) return index;
  const step = { left: -1, right: 1, up: -columns, down: columns }[direction];
  if (direction === 'left' || direction === 'right') return (index + step + count) % count;
  const next = index + step;
  if (next >= 0 && next < count) return next;
  // Past the top/bottom: same column on the other end.
  const column = index % columns;
  if (direction === 'down') return column;
  const lastRowStart = Math.floor((count - 1) / columns) * columns;
  return Math.min(lastRowStart + column, count - 1);
}
