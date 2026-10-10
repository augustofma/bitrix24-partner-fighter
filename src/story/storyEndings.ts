/*
 * Story mode endings: the illustration shown full screen when a fighter completes their
 * campaign (CampaignCompleteScene). Plain data keyed by fighter id, apart from the story
 * profiles, so an ending can be registered before its fighter joins the roster: it is only
 * loaded and shown once a fighter with that id exists. Fighters without one get the standard
 * ending (the victory art with their card). Paths are under public/.
 */
export const STORY_ENDING_ART: Readonly<Record<string, string>> = {
  // Augusto watching the sunset on the Recife waterfront, back home.
  augusto: 'story/endings/augusto.jpg',
  // Filipe at a Lisbon miradouro, watching the sunset over the Tagus and the bridge.
  filipe: 'story/endings/filipe.jpg',
  // João Guiotti on a balcony, watching the sunset over a riverside city.
  'joao-guiotti': 'story/endings/joao-guiotti.jpg',
  // Isaque Ferreira on a Madrid balcony, watching the sunset over the Royal Palace and the city.
  'isaque-ferreira': 'story/endings/isaque-ferreira.jpg',
  // Gabriel Mattozo at a Curitiba lookout, the Jardim Botânico greenhouse beside him.
  'gabriel-mattozo': 'story/endings/gabriel-mattozo.jpg',
  // Gabriele at a Rio de Janeiro lookout, the Sugarloaf and Christ the Redeemer at sunset.
  gabriele: 'story/endings/gabriele.jpg',
  // Romualdo watching the sunset over Joinville, the city gate beside him.
  romualdo: 'story/endings/romualdo.jpg',
  // Aislan at the Joinville lookout, watching the sunset over the city.
  aislan: 'story/endings/aislan.jpg',
  // Romulo on a seaside promenade, watching the sunset over the beach (fighter in progress).
  romulo: 'story/endings/romulo.jpg',
};
