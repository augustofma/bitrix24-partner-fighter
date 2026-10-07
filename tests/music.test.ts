import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MusicManager, type MusicBackend, type MusicHandle } from '../src/audio/MusicManager';
import {
  DEFAULT_STAGE_MUSIC,
  MUSIC_FADE,
  MUSIC_TRACKS,
  MUSIC_VOLUME,
  SCENE_MUSIC,
  SFX_VOLUME,
  musicFiles,
  stageMusic,
} from '../src/config/audio';
import { BACKGROUND_AUDIO_ASSETS, BOOT_AUDIO_ASSETS } from '../src/render/assets/audioAssets';
import { STAGES } from '../src/stages/stageRegistry';
import { partnerSummit } from '../src/stages/partnerSummit';
import type { MusicTrackId } from '../src/types/audio';

interface FakeSound extends MusicHandle {
  id: MusicTrackId;
  loop: boolean;
  playing: boolean;
  volume: number;
  end(): void;
}

class FakeBackend implements MusicBackend {
  locked = false;
  muted = false;
  loaded = new Set<MusicTrackId>(Object.keys(MUSIC_TRACKS) as MusicTrackId[]);
  readonly created: FakeSound[] = [];

  isLoaded(id: MusicTrackId): boolean {
    return this.loaded.has(id);
  }

