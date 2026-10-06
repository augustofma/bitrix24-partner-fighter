import type { StageConfig } from '../types/stage';

/** Provisional stage, drawn procedurally by StageView until real art exists. */
export const partnerArena: StageConfig = {
  id: 'partner-arena',
  displayName: 'PARTNER ARENA',
  width: 1440,
  groundY: 470,
  wallMargin: 40,
  palette: {
    skyTop: 0x140b3a,
    skyBottom: 0x3a1c71,
    skyline: 0x24124f,
    crowd: 0x1a0f3d,
    floor: 0x2b2340,
    floorLine: 0x4d3f73,
    accent: 0x2fc6f6,
  },
};
