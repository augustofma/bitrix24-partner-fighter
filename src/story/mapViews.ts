import type { StoryLocation } from '../types/story';
import { BRAZIL_BOUNDS, BRAZIL_OUTLINE, type GeoBounds } from './brazilMap';
import { isHomeCountry } from './locations';
import { WORLD_LANDMASSES, type Outline } from './worldOutlines';

/*
 * The travel map has two framings. Trips that stay in Brazil use the detailed Brazil view
 * (unchanged); any trip touching a place abroad uses the world view, where Brazil is still
 * highlighted as the campaign's home. Pure data: the scene picks the screen rectangle.
 */

export type MapViewId = 'brazil' | 'world';

export interface MapView {
  id: MapViewId;
  bounds: GeoBounds;
  /** Land drawn in the regular land colors. */
  landmasses: readonly Outline[];
  /** Brazil, drawn brighter on top (the home country stays easy to spot). */
  home: Outline;
  /** Faint dashed reference parallels (Equator, tropics). */
  referenceLatitudes: readonly number[];
  /** Flight time on this map: crossing an ocean takes a little longer. */
  flightMs: number;
}

/**
 * The world framing: from Central America to Western Asia, from the Arctic Circle to the
 * south of Brazil. Same degrees-per-pixel on both axes for an undistorted map (see layout).
 */
export const WORLD_BOUNDS: GeoBounds = { north: 74, south: -42, west: -92, east: 80 };

export const BRAZIL_VIEW: MapView = {
  id: 'brazil',
  bounds: BRAZIL_BOUNDS,
  landmasses: [],
  home: BRAZIL_OUTLINE,
  referenceLatitudes: [0, -23.44],
  flightMs: 3000,
};

export const WORLD_VIEW: MapView = {
  id: 'world',
  bounds: WORLD_BOUNDS,
  landmasses: WORLD_LANDMASSES,
  home: BRAZIL_OUTLINE,
  referenceLatitudes: [23.44, 0, -23.44],
  flightMs: 4400,
};

/** Domestic trips keep the Brazil map; anything abroad goes to the world map. */
export function mapViewForTrip(from: StoryLocation, to: StoryLocation): MapView {
  return isHomeCountry(from) && isHomeCountry(to) ? BRAZIL_VIEW : WORLD_VIEW;
}

export function isInternationalTrip(from: StoryLocation, to: StoryLocation): boolean {
  return mapViewForTrip(from, to).id === 'world';
}

/** Whether a place falls inside the view's frame (places outside are not drawn). */
export function viewShows(view: MapView, location: StoryLocation): boolean {
  const { north, south, west, east } = view.bounds;
  return (
    location.latitude <= north &&
    location.latitude >= south &&
    location.longitude >= west &&
    location.longitude <= east
  );
}
