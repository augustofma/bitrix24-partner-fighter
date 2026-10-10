import { DEFAULT_STAGE_ID } from '../stages/stageRegistry';
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
    // Fights in Recife happen at the Marco Zero.
    stageId: 'recife',
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
    // Gabriele's city (Inovar Consulting). Fights here happen on Copacabana's promenade.
    id: 'rio-de-janeiro',
    kind: 'city',
    name: 'Rio de Janeiro',
    country: HOME_COUNTRY,
    region: 'Rio de Janeiro',
    regionCode: 'RJ',
    latitude: -22.91,
    longitude: -43.17,
    // Label over the sea: inland it would cover São Paulo's.
    mapLabel: { side: 'right', dy: 0 },
    stageId: 'rio-de-janeiro',
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
    // Fights in Joinville happen at the city's gate.
    stageId: 'joinville',
  },
  {
    // Gabriel Mattozo's city. A few px from Joinville on both maps: drawn a little north-west,
    // label to the left (Joinville's goes right).
    id: 'curitiba',
    kind: 'city',
    name: 'Curitiba',
    country: HOME_COUNTRY,
    region: 'Paraná',
    regionCode: 'PR',
    latitude: -25.43,
    longitude: -49.27,
    mapNudge: { dx: -6, dy: -7 },
    mapLabel: { side: 'left', dy: -6 },
    // Fights here happen at the Jardim Botânico.
    stageId: 'curitiba',
  },
  {
    // Amanda Konrad's city (BR24). South of Joinville on both maps: drawn a little south-east,
    // label to the right.
    id: 'florianopolis',
    kind: 'city',
    name: 'Florianópolis',
    country: HOME_COUNTRY,
    region: 'Santa Catarina',
    regionCode: 'SC',
    latitude: -27.6,
    longitude: -48.55,
    mapNudge: { dx: 4, dy: 7 },
    mapLabel: { side: 'right', dy: 8 },
    // Fights here happen on the promenade by the Hercílio Luz bridge.
    stageId: 'florianopolis',
  },
  // Countries are marked at a central, recognizable point (Russia: around Moscow, where the
  // European side meets the map's frame).
  {
    id: 'portugal',
    kind: 'country',
    name: 'Portugal',
    country: 'Portugal',
    // Lisbon, on the coast: west of Castelo Branco and Spain, so the three markers stay apart.
    latitude: 38.72,
    longitude: -9.14,
    // Next to Castelo Branco and Spain on the world map: its label goes below-left, Castelo
    // Branco's above-left, Spain's above-right.
    mapLabel: { side: 'left', dy: 11 },
    // Fights here (Filipe's) happen on the seaside promenade.
    stageId: 'portugal',
  },
  {
    // Rômulo's city (he is from Arrecife Digital, but lives here). A city abroad: no region code.
    id: 'castelo-branco',
    kind: 'city',
    name: 'Castelo Branco',
    country: 'Portugal',
    latitude: 39.82,
    longitude: -7.49,
    // A few px from Lisbon and Madrid on the world map: drawn a little north, label above-left.
    mapNudge: { dx: 0, dy: -9 },
    mapLabel: { side: 'left', dy: -9 },
    // Fights here happen on the castle terrace over the town.
    stageId: 'castelo-branco',
  },
  {
    id: 'spain',
    kind: 'country',
    name: 'Espanha',
    country: 'Espanha',
    // Around Madrid: east of Portugal's marker, so both labels stay apart on the world map.
    latitude: 40.4,
    longitude: -3.7,
    mapLabel: { side: 'right', dy: -11 },
    // Fights here (Isaque's) happen at Madrid's Puerta de Alcalá.
    stageId: 'spain',
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

/** Stage of a fight held at this place: its own `stageId`, or the default stage. */
export function stageIdForLocation(id: string): string {
  return getStoryLocation(id).stageId ?? DEFAULT_STAGE_ID;
}

/** Short label for the map, select and VS screens: "RECIFE - PE", "PORTUGAL". */
export function locationLabel(location: StoryLocation): string {
  const name = location.name.toUpperCase();
  return location.kind === 'city' && location.regionCode
    ? `${name} - ${location.regionCode}`
    : name;
}

/** Place with its country, for the campaign's starting point: "RECIFE - PE · BRASIL", "RÚSSIA". */
export function locationWithCountry(location: StoryLocation): string {
  return location.kind === 'city'
    ? `${locationLabel(location)} · ${location.country.toUpperCase()}`
    : locationLabel(location);
}

/** The place's name alone, in capitals ("RECIFE", "RÚSSIA"), for route titles. */
export function locationName(location: StoryLocation): string {
  return location.name.toUpperCase();
}

export function isHomeCountry(location: StoryLocation): boolean {
  return location.country === HOME_COUNTRY;
}
