import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROSTER } from '../src/fighters/roster';
import { collectStoryEndingAssets, storyEndingAsset } from '../src/render/assets/storyEndingAssets';
import { STORY_ENDING_ART } from '../src/story/storyEndings';
import { STORY_PROFILES } from '../src/story/storyProfiles';

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

const publicFile = (path: string) => join(__dirname, '..', 'public', path);

describe('story endings', () => {
  it.each(['augusto', 'filipe', 'joao-guiotti', 'isaque-ferreira', 'romualdo', 'aislan', 'romulo'])(
    '%s has his own illustration, prepared at 16:9 (1440x810)',
    (fighterId) => {
      const asset = storyEndingAsset(fighterId);
      expect(asset).toEqual({
        type: 'image',
        key: `story-ending:story/endings/${fighterId}.jpg`,
        path: `story/endings/${fighterId}.jpg`,
      });
      expect(existsSync(publicFile(asset!.path))).toBe(true);
      expect(jpegSize(publicFile(asset!.path))).toEqual([1440, 810]);
    },
  );

  it('every story character has an illustrated ending', () => {
    const withEnding = [
      'augusto',
      'filipe',
      'joao-guiotti',
      'isaque-ferreira',
      'romualdo',
      'aislan',
      'romulo',
    ];
    for (const { fighterId } of STORY_PROFILES) {
      expect(storyEndingAsset(fighterId) !== undefined).toBe(withEnding.includes(fighterId));
    }
    expect(storyEndingAsset('nobody')).toBeUndefined();
  });

  it('only fighters in the roster have their ending loaded, each once', () => {
    const ids = ROSTER.map((fighter) => fighter.id);
    const assets = collectStoryEndingAssets([...ids, ...ids]);
    const expected = Object.keys(STORY_ENDING_ART).filter((id) => ids.includes(id));
    expect(assets.map((a) => a.path).sort()).toEqual(
      expected.map((id) => STORY_ENDING_ART[id]!).sort(),
    );
  });

  it('an ending registered ahead of its fighter (Romulo) is picked up once he joins', () => {
    // Without him in the roster his art is not loaded...
    if (!ROSTER.some((f) => f.id === 'romulo')) {
      expect(collectStoryEndingAssets(ROSTER.map((f) => f.id)).map((a) => a.path)).not.toContain(
        'story/endings/romulo.jpg',
      );
    }
    // ...and as soon as a fighter with that id is in it, it is.
    expect(collectStoryEndingAssets(['romulo']).map((a) => a.path)).toEqual([
      'story/endings/romulo.jpg',
    ]);
  });
});
