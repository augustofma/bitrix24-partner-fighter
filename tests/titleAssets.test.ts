import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TITLE_ART, TITLE_ASSETS } from '../src/render/assets/titleAssets';
import { jpegSize, readRgbaPng } from './png';

const publicPath = (path: string) => `public/${path}`;

describe('title screen art', () => {
  it('declares the three layers with unique keys, all present on disk', () => {
    expect(new Set(TITLE_ASSETS.map((asset) => asset.key)).size).toBe(3);
    for (const asset of TITLE_ASSETS) expect(existsSync(publicPath(asset.path))).toBe(true);
  });

  it('the background fills the 960x540 logical screen without distortion', () => {
    expect(jpegSize(publicPath(TITLE_ART.background.path))).toEqual({ width: 960, height: 540 });
  });

  it('logo and button are separate layers with transparent surroundings', () => {
    for (const asset of [TITLE_ART.logo, TITLE_ART.button]) {
      const png = readRgbaPng(publicPath(asset.path));
      expect(png.alpha(0, 0)).toBe(0);
      expect(png.alpha(png.width - 1, png.height - 1)).toBe(0);
      expect(png.alpha(Math.floor(png.width / 2), Math.floor(png.height / 2))).toBe(255);
    }
  });
});
