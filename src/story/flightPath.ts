import type { StoryLocation, StoryProgress } from '../types/story';
import { locationToMap, type MapPoint, type MapRect } from './brazilMap';
import { getStoryLocation } from './locations';
import { isInternationalTrip, mapViewForTrip, type MapView, type MapViewId } from './mapViews';

/** How far the arc bulges sideways, relative to the trip's length. */
const ARC_BULGE = 0.28;

/**
 * The plane's route between two map points: a quadratic curve that bows to the side of the
 * trip (left of the direction of travel), like the travel maps of classic arcade games.
 */
export interface FlightPath {
  from: MapPoint;
  to: MapPoint;
  control: MapPoint;
  /** Position at `t` (0 = origin, 1 = destination). */
  pointAt(t: number): MapPoint;
  /** Heading in radians at `t` (0 = pointing right, screen y grows downward). */
  angleAt(t: number): number;
}

export function flightPath(from: MapPoint, to: MapPoint): FlightPath {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // Perpendicular to the left of the travel direction (in screen space).
  const control = {
    x: (from.x + to.x) / 2 + dy * ARC_BULGE,
    y: (from.y + to.y) / 2 - dx * ARC_BULGE,
  };
  return {
    from,
    to,
    control,
    pointAt(t) {
      const u = 1 - t;
      return {
        x: u * u * from.x + 2 * u * t * control.x + t * t * to.x,
        y: u * u * from.y + 2 * u * t * control.y + t * t * to.y,
      };
    },
    angleAt(t) {
      const x = 2 * (1 - t) * (control.x - from.x) + 2 * t * (to.x - control.x);
      const y = 2 * (1 - t) * (control.y - from.y) + 2 * t * (to.y - control.y);
      return Math.atan2(y, x);
    },
  };
}

/** Everything the travel map needs to animate one trip. */
export interface Trip {
  from: StoryLocation;
  to: StoryLocation;
  /** Brazil view for domestic trips, world view when the trip leaves the country. */
  view: MapView;
  /** Screen rectangle of that view. */
  rect: MapRect;
  path: FlightPath;
  international: boolean;
}

/**
 * The trip the map must animate for a campaign about to travel (null when not traveling).
 * It always leaves from `progress.currentLocation`, where the campaign really is.
 */
export function tripForProgress(
  progress: StoryProgress,
  rects: Readonly<Record<MapViewId, MapRect>>,
): Trip | null {
  if (progress.phase !== 'travel' || !progress.nextLocation) return null;
  const from = getStoryLocation(progress.currentLocation);
  const to = getStoryLocation(progress.nextLocation);
  const view = mapViewForTrip(from, to);
  const rect = rects[view.id];
  const path = flightPath(
    locationToMap(from, rect, view.bounds),
    locationToMap(to, rect, view.bounds),
  );
  return { from, to, view, rect, path, international: isInternationalTrip(from, to) };
}
