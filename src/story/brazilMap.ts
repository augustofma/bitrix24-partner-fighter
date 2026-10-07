import type { StoryLocation } from '../types/story';

/** Area of the screen the map is drawn in (game pixels). */
export interface MapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MapPoint {
  x: number;
  y: number;
}

/** A latitude/longitude box framed by a map view. */
export interface GeoBounds {
  north: number;
  south: number;
  west: number;
  east: number;
}

/** Latitude/longitude box that frames Brazil on the map. */
export const BRAZIL_BOUNDS: GeoBounds = { north: 5.6, south: -34.2, west: -74.2, east: -34.4 };

/**
 * Simplified outline of Brazil as [longitude, latitude] vertices, clockwise from Roraima.
 * Stylized (arcade map), but the cities sit where they belong relative to each other.
 */
export const BRAZIL_OUTLINE: readonly (readonly [number, number])[] = [
  [-60.7, 5.2],
  [-57.5, 2.0],
  [-54.0, 2.2],
  [-51.6, 4.4],
  [-50.0, 1.8],
  [-48.5, -1.3],
  [-44.3, -2.5],
  [-41.0, -2.9],
  [-38.5, -3.7],
  [-35.2, -5.2],
  [-34.8, -7.1],
  [-35.0, -8.4],
  [-37.0, -11.0],
  [-38.5, -13.0],
  [-39.0, -17.9],
  [-40.3, -20.3],
  [-42.0, -22.9],
  [-43.2, -23.0],
  [-46.3, -24.0],
  [-48.5, -26.2],
  [-48.6, -28.5],
  [-50.2, -30.5],
  [-52.1, -32.2],
  [-53.4, -33.7],
  [-53.6, -31.6],
  [-55.6, -30.9],
  [-57.6, -30.2],
  [-55.7, -27.4],
  [-53.8, -27.1],
  [-54.6, -25.6],
  [-54.3, -24.0],
  [-55.7, -22.3],
  [-57.9, -22.1],
  [-58.1, -20.2],
  [-57.6, -19.0],
  [-58.2, -16.3],
  [-60.1, -15.0],
  [-60.3, -13.5],
  [-65.0, -11.8],
  [-66.6, -9.9],
  [-69.0, -11.0],
  [-70.6, -11.0],
  [-72.9, -9.4],
  [-73.8, -7.4],
  [-72.5, -5.0],
  [-70.0, -4.2],
  [-69.6, -1.1],
  [-70.0, 0.6],
  [-69.4, 1.1],
  [-67.0, 2.0],
  [-64.8, 4.0],
  [-62.7, 3.7],
];

/** Equirectangular projection of a latitude/longitude into the map rectangle. */
export function projectToMap(
  latitude: number,
  longitude: number,
  rect: MapRect,
  bounds: GeoBounds = BRAZIL_BOUNDS,
): MapPoint {
  const { north, south, west, east } = bounds;
  return {
    x: rect.x + ((longitude - west) / (east - west)) * rect.width,
    y: rect.y + ((north - latitude) / (north - south)) * rect.height,
  };
}

/** Screen position of a place on the map. */
export function locationToMap(
  location: StoryLocation,
  rect: MapRect,
  bounds: GeoBounds = BRAZIL_BOUNDS,
): MapPoint {
  return projectToMap(location.latitude, location.longitude, rect, bounds);
}

/** Any [longitude, latitude] outline in screen coordinates. */
export function projectOutline(
  outline: readonly (readonly [number, number])[],
  rect: MapRect,
  bounds: GeoBounds = BRAZIL_BOUNDS,
): MapPoint[] {
  return outline.map(([longitude, latitude]) => projectToMap(latitude, longitude, rect, bounds));
}

/** Brazil's outline in screen coordinates. */
export function brazilOutline(rect: MapRect, bounds: GeoBounds = BRAZIL_BOUNDS): MapPoint[] {
  return projectOutline(BRAZIL_OUTLINE, rect, bounds);
}

/** Even-odd point-in-polygon test (used to rasterize the pixel-art land). */
export function isInside(point: MapPoint, polygon: readonly MapPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i] as MapPoint;
    const b = polygon[j] as MapPoint;
    const crosses = a.y > point.y !== b.y > point.y;
    if (crosses && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
