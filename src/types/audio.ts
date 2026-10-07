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

/** Every sound effect (files in public/audio/sfx/<id>.ogg / .mp3). */
export type SfxId =
  | 'punch'
  | 'kick'
  | 'crouch-punch'
  | 'crouch-kick'
  | 'air-punch'
  | 'air-kick'
  | 'block'
  | 'hurt'
  | 'jump'
  | 'landing'
  | 'ko'
  | 'special'
  | 'special-ready'
  | 'menu-move'
  | 'menu-confirm'
  | 'menu-back'
  | 'round-start'
  | 'fight'
  | 'victory'
  | 'perfect'
  | 'special-zap'
  | 'special-mind';

export interface SfxConfig {
  id: SfxId;
  /** Level of this effect (0..1), before the SFX master volume. */
  volume: number;
  /** Small random pitch/level change per play, so repeated hits do not sound robotic. */
  vary: boolean;
}
