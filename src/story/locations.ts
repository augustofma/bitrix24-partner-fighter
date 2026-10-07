import type { StoryLocation } from '../types/story';

/**
 * Cities of the story map. Adding a city: one entry here (real latitude/longitude; the map
 * projection places it), then use its id in a profile's `home` or in a route leg.
 */
export const STORY_LOCATIONS: readonly StoryLocation[] = [
  {
    id: 'recife',
    city: 'Recife',
    state: 'Pernambuco',
    stateCode: 'PE',
    latitude: -8.05,
    longitude: -34.9,
  },
  {
    id: 'sao-paulo',
    city: 'São Paulo',
    state: 'São Paulo',
    stateCode: 'SP',
    latitude: -23.55,
    longitude: -46.63,
  },
  {
    id: 'joinville',
    city: 'Joinville',
    state: 'Santa Catarina',
    stateCode: 'SC',
    latitude: -26.3,
    longitude: -48.85,
  },
];

export function getStoryLocation(id: string): StoryLocation {
  const location = STORY_LOCATIONS.find((candidate) => candidate.id === id);
  if (!location) throw new Error(`Unknown story location: "${id}"`);
  return location;
}

/** "RECIFE - PE": the short label used on the map and the VS screen. */
export function locationLabel(location: StoryLocation): string {
  return `${location.city.toUpperCase()} - ${location.stateCode}`;
}
