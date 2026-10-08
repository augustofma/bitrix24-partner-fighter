import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectStoryEndingAssets, storyEndingAsset } from '../src/render/assets/storyEndingAssets';
import { STORY_PROFILES, getStoryProfile } from '../src/story/storyProfiles';

/** Width and height of a JPEG, from its SOF0/SOF2 frame. */
function jpegSize(file: string): [number, number] | null {
  const data = readFileSync(file);
  for (let i = 2; i < data.length - 9; i++) {
    if (data[i] === 0xff && (data[i + 1] === 0xc0 || data[i + 1] === 0xc2)) {
      return [data.readUInt16BE(i + 7), data.readUInt16BE(i + 5)];
    }
  }
  return null;
}

describe('story endings', () => {
  it('Augusto has his ending illustration, prepared at 16:9', () => {
    const asset = storyEndingAsset(getStoryProfile('augusto'));
    expect(asset).toEqual({
      type: 'image',
      key: 'story-ending:story/endings/augusto.jpg',
      path: 'story/endings/augusto.jpg',
    });
    const file = join(__dirname, '..', 'public', asset!.path);
    expect(existsSync(file)).toBe(true);
    expect(jpegSize(file)).toEqual([1440, 810]);
  });

  it('Romualdo has his own illustration too, prepared the same way', () => {
    const asset = storyEndingAsset(getStoryProfile('romualdo'));
    expect(asset?.path).toBe('story/endings/romualdo.jpg');
    expect(jpegSize(join(__dirname, '..', 'public', asset!.path))).toEqual([1440, 810]);
  });

  it('only Augusto and Romualdo for now: the others keep the victory art ending', () => {
    const withEnding = ['augusto', 'romualdo'];
    for (const profile of STORY_PROFILES) {
      expect(storyEndingAsset(profile) !== undefined).toBe(withEnding.includes(profile.fighterId));
    }
    expect(storyEndingAsset(undefined)).toBeUndefined();
  });

  it('every declared ending is loaded once, and its file exists', () => {
    const assets = collectStoryEndingAssets([...STORY_PROFILES, ...STORY_PROFILES]);
    expect(assets).toHaveLength(STORY_PROFILES.filter((p) => p.endingArt).length);
    for (const asset of assets) {
      expect(existsSync(join(__dirname, '..', 'public', asset.path))).toBe(true);
    }
  });
});
