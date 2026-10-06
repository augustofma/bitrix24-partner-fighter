import type Phaser from 'phaser';

/** Phaser adds a '__BASE' frame (the whole image) to every texture. */
const BASE_FRAME_COUNT = 1;

/** Number of frames in a loaded spritesheet, or null when the texture is not available. */
export function loadedFrameCount(
  textures: Phaser.Textures.TextureManager,
  key: string,
): number | null {
  if (!textures.exists(key)) return null;
  return Math.max(0, textures.get(key).frameTotal - BASE_FRAME_COUNT);
}
