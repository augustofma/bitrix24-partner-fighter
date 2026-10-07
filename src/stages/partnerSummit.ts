import type { StageConfig } from '../types/stage';
import { partnerArena } from './partnerArena';

const ART_DIR = 'stages/partner-summit';

/**
 * "Bitrix24 Partner Summit" stage: the approved pixel-art keynote hall. The arena (width,
 * ground, walls) is exactly PARTNER ARENA's, so gameplay is identical; only the art changes.
 * Layer placements come from scripts/stage-art/partner-summit/prepare_partner_summit.py.
 */
export const partnerSummit: StageConfig = {
  id: 'partner-summit',
  displayName: 'PARTNER SUMMIT',
  width: partnerArena.width,
  groundY: partnerArena.groundY,
  wallMargin: partnerArena.wallMargin,
  // Used only by the procedural fallback when the art is not loaded.
  palette: partnerArena.palette,
  music: 'partner-summit-theme',
  art: {
    background: { key: 'stage:partner-summit', path: `${ART_DIR}/background.jpg` },
    // Puts the big LED wall title just below the HUD.
    top: 2,
    crowd: {
      bands: [
        { x: 0, y: 260, width: 370, height: 105 },
        { x: 707, y: 260, width: 368, height: 105 },
      ],
      columnWidth: 46,
      barrier: { x: 0, y: 360, width: 1075, height: 48 },
    },
    performers: [
      {
        image: { key: 'stage:partner-summit:head', path: `${ART_DIR}/president-head.png` },
        pivotX: 536,
        pivotY: 263.7,
        originX: 0.49,
        originY: 0.97,
        motion: 'headLook',
      },
      {
        image: { key: 'stage:partner-summit:hand', path: `${ART_DIR}/president-hand.png` },
        pivotX: 546.3,
        pivotY: 277.8,
        originX: 0.46,
        originY: 0.95,
        motion: 'handGesture',
      },
    ],
  },
};
