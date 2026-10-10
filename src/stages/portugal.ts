import { DEFAULT_STAGE_MUSIC } from '../config/audio';
import type { StageConfig } from '../types/stage';
import { partnerArena } from './partnerArena';

const ART_DIR = 'stages/portugal';

/**
 * PORTUGAL: a mosaic promenade over the Portuguese coast, with cliffs, terraced hills, a white
 * town, sailboats, Arrecife Digital banners, the crowd behind the Arrecife Digital barrier and a
 * small plane flying to the RIGHT with the "Arrecife Digital" banner trailing behind it (official
 * art, see scripts/stage-art/portugal/README.md). Filipe's fight in the story. The arena (width,
 * ground, walls) is exactly PARTNER ARENA's, so gameplay is identical; only the art changes.
 * Placements come from scripts/stage-art/portugal/prepare_portugal.py.
 */
export const portugal: StageConfig = {
  id: 'portugal',
  displayName: 'PORTUGAL',
  location: 'CALÇADÃO À BEIRA-MAR - PORTUGAL',
  width: partnerArena.width,
  groundY: partnerArena.groundY,
  wallMargin: partnerArena.wallMargin,
  // Used only by the procedural fallback when the art is not loaded.
  palette: {
    skyTop: 0x1666e6,
    skyBottom: 0x5fb0ff,
    skyline: 0x3f7f3a,
    crowd: 0x23306b,
    floor: 0xc9b597,
    floorLine: 0x2a2a3a,
    accent: 0x1f3fbf,
  },
  music: DEFAULT_STAGE_MUSIC,
  ambience: 'portugal',
  art: {
    background: { key: 'stage:portugal', path: `${ART_DIR}/background.jpg` },
    // Puts the mosaic under the fighters' feet, in front of the barrier (and keeps the art down
    // to the bottom of the screen).
    top: -64,
    crowd: {
      style: 'groups',
      // Between the flower planters (they and the lamp posts stay still).
      bands: [{ x: 80, y: 395, width: 884, height: 55 }],
      columnWidth: 20,
      barrier: { x: 103, y: 444, width: 823, height: 65 },
      flashes: { top: 393, bottom: 415 },
    },
    flyover: {
      plane: { key: 'stage:portugal:plane', path: `${ART_DIR}/plane.png` },
      propeller: {
        key: 'stage:portugal:propeller',
        path: `${ART_DIR}/propeller.png`,
        x: 113.8,
        y: 28.3,
      },
      banner: { key: 'stage:portugal:banner', path: `${ART_DIR}/banner.png` },
      skyline: { key: 'stage:portugal:skyline', path: `${ART_DIR}/skyline.png` },
      // As in the art: flying right, the banner trailing on its left.
      direction: 'right',
      // Smaller, under the HUD bars and over the cliffs; the lamp posts' banners pass in front.
      scale: 0.6,
      hook: { x: 0, y: 30.1 },
      bannerAttach: [26, 86],
      bannerGap: 37,
      bannerOffsetY: -22,
      y: 108,
      speed: 80,
      pauseMs: [3000, 10000],
      firstDelayMs: 2500,
      bannerStrips: 24,
      waveAmplitude: 1.6,
      scrollFactor: 0.1,
    },
  },
};
