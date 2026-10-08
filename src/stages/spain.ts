import { DEFAULT_STAGE_MUSIC } from '../config/audio';
import type { StageConfig } from '../types/stage';
import { partnerArena } from './partnerArena';

const ART_DIR = 'stages/spain';

/**
 * ESPANHA: Madrid's Puerta de Alcalá in pixel art, with Bitrix24 banners, fountains and flowers,
 * the Metropolis dome and palaces behind, a LED screen, Spanish flags, the crowd behind the
 * Bitrix24 barriers and a small jet towing the "Bitrix24" banner (official art, see
 * scripts/stage-art/spain/README.md). Isaque Ferreira's fight in the story. The arena (width,
 * ground, walls) is exactly PARTNER ARENA's, so gameplay is identical; only the art changes.
 * Placements come from scripts/stage-art/spain/prepare_spain.py.
 */
export const spain: StageConfig = {
  id: 'spain',
  displayName: 'MADRI',
  location: 'PUERTA DE ALCALÁ - MADRI, ESPANHA',
  width: partnerArena.width,
  groundY: partnerArena.groundY,
  wallMargin: partnerArena.wallMargin,
  // Used only by the procedural fallback when the art is not loaded.
  palette: {
    skyTop: 0x2f6fd6,
    skyBottom: 0x7fb0f0,
    skyline: 0xb39a7a,
    crowd: 0x2b3f8a,
    floor: 0x8a7a68,
    floorLine: 0x4a4038,
    accent: 0x2f6fe0,
  },
  music: DEFAULT_STAGE_MUSIC,
  art: {
    background: { key: 'stage:spain', path: `${ART_DIR}/background.jpg` },
    // Puts the wet paving under the fighters' feet, in front of the barriers.
    top: 0,
    crowd: {
      style: 'groups',
      // The two crowds, left and right of the gate's flower bed.
      bands: [
        { x: 0, y: 360, width: 360, height: 39 },
        { x: 711, y: 360, width: 364, height: 39 },
      ],
      columnWidth: 20,
      barrier: { x: 0, y: 391, width: 1075, height: 53 },
      flashes: { top: 358, bottom: 380 },
    },
    flyover: {
      // A jet: no propeller.
      plane: { key: 'stage:spain:plane', path: `${ART_DIR}/plane.png` },
      banner: { key: 'stage:spain:banner', path: `${ART_DIR}/banner.png` },
      skyline: { key: 'stage:spain:skyline', path: `${ART_DIR}/skyline.png` },
      // Under the HUD bars; the gate's statues, the dome and the trees pass in front.
      scale: 0.8,
      hook: { x: 79.1, y: 19.7 },
      bannerAttach: [4, 46],
      bannerGap: 33,
      bannerOffsetY: -4,
      y: 104,
      speed: 90,
      pauseMs: [3000, 10000],
      firstDelayMs: 2500,
      bannerStrips: 24,
      waveAmplitude: 1.6,
      scrollFactor: 0.1,
    },
  },
};
