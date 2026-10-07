import type { StoryLocation, StoryProgress } from '../types/story';
import { locationToMap, type MapPoint, type MapRect } from './brazilMap';
import { getStoryLocation } from './locations';

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

/** The trip the map must animate for a campaign about to travel (null when not traveling). */
export function tripForProgress(
  progress: StoryProgress,
  rect: MapRect,
): { from: StoryLocation; to: StoryLocation; path: FlightPath } | null {
  if (progress.phase !== 'travel' || !progress.nextLocation) return null;
  const from = getStoryLocation(progress.currentLocation);
  const to = getStoryLocation(progress.nextLocation);
  return { from, to, path: flightPath(locationToMap(from, rect), locationToMap(to, rect)) };
}
