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
  /** Area of the stage list; its rows are sized from the number of stages (stageList). */
  listArea: { left: 648, top: 76, width: 290, height: 356 },
  fightButton: { x: 793, y: 464, width: 290, height: 56 },
  footerY: 522,
} as const;

/** Row limits of the stage list: tall rows for a few stages, compact (not tiny) for more. */
export const STAGE_LIST_RULES = {
  gap: 4,
  maxRowHeight: 62,
  /** 10 stages fit without scrolling (rows ~32 px); more than that scrolls. */
  minRowHeight: 32,
  /** Thumbnail: the row height minus this, at the art's ~16:9 crop ratio of the list. */
  thumbInset: 10,
  thumbAspect: 100 / 52,
} as const;

export interface StageList {
  left: number;
  top: number;
  width: number;
  rowHeight: number;
  gap: number;
  /** Rows shown at once: every stage when they fit, else a scrolling window. */
  visibleRows: number;
  thumbWidth: number;
  thumbHeight: number;
}

/** The list for `count` stages: as many rows as fit at minRowHeight, each as tall as allowed. */
export function stageList(count: number): StageList {
  const { left, top, width, height } = STAGE_SELECT_LAYOUT.listArea;
  const { gap, maxRowHeight, minRowHeight, thumbInset, thumbAspect } = STAGE_LIST_RULES;
  const fit = Math.max(1, Math.floor((height + gap) / (minRowHeight + gap)));
  const visibleRows = Math.max(1, Math.min(count, fit));
  const rowHeight = Math.min(maxRowHeight, (height - gap * (visibleRows - 1)) / visibleRows);
  const thumbHeight = rowHeight - thumbInset;
  return {
    left,
    top,
    width,
    rowHeight,
    gap,
    visibleRows,
    thumbWidth: thumbHeight * thumbAspect,
    thumbHeight,
  };
}

/** First stage shown in the list so the selected one is visible (centered when it can be). */
export function listWindowStart(selected: number, count: number, list: StageList): number {
  const rows = list.visibleRows;
  if (count <= rows) return 0;
  return Math.min(Math.max(0, selected - Math.floor(rows / 2)), count - rows);
}

/** Center y of list row `row` (0 = top of the visible window). */
export function listRowY(row: number, list: StageList): number {
  return list.top + list.rowHeight / 2 + row * (list.rowHeight + list.gap);
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
