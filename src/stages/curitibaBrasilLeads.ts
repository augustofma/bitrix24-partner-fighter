import { DEFAULT_STAGE_MUSIC } from '../config/audio';
import type { StageConfig } from '../types/stage';
import { partnerArena } from './partnerArena';

const ART_DIR = 'stages/curitiba-brasil-leads';

/**
 * CURITIBA BRASIL LEADS: the Jardim Botânico again, dressed for Rodolfo: a petit-pavé plaza in
 * front of the greenhouse, fountains and flower beds, an araucaria, the skyline, Brazilian
 * flags and the crowd behind the Brasil Leads barriers, pennants and banners (official art, see
 * scripts/stage-art/curitiba-brasil-leads/README.md). Like JOINVILLE ZOPU next to JOINVILLE: the
 * same city, a second stage. The arena is exactly PARTNER ARENA's; only the art changes.
 */
export const curitibaBrasilLeads: StageConfig = {
  id: 'curitiba-brasil-leads',
  displayName: 'CURITIBA BRASIL LEADS',
  location: 'JARDIM BOTÂNICO - CURITIBA, PR',
  width: partnerArena.width,
  groundY: partnerArena.groundY,
  wallMargin: partnerArena.wallMargin,
  // Used only by the procedural fallback when the art is not loaded.
  palette: {
    skyTop: 0x2f7fe0,
    skyBottom: 0x9fd0f5,
    skyline: 0x8a8aa6,
    crowd: 0x1c2550,
    floor: 0xc9a77a,
    floorLine: 0x2a2f55,
    accent: 0xe0b03a,
  },
  music: DEFAULT_STAGE_MUSIC,
  ambience: 'curitiba',
  art: {
    background: { key: 'stage:curitiba-brasil-leads', path: `${ART_DIR}/background.jpg` },
    // The barriers end above the ground line: the fighters stand on the plaza, in front of them.
    top: 0,
    crowd: {
      style: 'groups',
      // Two crowds behind the barriers, left and right of the fountain stairs.
      bands: [
        { x: 0, y: 322, width: 400, height: 62 },
        { x: 673, y: 322, width: 402, height: 62 },
      ],
      columnWidth: 20,
      barrier: { x: 0, y: 378, width: 1075, height: 66 },
      flashes: { top: 330, bottom: 370 },
    },
  },
};
