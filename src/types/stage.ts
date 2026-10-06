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
  /** Optional background image (relative to /public). Procedural art is used when missing. */
  backgroundAsset?: string;
}
