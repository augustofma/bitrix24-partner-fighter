import { DEFAULT_STAGE_MUSIC } from '../config/audio';
import type { StageConfig } from '../types/stage';
import { partnerArena } from './partnerArena';

const ART_DIR = 'stages/bitrix24-moscow';

/**
 * BITRIX24 MOSCOU: the Bitrix24 office in Moscow at dusk, the Kremlin and Moscow City behind the
 * glass wall (official art, see scripts/stage-art/bitrix24-moscow/README.md). Dmitry's stage:
 * in the story it is only the final fight's arena (STORY_FINAL_BOSS); in the quick fight it can
 * be picked like any other. The arena is PARTNER ARENA's, so gameplay is identical.
 */
export const bitrix24Moscow: StageConfig = {
  id: 'bitrix24-moscow',
  displayName: 'BITRIX24 MOSCOU',
  location: 'SEDE BITRIX24 - MOSCOU, RÚSSIA',
  width: partnerArena.width,
  groundY: partnerArena.groundY,
  wallMargin: partnerArena.wallMargin,
  // Used only by the procedural fallback when the art is not loaded.
  palette: {
    skyTop: 0x2a1f5c,
    skyBottom: 0x6b3f8f,
    skyline: 0x1a1640,
    crowd: 0x24204a,
    floor: 0x1c2048,
    floorLine: 0x3fa9ff,
    accent: 0x2fc7f7,
  },
  music: DEFAULT_STAGE_MUSIC,
  ambience: 'office',
  art: {
    background: { key: 'stage:bitrix24-moscow', path: `${ART_DIR}/background.jpg` },
    // Puts the fighters' feet on the hall floor, around the Bitrix24 logo.
    top: -19,
  },
};
