import type { FighterConfig } from '../../types/fighter';
import type { StageConfig } from '../../types/stage';
import { BOOT_AUDIO_ASSETS, ambienceRequest } from './audioAssets';
import { collectFighterAssets, type AssetRequest } from './fighterAssets';
import { FONT_ASSETS } from './fontAssets';
import { collectStageAssets } from './stageAssets';
import { storyEndingAsset } from './storyEndingAssets';
import { TITLE_ASSETS } from './titleAssets';
import { VICTORY_ASSETS } from './victoryAssets';

/*
 * What each moment of the game needs loaded, so the first screen does not wait for the whole
 * game: the boot takes only the menus' assets, and the heavy art (sprite sheets, stage art,
 * ending illustrations) is fetched when a screen is about to use it. Pure data: the scenes turn
 * it into loader calls (see scenes/assetLoading.ts); what is already cached is skipped.
 */

/** Title, selects and victory screen: fonts, title music and sounds, portraits and emblems. */
export function bootAssets(roster: readonly FighterConfig[]): AssetRequest[] {
  return [
    ...FONT_ASSETS,
    ...BOOT_AUDIO_ASSETS,
    ...TITLE_ASSETS,
    ...VICTORY_ASSETS,
    ...collectFighterAssets(roster, { sheets: false }),
  ];
}

/**
 * A fight: both fighters (sprite sheets included), the stage art and its ambience loop. In
 * story mode also the player's ending illustration, so the campaign's last screen never waits
 * for it.
 */
export function matchAssets(
  fighters: readonly FighterConfig[],
  stage: StageConfig,
  endingFighterId?: string,
): AssetRequest[] {
  const ending = endingFighterId ? storyEndingAsset(endingFighterId) : undefined;
  return [
    ...collectFighterAssets(fighters),
    ...collectStageAssets([stage]),
    ...(stage.ambience ? [ambienceRequest(stage.ambience)] : []),
    ...(ending ? [ending] : []),
  ];
}

/** The stage select's thumbnails: each stage's background art. */
export function stageThumbnailAssets(stages: readonly StageConfig[]): AssetRequest[] {
  return stages.flatMap(({ art }) => (art ? [{ type: 'image' as const, ...art.background }] : []));
}
