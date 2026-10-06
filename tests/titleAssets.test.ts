import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TITLE_ART, TITLE_ASSETS } from '../src/render/assets/titleAssets';
import { readRgbaPng } from './png';

const publicPath = (path: string) => `public/${path}`;

/** JPEG frame size from the first SOF marker. */
function jpegSize(path: string): { width: number; height: number } {
  const file = readFileSync(path);
  for (let offset = 2; offset < file.length;) {
    const marker = file[offset + 1]!;
    const length = file.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc2) {
      return { height: file.readUInt16BE(offset + 5), width: file.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  throw new Error('No SOF marker');
}

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
