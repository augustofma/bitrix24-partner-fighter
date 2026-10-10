import { DEFAULT_STAGE_MUSIC } from '../config/audio';
import type { StageConfig } from '../types/stage';
import { partnerArena } from './partnerArena';

const ART_DIR = 'stages/florianopolis';

/**
 * FLORIANÓPOLIS: a wave-pattern stone promenade on the bay in front of the Hercílio Luz bridge,
 * with sailboats, the city and its hills, palm trees, Brazilian flags and the crowd behind the
 * BR24 barriers (official art, see scripts/stage-art/florianopolis/README.md). Amanda Konrad's
 * city in the story. The arena (width, ground, walls) is exactly PARTNER ARENA's, so gameplay is
 * identical; only the art changes.
 */
export const florianopolis: StageConfig = {
  id: 'florianopolis',
  displayName: 'FLORIANÓPOLIS',
  location: 'PONTE HERCÍLIO LUZ - FLORIANÓPOLIS, SC',
  width: partnerArena.width,
  groundY: partnerArena.groundY,
  wallMargin: partnerArena.wallMargin,
  // Used only by the procedural fallback when the art is not loaded.
  palette: {
    skyTop: 0x2f7fe0,
    skyBottom: 0x9fd0f5,
    skyline: 0x5a6a7a,
    crowd: 0x1f3f8a,
    floor: 0xd8c8a8,
    floorLine: 0x2a3a6a,
    accent: 0x2fb8f6,
  },
  music: DEFAULT_STAGE_MUSIC,
  // The crowd: the same bed as Portugal's promenade.
  ambience: 'portugal',
  art: {
    background: { key: 'stage:florianopolis', path: `${ART_DIR}/background.jpg` },
    // The art's barriers end higher than Rio's: the fighters stand on the open promenade.
    top: 0,
    crowd: {
      style: 'groups',
      // The crowd behind the barriers: the two side stands, and the fans in the middle.
      bands: [
        { x: 0, y: 290, width: 190, height: 72 },
        { x: 190, y: 318, width: 680, height: 44 },
        { x: 870, y: 290, width: 205, height: 72 },
      ],
      columnWidth: 20,
      barrier: { x: 0, y: 352, width: 1075, height: 72 },
      flashes: { top: 300, bottom: 340 },
    },
  },
};
