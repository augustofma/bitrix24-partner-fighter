import type { MusicTrackConfig, MusicTrackId } from '../types/audio';
import type { StageConfig } from '../types/stage';

/*
 * Music and sound levels, the track list and which track each screen plays. Original
 * soundtrack composed for the game: scripts/music/compose.py (see docs/ART_DIRECTION.md).
 */

/** Master music level: leaves room for hits, KO and announcer sounds on top. */
export const MUSIC_VOLUME = 0.55;
/** Reserved for sound effects (hits, KO, announcer) when they arrive. */
export const SFX_VOLUME = 0.85;

export const MUSIC_TRACKS: Readonly<Record<MusicTrackId, MusicTrackConfig>> = {
  'menu-theme': { id: 'menu-theme', loop: true, gain: 1 },
  'character-select-theme': { id: 'character-select-theme', loop: true, gain: 0.95 },
  'story-map-theme': { id: 'story-map-theme', loop: true, gain: 1 },
  // The fight theme is the loudest render and plays under the action: a little lower.
  'partner-summit-theme': { id: 'partner-summit-theme', loop: true, gain: 0.85 },
  'victory-sting': { id: 'victory-sting', loop: false, gain: 1 },
};

/** Track of each screen (fights take theirs from StageConfig.music). */
export const SCENE_MUSIC = {
  menu: 'menu-theme',
  characterSelect: 'character-select-theme',
  storyMap: 'story-map-theme',
  victory: 'victory-sting',
} as const satisfies Record<string, MusicTrackId>;

/** Stages without their own `music` use this one. */
export const DEFAULT_STAGE_MUSIC: MusicTrackId = 'partner-summit-theme';

/** Fight music of a stage: its own `music`, or the default theme. */
export function stageMusic(stage: Pick<StageConfig, 'music'>): MusicTrackId {
  return stage.music ?? DEFAULT_STAGE_MUSIC;
}

/** Fades between tracks (ms): no hard cuts. */
export const MUSIC_FADE = {
  outMs: 450,
  inMs: 600,
  fightInMs: 700,
  /** The fight music fading away once the match is decided. */
  matchEndOutMs: 900,
  /** Whatever is playing gets out of the way of a sting. */
  stingOutMs: 250,
} as const;

/** Loaded before the title screen; the rest loads in the background. */
export const BOOT_MUSIC: readonly MusicTrackId[] = ['menu-theme'];

export function musicFiles(id: MusicTrackId): string[] {
  // Ogg Vorbis first (loops gaplessly); AAC for browsers without Vorbis (Safari).
  return [`audio/music/${id}.ogg`, `audio/music/${id}.m4a`];
}

export function musicKey(id: MusicTrackId): string {
  return `music:${id}`;
}
