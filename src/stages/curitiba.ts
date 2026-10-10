import { DEFAULT_STAGE_MUSIC } from '../config/audio';
import type { StageConfig } from '../types/stage';
import { partnerArena } from './partnerArena';

const ART_DIR = 'stages/curitiba';

/**
 * CURITIBA: the Jardim Botânico in pixel art, Gabriel Mattozo's city, with the glass greenhouse,
 * the fountain and the French gardens, the towers behind, GMC banners and tents, the crowd behind
 * the purple barrier and a small purple plane towing the "GMC" banner (official art, see
 * scripts/stage-art/curitiba/README.md). The arena (width, ground, walls) is exactly PARTNER
 * ARENA's, so gameplay is identical; only the art changes. Placements come from
 * scripts/stage-art/curitiba/prepare_curitiba.py (stage-art pixels at the display scale).
 */
export const curitiba: StageConfig = {
  id: 'curitiba',
  displayName: 'CURITIBA',
  location: 'JARDIM BOTÂNICO - CURITIBA, PR',
  width: partnerArena.width,
  groundY: partnerArena.groundY,
  wallMargin: partnerArena.wallMargin,
  // Used only by the procedural fallback when the art is not loaded.
  palette: {
    skyTop: 0x1f6fe0,
    skyBottom: 0x7cc4ff,
    skyline: 0x3f8f3a,
    crowd: 0x3a2350,
    floor: 0x9a8a72,
    floorLine: 0x4a3f3a,
    accent: 0xa13cff,
  },
  music: DEFAULT_STAGE_MUSIC,
  ambience: 'curitiba',
  art: {
    background: { key: 'stage:curitiba', path: `${ART_DIR}/background.jpg` },
    // Puts the mosaic pavement under the fighters' feet, in front of the barrier.
    top: -40,
    crowd: {
      style: 'groups',
      // Left of the left lamp post, between the posts, right of the right one (posts stay still).
      bands: [
        { x: 0, y: 340, width: 96, height: 46 },
        { x: 135, y: 340, width: 809, height: 46 },
        { x: 984, y: 340, width: 91, height: 46 },
      ],
      columnWidth: 20,
      barrier: { x: 0, y: 383, width: 1075, height: 62 },
      flashes: { top: 336, bottom: 360 },
    },
    flyover: {
      plane: { key: 'stage:curitiba:plane', path: `${ART_DIR}/plane.png` },
      propeller: {
        key: 'stage:curitiba:propeller',
        path: `${ART_DIR}/propeller.png`,
        x: -5.1,
        y: 19.9,
      },
      banner: { key: 'stage:curitiba:banner', path: `${ART_DIR}/banner.png` },
      skyline: { key: 'stage:curitiba:skyline', path: `${ART_DIR}/skyline.png` },
      // Smaller and high, just under the HUD bars: it flies over the greenhouse domes and the
      // towers, whose tops still pass in front of it (skyline occluder).
      scale: 0.6,
      hook: { x: 84.9, y: 24.3 },
      bannerAttach: [4, 44],
      bannerGap: 6,
      bannerOffsetY: -6,
      y: 58,
      speed: 80,
      pauseMs: [3000, 10000],
      firstDelayMs: 2500,
      bannerStrips: 24,
      waveAmplitude: 1.6,
      scrollFactor: 0.1,
    },
  },
};
