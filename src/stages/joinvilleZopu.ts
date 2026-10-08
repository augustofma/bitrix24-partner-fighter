import { DEFAULT_STAGE_MUSIC } from '../config/audio';
import type { StageConfig } from '../types/stage';
import { joinville } from './joinville';

const ART_DIR = 'stages/joinville-zopu';

/**
 * JOINVILLE (ZOPU): the same city gate as Romualdo's JOINVILLE, dressed for Aislan's fight with
 * ZOPU flags and banners and a plane towing the white "zopu" banner (official art, see
 * scripts/stage-art/joinville-zopu/README.md). Same composition, so the crowd bands, barrier and
 * flight placements are Joinville's; the arena is PARTNER ARENA's (identical gameplay).
 * Placements come from scripts/stage-art/joinville-zopu/prepare_joinville_zopu.py.
 */
export const joinvilleZopu: StageConfig = {
  ...joinville,
  id: 'joinville-zopu',
  // Told apart from Romualdo's JOINVILLE in the stage select.
  displayName: 'JOINVILLE ZOPU',
  // Used only by the procedural fallback when the art is not loaded.
  palette: { ...joinville.palette, accent: 0x22c55e },
  music: DEFAULT_STAGE_MUSIC,
  art: {
    ...joinville.art!,
    background: { key: 'stage:joinville-zopu', path: `${ART_DIR}/background.jpg` },
    flyover: {
      ...joinville.art!.flyover!,
      plane: { key: 'stage:joinville-zopu:plane', path: `${ART_DIR}/plane.png` },
      propeller: {
        key: 'stage:joinville-zopu:propeller',
        path: `${ART_DIR}/propeller.png`,
        x: -3.9,
        y: 20.6,
      },
      banner: { key: 'stage:joinville-zopu:banner', path: `${ART_DIR}/banner.png` },
      skyline: { key: 'stage:joinville-zopu:skyline', path: `${ART_DIR}/skyline.png` },
      hook: { x: 101.6, y: 20.9 },
      bannerGap: 21.9,
      bannerOffsetY: -7.1,
    },
  },
};
