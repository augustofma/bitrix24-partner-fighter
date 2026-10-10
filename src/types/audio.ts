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
  | 'special-mind'
  | 'special-vibe'
  | 'special-gpt'
  | 'special-fluidz'
  | 'special-alaio-strike'
  | 'special-n8n'
  | 'special-190'
  // Crowd reactions (stages with a crowd only).
  | 'crowd-cheer'
  | 'crowd-ooh'
  // Announcer voice (scripts/voice/generate_announcer.py).
  | 'voice-round-1'
  | 'voice-round-2'
  | 'voice-round-3'
  | 'voice-round-4'
  | 'voice-round-5'
  | 'voice-round-6'
  | 'voice-round-7'
  | 'voice-round-8'
  | 'voice-round-9'
  | 'voice-final-round'
  | 'voice-fight'
  | 'voice-ko'
  | 'voice-perfect'
  | 'voice-time-over'
  | 'voice-draw'
  | 'voice-you-win'
  | 'voice-you-lose';

export interface SfxConfig {
  id: SfxId;
  /** Level of this effect (0..1), before the SFX master volume. */
  volume: number;
  /** Small random pitch/level change per play, so repeated hits do not sound robotic. */
  vary: boolean;
}

/** Every stage ambience loop (files in public/audio/ambience/<id>.ogg / .m4a). */
export type AmbienceId =
  | 'arena'
  | 'rio'
  | 'recife'
  | 'spain'
  | 'portugal'
  | 'castelo-branco'
  | 'joinville'
  | 'curitiba'
  | 'russia'
  | 'office';

export interface AmbienceConfig {
  id: AmbienceId;
  /** Per-loop level that evens out the loops; multiplied by AMBIENCE_VOLUME. */
  gain: number;
  /** There is a crowd in it: big moments get a cheer on top (crowd-cheer / crowd-ooh). */
  crowd: boolean;
}

/** The crowd's shouts. */
export type CrowdReactionSfx = Extract<SfxId, 'crowd-cheer' | 'crowd-ooh'>;
