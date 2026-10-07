import {
  BOOT_MUSIC,
  MUSIC_TRACKS,
  SFX,
  musicFiles,
  musicKey,
  sfxFiles,
  sfxKey,
} from '../../config/audio';
import type { MusicTrackId, SfxId } from '../../types/audio';
import type { AssetRequest } from './fighterAssets';

function audioRequest(key: string, files: string[]): AssetRequest {
  const [path = '', ...altPaths] = files;
  return { type: 'audio', key, path, altPaths };
}

const musicRequest = (id: MusicTrackId) => audioRequest(musicKey(id), musicFiles(id));

/** Every sound effect: short and light, needed from the very first menu. */
export const SFX_ASSETS: readonly AssetRequest[] = (Object.keys(SFX) as SfxId[]).map((id) =>
  audioRequest(sfxKey(id), sfxFiles(id)),
);

/** Loaded by the BootScene: the title music and every sound effect. */
export const BOOT_AUDIO_ASSETS: readonly AssetRequest[] = [
  ...BOOT_MUSIC.map(musicRequest),
  ...SFX_ASSETS,
];

/** The rest of the music, fetched in the background while the player is on the menus. */
export const BACKGROUND_AUDIO_ASSETS: readonly AssetRequest[] = (
  Object.keys(MUSIC_TRACKS) as MusicTrackId[]
)
  .filter((id) => !BOOT_MUSIC.includes(id))
  .map(musicRequest);
