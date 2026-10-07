import type { MapRect } from '../../story/brazilMap';
import type { MapViewId } from '../../story/mapViews';

/** Story map screen geometry (960x540 logical px). Pure data. */
export const STORY_MAP_LAYOUT = {
  maps: {
    /** Square: Brazil's latitude and longitude spans are about the same. */
    brazil: { x: 44, y: 62, width: 450, height: 450 },
    /** WORLD_BOUNDS is 172° x 116°: 552 x 372 keeps the same scale on both axes. */
    world: { x: 14, y: 96, width: 552, height: 372 },
  } satisfies Record<MapViewId, MapRect>,
  panel: { x: 726, top: 40 },
  routeTitle: { y: 76, maxWidth: 400 },
  leg: { y: 124 },
  challenge: { y: 162 },
  portrait: { y: 286, width: 190, height: 214 },
  name: { y: 412 },
  origin: { y: 440 },
  button: { y: 492, width: 250, height: 54 },
} as const;
