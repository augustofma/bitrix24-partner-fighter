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
  // Romualdo watching the sunset over Joinville, the city gate beside him.
  romualdo: 'story/endings/romualdo.jpg',
  // Aislan at the Joinville lookout, watching the sunset over the city.
  aislan: 'story/endings/aislan.jpg',
  // Romulo on a seaside promenade, watching the sunset over the beach (fighter in progress).
  romulo: 'story/endings/romulo.jpg',
};
