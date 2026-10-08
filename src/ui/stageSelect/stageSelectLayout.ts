/**
 * Geometry of the stage select screen (960x540 logical px), in the same frame as the character
 * select: top bar, a large preview of the highlighted stage on the left, the stage list on the
 * right and the LUTAR! button under it. Pure, so the list window is testable.
 */
export const STAGE_SELECT_LAYOUT = {
  topBarY: 40,
  backButton: { x: 84, width: 124, height: 46 },
  title: { x: 470, width: 470, height: 54 },
  stepBadge: { x: 822, width: 220, height: 42 },
  preview: { left: 24, top: 76, width: 608, height: 346 },
  /** Name and place of the highlighted stage, under the preview. */
  caption: { x: 328, nameY: 452, locationY: 482 },
  list: { left: 648, top: 76, width: 290, rowHeight: 62, gap: 9, visibleRows: 5 },
  thumb: { width: 100, height: 52 },
  fightButton: { x: 793, y: 464, width: 290, height: 56 },
  footerY: 522,
} as const;

/** First stage shown in the list so the selected one is visible (centered when it can be). */
export function listWindowStart(selected: number, count: number): number {
  const rows = STAGE_SELECT_LAYOUT.list.visibleRows;
  if (count <= rows) return 0;
  return Math.min(Math.max(0, selected - Math.floor(rows / 2)), count - rows);
}

/** Center y of list row `row` (0 = top of the visible window). */
export function listRowY(row: number): number {
  const { top, rowHeight, gap } = STAGE_SELECT_LAYOUT.list;
  return top + rowHeight / 2 + row * (rowHeight + gap);
}

/**
 * Crop of a `frameWidth` x `frameHeight` image that covers a `width` x `height` box ("cover"),
 * centered horizontally and placed at `bias` (0 top .. 1 bottom) vertically: the scale, the
 * crop rectangle (frame px) and the image position for an image with origin (0, 0).
 */
export function coverCrop(
  frameWidth: number,
  frameHeight: number,
  width: number,
  height: number,
  bias = 0.5,
): { scale: number; crop: { x: number; y: number; width: number; height: number } } {
  const scale = Math.max(width / frameWidth, height / frameHeight);
  const cropWidth = width / scale;
  const cropHeight = height / scale;
  return {
    scale,
    crop: {
      x: (frameWidth - cropWidth) / 2,
      y: (frameHeight - cropHeight) * bias,
      width: cropWidth,
      height: cropHeight,
    },
  };
}
