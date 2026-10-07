import { BOOT_MUSIC, MUSIC_TRACKS, musicFiles, musicKey } from '../../config/audio';
import type { MusicTrackId } from '../../types/audio';
import type { AssetRequest } from './fighterAssets';

function musicRequest(id: MusicTrackId): AssetRequest {
  const [path = '', ...altPaths] = musicFiles(id);
  return { type: 'audio', key: musicKey(id), path, altPaths };
}

/** Loaded by the BootScene: only what the title screen needs. */
export const BOOT_AUDIO_ASSETS: readonly AssetRequest[] = BOOT_MUSIC.map(musicRequest);

/** Everything else, fetched in the background while the player is on the menus. */
export const BACKGROUND_AUDIO_ASSETS: readonly AssetRequest[] = (
  Object.keys(MUSIC_TRACKS) as MusicTrackId[]
)
  .filter((id) => !BOOT_MUSIC.includes(id))
  .map(musicRequest);
