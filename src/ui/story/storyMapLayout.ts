import type { MapRect } from '../../story/brazilMap';

/** Story map screen geometry (960x540 logical px). Pure data. */
export const STORY_MAP_LAYOUT = {
  /** Square: Brazil's latitude and longitude spans are about the same. */
  map: { x: 44, y: 62, width: 450, height: 450 } satisfies MapRect,
  panel: { x: 726, top: 40 },
  routeTitle: { y: 76, maxWidth: 400 },
  leg: { y: 124 },
  challenge: { y: 162 },
  portrait: { y: 286, width: 190, height: 214 },
  name: { y: 412 },
  origin: { y: 440 },
  button: { y: 492, width: 250, height: 54 },
} as const;
