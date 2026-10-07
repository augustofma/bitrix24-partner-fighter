import { DEFAULT_STAGE_MUSIC } from '../config/audio';
import type { StageConfig } from '../types/stage';
import { partnerArena } from './partnerArena';

const ART_DIR = 'stages/joinville';

/**
 * JOINVILLE: the city's gate in pixel art, with the crowd behind the fences, CRMThink flags and a
 * plane towing the "CRMThink" banner (official art, see scripts/stage-art/joinville/README.md).
 * Romualdo's city. The arena (width, ground, walls) is exactly PARTNER ARENA's, so gameplay is
 * identical; only the art changes. Placements come from
 * scripts/stage-art/joinville/prepare_joinville.py (stage-art pixels at the display scale).
 */
export const joinville: StageConfig = {
  id: 'joinville',
  displayName: 'JOINVILLE',
  location: 'PÓRTICO DE JOINVILLE - SC',
  width: partnerArena.width,
  groundY: partnerArena.groundY,
  wallMargin: partnerArena.wallMargin,
  // Used only by the procedural fallback when the art is not loaded.
  palette: {
    skyTop: 0x1f78e0,
    skyBottom: 0x7cc4ff,
    skyline: 0x6b3a22,
    crowd: 0x3a3550,
    floor: 0xa0623a,
    floorLine: 0xd09060,
    accent: 0xff8a1f,
  },
  music: DEFAULT_STAGE_MUSIC,
  art: {
    background: { key: 'stage:joinville', path: `${ART_DIR}/background.jpg` },
    // Puts the paved square under the fighters' feet, in front of the planters and fences.
    top: -50,
    crowd: {
      style: 'groups',
      bands: [
        // Left of the gate (after the lamp post) and right of it (before the lamp post).
        { x: 32, y: 379, width: 134, height: 58 },
        { x: 836, y: 386, width: 219, height: 55 },
      ],
      columnWidth: 20,
      // One copy across both sides; between them it only repeats the static gate.
      barrier: { x: 32, y: 434, width: 1023, height: 25 },
      flashes: { top: 378, bottom: 400 },
    },
    flyover: {
      plane: { key: 'stage:joinville:plane', path: `${ART_DIR}/plane.png` },
      propeller: {
        key: 'stage:joinville:propeller',
        path: `${ART_DIR}/propeller.png`,
        x: -3.9,
        y: 20.3,
      },
      banner: { key: 'stage:joinville:banner', path: `${ART_DIR}/banner.png` },
      skyline: { key: 'stage:joinville:skyline', path: `${ART_DIR}/skyline.png` },
      // Small and high in the sky: far behind the gate roof and the palms.
      scale: 0.62,
      hook: { x: 104.8, y: 22.4 },
      bannerAttach: [5, 48],
      bannerGap: 21,
      bannerOffsetY: -7,
      y: 102,
      speed: 80,
      pauseMs: [3000, 10000],
      firstDelayMs: 2500,
      bannerStrips: 20,
      waveAmplitude: 1.6,
      scrollFactor: 0.1,
    },
  },
};
