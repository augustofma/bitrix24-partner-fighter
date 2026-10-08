import { DEFAULT_STAGE_MUSIC } from '../config/audio';
import type { StageConfig } from '../types/stage';
import { partnerArena } from './partnerArena';

const ART_DIR = 'stages/castelo-branco';

/**
 * CASTELO BRANCO: a terrace of the castle walls over the town in Portugal where Rômulo
 * (Arrecife Digital) lives, with the red roofs and the hills behind, a stone tower with Arrecife
 * Digital banners, the crowd behind the Arrecife Digital barrier and a small plane towing the
 * "Arrecife Digital" banner (official art, see scripts/stage-art/castelo-branco/README.md). The
 * arena (width, ground, walls) is exactly PARTNER ARENA's, so gameplay is identical; only the art
 * changes. Placements come from scripts/stage-art/castelo-branco/prepare_castelo_branco.py
 * (stage-art pixels at the display scale).
 */
export const casteloBranco: StageConfig = {
  id: 'castelo-branco',
  displayName: 'CASTELO BRANCO',
  location: 'CASTELO BRANCO - PORTUGAL',
  width: partnerArena.width,
  groundY: partnerArena.groundY,
  wallMargin: partnerArena.wallMargin,
  // Used only by the procedural fallback when the art is not loaded.
  palette: {
    skyTop: 0x1f63d6,
    skyBottom: 0x7fb6f2,
    skyline: 0xc2563a,
    crowd: 0x2b3a6b,
    floor: 0x8a7556,
    floorLine: 0xc9a979,
    accent: 0x1f3c88,
  },
  music: DEFAULT_STAGE_MUSIC,
  art: {
    background: { key: 'stage:castelo-branco', path: `${ART_DIR}/background.jpg` },
    // Puts the terrace's paving under the fighters' feet, in front of the stone wall (and keeps
    // the art down to the bottom of the screen).
    top: -62,
    crowd: {
      style: 'groups',
      // The crowd behind the barrier, from the left post to the tower's stairs.
      bands: [{ x: 0, y: 379, width: 862, height: 53 }],
      columnWidth: 20,
      barrier: { x: 0, y: 428, width: 862, height: 54 },
      flashes: { top: 378, bottom: 400 },
    },
    flyover: {
      plane: { key: 'stage:castelo-branco:plane', path: `${ART_DIR}/plane.png` },
      propeller: {
        key: 'stage:castelo-branco:propeller',
        path: `${ART_DIR}/propeller.png`,
        x: -4.2,
        y: 19.6,
      },
      banner: { key: 'stage:castelo-branco:banner', path: `${ART_DIR}/banner.png` },
      skyline: { key: 'stage:castelo-branco:skyline', path: `${ART_DIR}/skyline.png` },
      // A bit smaller than in the art, high over the town: behind the tree, tower and flags.
      scale: 0.7,
      hook: { x: 105.5, y: 30.6 },
      bannerAttach: [2, 34],
      bannerGap: 11,
      bannerOffsetY: 12,
      y: 98,
      speed: 80,
      pauseMs: [3000, 10000],
      firstDelayMs: 2500,
      bannerStrips: 24,
      waveAmplitude: 1.6,
      scrollFactor: 0.1,
    },
  },
};
