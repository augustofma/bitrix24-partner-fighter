import { DEFAULT_STAGE_MUSIC } from '../config/audio';
import type { StageConfig } from '../types/stage';
import { partnerArena } from './partnerArena';

const ART_DIR = 'stages/rio-de-janeiro';

/**
 * RIO DE JANEIRO: Copacabana's wave-pattern promenade in front of Guanabara Bay, with the
 * Sugarloaf and its cable car, Christ the Redeemer, Brazilian flags and the crowd behind the
 * Inovar Consulting barriers (official art, see scripts/stage-art/rio-de-janeiro/README.md).
 * Gabriele's city in the story. The arena (width, ground, walls) is exactly PARTNER ARENA's, so
 * gameplay is identical; only the art changes.
 */
export const rioDeJaneiro: StageConfig = {
  id: 'rio-de-janeiro',
  displayName: 'RIO DE JANEIRO',
  location: 'COPACABANA - RIO DE JANEIRO, RJ',
  width: partnerArena.width,
  groundY: partnerArena.groundY,
  wallMargin: partnerArena.wallMargin,
  // Used only by the procedural fallback when the art is not loaded.
  palette: {
    skyTop: 0x2f7fe0,
    skyBottom: 0x8fc8f5,
    skyline: 0x6b5a4a,
    crowd: 0x2f6a3a,
    floor: 0xd8c8a8,
    floorLine: 0x1c2a5a,
    accent: 0xf2c230,
  },
  music: DEFAULT_STAGE_MUSIC,
  art: {
    background: { key: 'stage:rio-de-janeiro', path: `${ART_DIR}/background.jpg` },
    // Puts the promenade's wave pattern under the fighters' feet, in front of the barriers.
    top: -50,
    crowd: {
      style: 'groups',
      // The crowd behind the barriers: two big groups on the sides, a farther one in the middle.
      bands: [
        { x: 0, y: 360, width: 370, height: 58 },
        { x: 370, y: 386, width: 320, height: 32 },
        { x: 690, y: 356, width: 385, height: 62 },
      ],
      columnWidth: 20,
      barrier: { x: 0, y: 412, width: 1075, height: 86 },
      flashes: { top: 346, bottom: 384 },
    },
  },
};
