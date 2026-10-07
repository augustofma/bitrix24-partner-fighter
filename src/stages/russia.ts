import { DEFAULT_STAGE_MUSIC } from '../config/audio';
import type { StageConfig } from '../types/stage';
import { partnerArena } from './partnerArena';

const ART_DIR = 'stages/russia';

/**
 * RUSSIA: Moscow's Red Square at sunset in pixel art, with the Kremlin's Spasskaya tower, Saint
 * Basil's Cathedral, the crowd behind Bitrix24 barriers and a biplane towing the "Bitrix24"
 * banner (official art, see scripts/stage-art/russia/README.md). Chosen by the story encounter
 * that uses it (João Guiotti's), not by the country. The arena (width, ground, walls) is exactly
 * PARTNER ARENA's, so gameplay is identical; only the art changes. Placements come from
 * scripts/stage-art/russia/prepare_russia.py (stage-art pixels at the display scale).
 */
export const russia: StageConfig = {
  id: 'russia',
  // The VS already writes the place (RÚSSIA) above: the stage names the square.
  displayName: 'PRAÇA VERMELHA',
  location: 'MOSCOU - RÚSSIA',
  width: partnerArena.width,
  groundY: partnerArena.groundY,
  wallMargin: partnerArena.wallMargin,
  // Used only by the procedural fallback when the art is not loaded.
  palette: {
    skyTop: 0x3a78d8,
    skyBottom: 0xf2a65a,
    skyline: 0xb3262b,
    crowd: 0x2a2f55,
    floor: 0x6b5a4a,
    floorLine: 0xc89a6a,
    accent: 0x2f8bff,
  },
  music: DEFAULT_STAGE_MUSIC,
  art: {
    background: { key: 'stage:russia', path: `${ART_DIR}/background.jpg` },
    // Puts the paving stones under the fighters' feet, in front of the barriers.
    top: -40,
    crowd: {
      style: 'groups',
      bands: [
        // Left of the lamp post and right of it, up to the right lamp post.
        { x: 0, y: 403, width: 331, height: 42 },
        { x: 379, y: 403, width: 643, height: 42 },
      ],
      columnWidth: 20,
      barrier: { x: 0, y: 441, width: 1075, height: 43 },
      flashes: { top: 400, bottom: 420 },
    },
    flyover: {
      plane: { key: 'stage:russia:plane', path: `${ART_DIR}/plane.png` },
      propeller: {
        key: 'stage:russia:propeller',
        path: `${ART_DIR}/propeller.png`,
        x: -3.5,
        y: 21.9,
      },
      banner: { key: 'stage:russia:banner', path: `${ART_DIR}/banner.png` },
      skyline: { key: 'stage:russia:skyline', path: `${ART_DIR}/skyline.png` },
      // Small and high in the sky: far behind the Spasskaya tower and the domes.
      scale: 0.62,
      hook: { x: 84.9, y: 34.9 },
      bannerAttach: [2, 36],
      bannerGap: 30,
      bannerOffsetY: 18,
      y: 98,
      speed: 80,
      pauseMs: [3000, 10000],
      firstDelayMs: 2500,
      bannerStrips: 20,
      waveAmplitude: 1.6,
      scrollFactor: 0.1,
    },
  },
};
