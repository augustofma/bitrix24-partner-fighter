import type {
  AmbienceConfig,
  AmbienceId,
  CrowdReactionSfx,
  MusicTrackConfig,
  MusicTrackId,
  SfxConfig,
  SfxId,
} from '../types/audio';
import type { CrowdReaction, StageConfig } from '../types/stage';

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
  'special-powerzap': sfx('special-powerzap', 0.8),
  // A light hit of a multi-hit special: at the level of a punch.
  'powerzap-hit': sfx('powerzap-hit', 0.62, true),
  'special-powerbot': sfx('special-powerbot', 0.9),
  // The crowd sits behind the fight: under the hits, above the ambience bed.
  'crowd-cheer': sfx('crowd-cheer', 0.5, true),
  'crowd-ooh': sfx('crowd-ooh', 0.45, true),
  // Announcer: over the music and the stingers, never varied (a voice must sound the same).
  'voice-round-1': sfx('voice-round-1', 0.95),
  'voice-round-2': sfx('voice-round-2', 0.95),
  'voice-round-3': sfx('voice-round-3', 0.95),
  'voice-round-4': sfx('voice-round-4', 0.95),
  'voice-round-5': sfx('voice-round-5', 0.95),
  'voice-round-6': sfx('voice-round-6', 0.95),
  'voice-round-7': sfx('voice-round-7', 0.95),
  'voice-round-8': sfx('voice-round-8', 0.95),
  'voice-round-9': sfx('voice-round-9', 0.95),
  'voice-final-round': sfx('voice-final-round', 0.95),
  'voice-fight': sfx('voice-fight', 0.95),
  'voice-ko': sfx('voice-ko', 0.95),
  'voice-perfect': sfx('voice-perfect', 0.95),
  'voice-time-over': sfx('voice-time-over', 0.95),
  'voice-draw': sfx('voice-draw', 0.95),
  'voice-you-win': sfx('voice-you-win', 0.95),
  'voice-you-lose': sfx('voice-you-lose', 0.95),
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

/*
 * Stage ambience: a quiet loop per place under the fight music (crowd, the sea, drums, birds,
 * an office hum). Synthesized for the game: scripts/ambience/generate_ambience.py.
 */

/** Master ambience level: a bed under the music, never in front of it. */
export const AMBIENCE_VOLUME = 0.3;

export const AMBIENCE_FADE = { inMs: 1200, outMs: 900 } as const;

const ambience = (id: AmbienceId, gain = 1, crowd = true): AmbienceConfig => ({ id, gain, crowd });

export const AMBIENCES: Readonly<Record<AmbienceId, AmbienceConfig>> = {
  arena: ambience('arena'),
  rio: ambience('rio', 0.9),
  recife: ambience('recife', 0.9),
  spain: ambience('spain'),
  portugal: ambience('portugal'),
  'castelo-branco': ambience('castelo-branco'),
  joinville: ambience('joinville'),
  curitiba: ambience('curitiba'),
  russia: ambience('russia'),
  // The Bitrix24 office in Moscow: no audience, so no cheers either.
  office: ambience('office', 1, false),
};

export function ambienceFiles(id: AmbienceId): string[] {
  // Ogg Vorbis first (loops gaplessly); AAC for browsers without Vorbis (Safari).
  return [`audio/ambience/${id}.ogg`, `audio/ambience/${id}.m4a`];
}

export function ambienceKey(id: AmbienceId): string {
  return `ambience:${id}`;
}

/** What the crowd shouts at each reaction: an "ooh" at a big hit, a cheer at the rest. */
export const CROWD_REACTION_SFX: Readonly<Record<CrowdReaction, CrowdReactionSfx>> = {
  bigHit: 'crowd-ooh',
  special: 'crowd-cheer',
  ko: 'crowd-cheer',
  perfect: 'crowd-cheer',
};

/** The crowd's shout for a reaction, or nothing on a stage without a crowd. */
export function crowdSfx(
  stage: Pick<StageConfig, 'ambience'>,
  reaction: CrowdReaction,
): CrowdReactionSfx | null {
  return stage.ambience && AMBIENCES[stage.ambience].crowd ? CROWD_REACTION_SFX[reaction] : null;
}
