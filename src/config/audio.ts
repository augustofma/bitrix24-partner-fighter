import type { MusicTrackConfig, MusicTrackId, SfxConfig, SfxId } from '../types/audio';
import type { StageConfig } from '../types/stage';

/*
 * Music and sound levels, the track list and which track each screen plays. Original
 * soundtrack composed for the game: scripts/music/compose.py (see docs/ART_DIRECTION.md).
 */

/** Master music level: leaves room for hits, KO and announcer sounds on top. */
export const MUSIC_VOLUME = 0.55;
/** Master level of the sound effects: each effect's own volume (SFX) applies on top. */
export const SFX_VOLUME = 1;

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

/*
 * Sound effects. Levels were set by playtest so hits, blocks and KO stay clear over the music
 * (music 0.47-0.55): hits 0.6-0.75, KO and special 0.85, movement and UI quieter.
 */
const sfx = (id: SfxId, volume: number, vary = false): SfxConfig => ({ id, volume, vary });

export const SFX: Readonly<Record<SfxId, SfxConfig>> = {
  punch: sfx('punch', 0.65, true),
  kick: sfx('kick', 0.75, true),
  'crouch-punch': sfx('crouch-punch', 0.62, true),
  'crouch-kick': sfx('crouch-kick', 0.72, true),
  'air-punch': sfx('air-punch', 0.65, true),
  'air-kick': sfx('air-kick', 0.75, true),
  block: sfx('block', 0.6, true),
  hurt: sfx('hurt', 0.65, true),
  jump: sfx('jump', 0.35, true),
  landing: sfx('landing', 0.4, true),
  ko: sfx('ko', 0.85),
  special: sfx('special', 0.85),
  'special-ready': sfx('special-ready', 0.6),
  'menu-move': sfx('menu-move', 0.45),
  'menu-confirm': sfx('menu-confirm', 0.45),
  'menu-back': sfx('menu-back', 0.45),
  'round-start': sfx('round-start', 0.7),
  fight: sfx('fight', 0.8),
  victory: sfx('victory', 0.7),
  perfect: sfx('perfect', 0.85),
  'special-zap': sfx('special-zap', 0.85),
  'special-mind': sfx('special-mind', 0.85),
  'special-vibe': sfx('special-vibe', 0.85),
  'special-gpt': sfx('special-gpt', 0.85),
  'special-fluidz': sfx('special-fluidz', 0.85),
  'special-alaio-strike': sfx('special-alaio-strike', 0.9),
  'special-n8n': sfx('special-n8n', 0.85),
  'special-190': sfx('special-190', 0.85),
};

/** Variation range of `vary` effects: playback rate 1 ± this, level 1 - [0, this]. */
export const SFX_PITCH_VARIATION = 0.06;
export const SFX_LEVEL_VARIATION = 0.1;
/**
 * The same effect asked for again within this window is ignored: a key and a tap landing in
 * the same frame, or two systems reporting one moment, give one sound.
 */
export const SFX_DEDUP_MS = 50;
/**
 * The tap that unlocks audio is also a button press: an effect asked for this shortly before
 * the unlock still plays (anything older is dropped, never played late).
 */
export const SFX_UNLOCK_GRACE_MS = 250;

export function sfxFiles(id: SfxId): string[] {
  // Ogg Vorbis first; MP3 for browsers without Vorbis (Safari).
  return [`audio/sfx/${id}.ogg`, `audio/sfx/${id}.mp3`];
}

export function sfxKey(id: SfxId): string {
  return `sfx:${id}`;
}
