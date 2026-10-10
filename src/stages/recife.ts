import { DEFAULT_STAGE_MUSIC } from '../config/audio';
import type { StageConfig } from '../types/stage';
import { partnerArena } from './partnerArena';

const ART_DIR = 'stages/recife';

/**
 * RECIFE: the Marco Zero square in pixel art (official art, see
 * scripts/stage-art/recife/README.md). The arena (width, ground, walls) is exactly PARTNER
 * ARENA's, so gameplay is identical; only the art changes. Placements come from
 * scripts/stage-art/recife/prepare_recife.py (stage-art pixels at the display scale).
 */
export const recife: StageConfig = {
  id: 'recife',
  displayName: 'RECIFE',
  location: 'MARCO ZERO - RECIFE, PE',
  width: partnerArena.width,
  groundY: partnerArena.groundY,
  wallMargin: partnerArena.wallMargin,
  // Used only by the procedural fallback when the art is not loaded.
  palette: {
    skyTop: 0x1f6fe0,
    skyBottom: 0x6fb8ff,
    skyline: 0xd9b45a,
    crowd: 0x3a3550,
    floor: 0xb8643a,
    floorLine: 0xe0a070,
    accent: 0x2fe0ff,
  },
  music: DEFAULT_STAGE_MUSIC,
  ambience: 'recife',
  art: {
    background: { key: 'stage:recife', path: `${ART_DIR}/background.jpg` },
    // Puts the Marco Zero floor under the fighters' feet, in front of the barrier.
    top: -12,
    crowd: {
      style: 'groups',
      bands: [
        // Under the beach umbrellas: start below the canopies so they never bounce.
        { x: 0, y: 380, width: 172, height: 40 },
        { x: 172, y: 364, width: 903, height: 56 },
      ],
      columnWidth: 20,
      barrier: { x: 0, y: 415, width: 1075, height: 40 },
      flashes: { top: 362, bottom: 388 },
    },
    flyover: {
      plane: { key: 'stage:recife:plane', path: `${ART_DIR}/plane.png` },
      propeller: {
        key: 'stage:recife:propeller',
        path: `${ART_DIR}/propeller.png`,
        x: -3.5,
        y: 25.4,
      },
      banner: { key: 'stage:recife:banner', path: `${ART_DIR}/banner.png` },
      skyline: { key: 'stage:recife:skyline', path: `${ART_DIR}/skyline.png` },
      // Smaller than in the art and high in the sky: far behind the buildings.
      scale: 0.62,
      hook: { x: 84, y: 31 },
      bannerAttach: [3, 44],
      bannerGap: 23,
      bannerOffsetY: 2,
      y: 98,
      speed: 80,
      pauseMs: [3000, 10000],
      firstDelayMs: 2500,
      bannerStrips: 24,
      waveAmplitude: 1.6,
      scrollFactor: 0.1,
    },
  },
};
