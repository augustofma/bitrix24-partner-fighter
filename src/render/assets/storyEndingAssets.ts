import type { StoryCharacterProfile } from '../../types/story';
import type { AssetRequest } from './fighterAssets';

/** Texture key of a story ending illustration (from its path, so it is unique). */
export function storyEndingTextureKey(path: string): string {
  return `story-ending:${path}`;
}

/** The ending illustration of a story profile, if it has one. */
export function storyEndingAsset(
  profile: StoryCharacterProfile | undefined,
): AssetRequest | undefined {
  if (!profile?.endingArt) return undefined;
  return { type: 'image', key: storyEndingTextureKey(profile.endingArt), path: profile.endingArt };
}

/** Every ending illustration declared by the story profiles, without duplicates. */
export function collectStoryEndingAssets(
  profiles: readonly StoryCharacterProfile[],
): AssetRequest[] {
  const requests = new Map<string, AssetRequest>();
  for (const profile of profiles) {
    const asset = storyEndingAsset(profile);
    if (asset && !requests.has(asset.key)) requests.set(asset.key, asset);
  }
  return [...requests.values()];
}
