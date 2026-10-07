/** Every music track of the game (files in public/audio/music/<id>.ogg / .m4a). */
export type MusicTrackId =
  | 'menu-theme'
  | 'character-select-theme'
  | 'partner-summit-theme'
  | 'story-map-theme'
  | 'victory-sting';

export interface MusicTrackConfig {
  id: MusicTrackId;
  /** Loops forever (themes) or plays once (stings). */
  loop: boolean;
  /** Per-track level that evens out the tracks; multiplied by the music volume. */
  gain: number;
}
