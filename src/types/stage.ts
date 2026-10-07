export interface StagePalette {
  skyTop: number;
  skyBottom: number;
  skyline: number;
  crowd: number;
  floor: number;
  floorLine: number;
  accent: number;
}

export interface StageConfig {
  id: string;
  displayName: string;
  /** Total arena width in world pixels (can be wider than the screen; the camera scrolls). */
  width: number;
  /** World Y coordinate of the ground (fighters' feet). */
  groundY: number;
  /** Closest a fighter's center can get to either arena edge. */
  wallMargin: number;
  palette: StagePalette;
  /** Illustrated art; when missing or not loaded, StageView draws the procedural stage. */
  art?: StageArt;
}

/** An image used by a stage (path relative to /public; key unique in the texture cache). */
export interface StageImage {
  key: string;
  path: string;
}

/** Rectangle in stage-art pixels (the background image's own coordinates). */
export interface StageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Procedural loops a stage performer layer can play (see render/stage/stageMotion.ts). */
export type PerformerMotion = 'headLook' | 'handGesture';

/** A small layer cut from the art that moves around a pivot (e.g. a head or a hand). */
export interface StagePerformer {
  image: StageImage;
  /** Pivot position in stage-art pixels. */
  pivotX: number;
  pivotY: number;
  /** Pivot inside the layer image, as a 0..1 fraction of its size. */
  originX: number;
  originY: number;
  motion: PerformerMotion;
}

/** Crowd bands (animated as bouncing columns cut from the background) and the barrier above them. */
export interface StageCrowd {
  bands: readonly StageRect[];
  /** Width of each bouncing column, in stage-art pixels. */
  columnWidth: number;
  /** Drawn over the columns so their lower edge never shows while they bounce. */
  barrier: StageRect;
}

/**
 * Illustrated stage (presentation only: nothing here changes the arena). The background is
 * drawn at its native size, wider than the screen, and scrolls with the parallax needed to
 * span the arena exactly.
 */
export interface StageArt {
  background: StageImage;
  /** World Y of the art's top edge. */
  top: number;
  crowd?: StageCrowd;
  performers?: readonly StagePerformer[];
}

/** How lively the stage background is: during the fight, or celebrating a round winner. */
export type StageMood = 'fight' | 'celebrate';
