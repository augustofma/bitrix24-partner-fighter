import type { MusicTrackId } from './audio';

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
  /** Real place shown on the VS screen, e.g. "MARCO ZERO - RECIFE, PE". */
  location?: string;
  /** Total arena width in world pixels (can be wider than the screen; the camera scrolls). */
  width: number;
  /** World Y coordinate of the ground (fighters' feet). */
  groundY: number;
  /** Closest a fighter's center can get to either arena edge. */
  wallMargin: number;
  palette: StagePalette;
  /** Illustrated art; when missing or not loaded, StageView draws the procedural stage. */
  art?: StageArt;
  /** Fight music of this stage (config/audio.ts DEFAULT_STAGE_MUSIC when missing). */
  music?: MusicTrackId;
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

/**
 * How the crowd columns move: 'wave' (all bounce as one travelling wave) or 'groups' (each
 * column picks its own loop, speed, size and delay: jumping, bobbing, swaying, cheering in
 * bursts, so the crowd never moves in sync).
 */
export type CrowdStyle = 'wave' | 'groups';

/** Crowd bands (animated as bouncing columns cut from the background) and the barrier above them. */
export interface StageCrowd {
  bands: readonly StageRect[];
  /** Width of each bouncing column, in stage-art pixels. */
  columnWidth: number;
  /** Drawn over the columns so their lower edge never shows while they bounce. */
  barrier: StageRect;
  /** Default 'wave'. */
  style?: CrowdStyle;
  /** Phone camera flashes over the crowd (y range of the raised hands, stage-art pixels). */
  flashes?: { top: number; bottom: number };
}

/**
 * A plane crossing the sky now and then, right to left (the way it faces in the art), towing a banner that waves like cloth. Images come
 * from the art; positions are in screen pixels (the group has its own, far parallax).
 */
export interface StageFlyover {
  plane: StageImage;
  /** Spinning propeller drawn over the plane's nose (pivot = blade center). */
  propeller: StageImage & { x: number; y: number };
  banner: StageImage;
  /**
   * The architecture against the sky (top rows of the background, sky made transparent),
   * drawn over the plane with the background's parallax: buildings, domes and palms pass in
   * FRONT of it, so it flies behind them. Same pixels as the background, placed at its origin.
   */
  skyline: StageImage;
  /** Size of the flying group (plane, banner, lines): below 1 it looks further away. */
  scale: number;
  /** Where the tow lines leave the plane (relative to the plane's top-left, unscaled art px). */
  hook: { x: number; y: number };
  /** Where the two tow lines hold the banner's leading edge: y of top and bottom (unscaled). */
  bannerAttach: readonly [number, number];
  /** Gap between the plane's tail and the banner's left edge (unscaled art px). */
  bannerGap: number;
  /** Banner top relative to the plane's top (unscaled art px). */
  bannerOffsetY: number;
  /** Plane's top edge on screen while cruising. */
  y: number;
  /** Cruise speed, screen pixels per second. */
  speed: number;
  /** Time off screen between two flights (ms), picked in this range by a visual-only RNG. */
  pauseMs: readonly [number, number];
  /** First flight starts this soon after the fight scene opens (ms). */
  firstDelayMs: number;
  /** Vertical strips the banner is cut into for its cloth wave. */
  bannerStrips: number;
  /** Largest vertical wave of the banner's tail, in screen px (the edge by the lines stays still). */
  waveAmplitude: number;
  /** Parallax of the sky group (0 = fixed to the screen, 1 = moves with the fighters). */
  scrollFactor: number;
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
  flyover?: StageFlyover;
}

/**
 * How lively the stage background is: during the fight, celebrating a round winner, or the
 * match winner (the biggest cheer).
 */
export type StageMood = 'fight' | 'celebrate' | 'victory';

/** Fight moments the crowd reacts to with a short burst (presentation only). */
export type CrowdReaction = 'bigHit' | 'special' | 'ko' | 'perfect';