  create(id: MusicTrackId, loop: boolean): MusicHandle | null {
    if (!this.isLoaded(id)) return null;
    let ended: (() => void) | null = null;
    const sound: FakeSound = {
      id,
      loop,
      playing: false,
      volume: 0,
      play(volume) {
        sound.playing = true;
        sound.volume = volume;
      },
      setVolume(volume) {
        sound.volume = volume;
      },
      stop() {
        sound.playing = false;
      },
      onEnded(callback) {
        ended = callback;
      },
      end() {
        sound.playing = false;
        ended?.();
      },
    };
    this.created.push(sound);
    return sound;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  playing(): FakeSound[] {
    return this.created.filter((sound) => sound.playing);
  }
}

function setup() {
  const backend = new FakeBackend();
  return { backend, music: new MusicManager(backend) };
}

const fullVolume = (id: MusicTrackId) => MUSIC_TRACKS[id].gain * MUSIC_VOLUME;

describe('MusicManager', () => {
  it('fades a theme in to its level', () => {
    const { backend, music } = setup();
    music.play('menu-theme');
    const [menu] = backend.created;
    expect(menu?.loop).toBe(true);
    expect(menu?.volume).toBe(0);
    music.update(MUSIC_FADE.inMs / 2);
    expect(menu?.volume).toBeCloseTo(fullVolume('menu-theme') / 2);
    music.update(MUSIC_FADE.inMs);
    expect(menu?.volume).toBeCloseTo(fullVolume('menu-theme'));
  });

  it('changing scene crossfades to the new track and stops the old one', () => {
    const { backend, music } = setup();
    music.play(SCENE_MUSIC.menu);
    music.update(1000);
    music.play(SCENE_MUSIC.characterSelect);
    expect(music.currentTrack).toBe('character-select-theme');
    expect(backend.playing().map((s) => s.id)).toEqual(['menu-theme', 'character-select-theme']);
    music.update(MUSIC_FADE.outMs + 1);
    expect(backend.playing().map((s) => s.id)).toEqual(['character-select-theme']);
  });

  it('never has two tracks playing by accident, even with fast scene changes', () => {
    const { backend, music } = setup();
    const tracks: MusicTrackId[] = ['menu-theme', 'character-select-theme', 'story-map-theme'];
    for (let i = 0; i < 12; i++) {
      music.play(tracks[i % tracks.length]!);
      music.update(50);
      expect(backend.playing().length).toBeLessThanOrEqual(2);
      expect(music.activeVoices).toBeLessThanOrEqual(2);
    }
    music.update(2000);
    expect(backend.playing()).toHaveLength(1);
  });

  it('re-entering a scene keeps the same track instead of starting it again', () => {
    const { backend, music } = setup();
    music.play('menu-theme');
    music.update(300);
    music.play('menu-theme');
    music.play('menu-theme');
    expect(backend.created).toHaveLength(1);
    expect(backend.playing()).toHaveLength(1);
  });

  it('waits for the browser to unlock audio, then plays only the last request', () => {
    const { backend, music } = setup();
    backend.locked = true;
    music.play('menu-theme');
    music.play('character-select-theme');
    music.playSting('victory-sting'); // a sting while locked is dropped, not played late
    music.play('menu-theme');
    expect(backend.created).toHaveLength(0);
    expect(music.currentTrack).toBe('menu-theme');
    backend.locked = false;
    music.refresh();
    music.refresh();
    expect(backend.created.map((s) => s.id)).toEqual(['menu-theme']);
  });

  it('a track still loading starts once its file arrives (and only once)', () => {
    const { backend, music } = setup();
    backend.loaded.delete('partner-summit-theme');
    music.play('partner-summit-theme');
    music.refresh();
    expect(backend.created).toHaveLength(0);
    backend.loaded.add('partner-summit-theme');
    music.refresh();
    music.refresh();
    expect(backend.created.map((s) => s.id)).toEqual(['partner-summit-theme']);
  });

  it('victory: fight music fades out, the sting plays once, then silence', () => {
    const { backend, music } = setup();
    music.play('partner-summit-theme', MUSIC_FADE.fightInMs);
    music.update(1000);
    music.stop(MUSIC_FADE.matchEndOutMs);
    music.update(MUSIC_FADE.matchEndOutMs + 1);
    expect(backend.playing()).toHaveLength(0);
    music.playSting(SCENE_MUSIC.victory);
    const sting = backend.created.at(-1)!;
    expect(sting.id).toBe('victory-sting');
    expect(sting.loop).toBe(false);
    expect(sting.volume).toBeCloseTo(fullVolume('victory-sting')); // no fade-in on a sting
    sting.end();
    expect(music.currentTrack).toBeNull();
    expect(backend.playing()).toHaveLength(0);
    // Back on the menu: the theme comes back.
    music.play('menu-theme');
    expect(backend.playing().map((s) => s.id)).toEqual(['menu-theme']);
  });

  it('volume scales every voice and mute is delegated without restarting', () => {
    const { backend, music } = setup();
    music.play('menu-theme', 0);
    const [menu] = backend.created;
    music.setVolume(0.2);
    expect(menu?.volume).toBeCloseTo(0.2 * MUSIC_TRACKS['menu-theme'].gain);
    music.setVolume(3);
    expect(music.musicVolume).toBe(1);
    music.setMuted(true);
    expect(backend.muted).toBe(true);
    expect(music.isMuted).toBe(true);
    music.setMuted(false);
    expect(backend.muted).toBe(false);
    expect(backend.created).toHaveLength(1);
    expect(menu?.playing).toBe(true);
  });
});

describe('music configuration', () => {
  it('levels leave room for sound effects', () => {
    expect(MUSIC_VOLUME).toBeGreaterThanOrEqual(0.45);
    expect(MUSIC_VOLUME).toBeLessThanOrEqual(0.65);
    expect(SFX_VOLUME).toBeGreaterThanOrEqual(0.7);
    for (const track of Object.values(MUSIC_TRACKS)) {
      expect(track.gain * MUSIC_VOLUME).toBeLessThanOrEqual(0.65);
    }
  });

  it('fades between tracks stay in the 250-900 ms range', () => {
    for (const ms of Object.values(MUSIC_FADE)) {
      expect(ms).toBeGreaterThanOrEqual(250);
      expect(ms).toBeLessThanOrEqual(900);
    }
  });

  it('the stage track comes from StageConfig.music, with a default', () => {
    expect(stageMusic(partnerSummit)).toBe('partner-summit-theme');
    expect(stageMusic({})).toBe(DEFAULT_STAGE_MUSIC);
    for (const stage of STAGES) expect(MUSIC_TRACKS[stageMusic(stage)]).toBeDefined();
  });

  it('every track is loaded once: the menu at boot, the rest in the background', () => {
    const keys = [...BOOT_AUDIO_ASSETS, ...BACKGROUND_AUDIO_ASSETS].map((a) => a.key);
    expect(new Set(keys).size).toBe(Object.keys(MUSIC_TRACKS).length);
    expect(BOOT_AUDIO_ASSETS.map((a) => a.key)).toEqual(['music:menu-theme']);
  });
});

describe('soundtrack files', () => {
  const PUBLIC = join(__dirname, '..', 'public');

  /** Length of an Ogg Vorbis file: granule position of its last page / sample rate. */
  function oggSeconds(path: string): number {
    const data = readFileSync(path);
    const last = data.lastIndexOf('OggS');
    const granule = data.readBigUInt64LE(last + 6);
    const rate = data.readUInt32LE(data.indexOf('vorbis') + 6 + 5);
    return Number(granule) / rate;
  }

  it.each(Object.keys(MUSIC_TRACKS) as MusicTrackId[])('%s exists as Ogg Vorbis and AAC', (id) => {
    for (const file of musicFiles(id)) expect(existsSync(join(PUBLIC, file)), file).toBe(true);
  });

  it('themes are real loops and the victory sting lasts 2 to 5 seconds', () => {
    for (const track of Object.values(MUSIC_TRACKS)) {
      const seconds = oggSeconds(join(PUBLIC, musicFiles(track.id)[0]!));
      if (track.loop) expect(seconds, track.id).toBeGreaterThan(20);
      else {
        expect(seconds, track.id).toBeGreaterThanOrEqual(2);
        expect(seconds, track.id).toBeLessThanOrEqual(5);
      }
    }
  });
});
