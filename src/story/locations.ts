import type { StoryLocation } from '../types/story';

/** Country of the campaigns' home cities: trips inside it use the detailed Brazil map. */
export const HOME_COUNTRY = 'Brasil';

/**
 * Places of the story map: Brazilian cities and countries abroad. Adding one: an entry here
 * (real latitude/longitude; the map projections place it), then use its id as a fighter's
 * `home` / `encounter` or as a route leg's `destination`.
 */
export const STORY_LOCATIONS: readonly StoryLocation[] = [
  {
    id: 'recife',
    kind: 'city',
    name: 'Recife',
    country: HOME_COUNTRY,
    region: 'Pernambuco',
    regionCode: 'PE',
    latitude: -8.05,
    longitude: -34.9,
  },
  {
    id: 'sao-paulo',
    kind: 'city',
    name: 'São Paulo',
    country: HOME_COUNTRY,
    region: 'São Paulo',
    regionCode: 'SP',
    latitude: -23.55,
    longitude: -46.63,
  },
  {
    id: 'joinville',
    kind: 'city',
    name: 'Joinville',
    country: HOME_COUNTRY,
    region: 'Santa Catarina',
    regionCode: 'SC',
    latitude: -26.3,
    longitude: -48.85,
  },
  // Countries are marked at a central, recognizable point (Russia: around Moscow, where the
  // European side meets the map's frame).
  {
    id: 'portugal',
    kind: 'country',
    name: 'Portugal',
    country: 'Portugal',
    latitude: 39.6,
    longitude: -8.2,
  },
  {
    id: 'russia',
    kind: 'country',
    name: 'Rússia',
    country: 'Rússia',
    latitude: 55.75,
    longitude: 37.6,
  },
];

export function getStoryLocation(id: string): StoryLocation {
  const location = STORY_LOCATIONS.find((candidate) => candidate.id === id);
  if (!location) throw new Error(`Unknown story location: "${id}"`);
  return location;
}

/** Short label for the map, select and VS screens: "RECIFE - PE", "PORTUGAL". */
export function locationLabel(location: StoryLocation): string {
  const name = location.name.toUpperCase();
  return location.kind === 'city' && location.regionCode
    ? `${name} - ${location.regionCode}`
    : name;
}

/** The place's name alone, in capitals ("RECIFE", "RÚSSIA"), for route titles. */
export function locationName(location: StoryLocation): string {
  return location.name.toUpperCase();
}

export function isHomeCountry(location: StoryLocation): boolean {
  return location.country === HOME_COUNTRY;
}
