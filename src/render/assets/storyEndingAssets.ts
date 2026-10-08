import { STORY_ENDING_ART } from '../../story/storyEndings';
import type { AssetRequest } from './fighterAssets';

/** Texture key of a story ending illustration (from its path, so it is unique). */
export function storyEndingTextureKey(path: string): string {
  return `story-ending:${path}`;
}

/** The ending illustration of a fighter, if one is registered (STORY_ENDING_ART). */
export function storyEndingAsset(
  fighterId: string,
  endings: Readonly<Record<string, string>> = STORY_ENDING_ART,
): AssetRequest | undefined {
  const path = endings[fighterId];
  if (!path) return undefined;
  return { type: 'image', key: storyEndingTextureKey(path), path };
}

/** The ending illustrations of these fighters (those that have one), without duplicates. */
export function collectStoryEndingAssets(
  fighterIds: readonly string[],
  endings: Readonly<Record<string, string>> = STORY_ENDING_ART,
): AssetRequest[] {
  const requests = new Map<string, AssetRequest>();
  for (const id of fighterIds) {
    const asset = storyEndingAsset(id, endings);
    if (asset && !requests.has(asset.key)) requests.set(asset.key, asset);
  }
  return [...requests.values()];
}
