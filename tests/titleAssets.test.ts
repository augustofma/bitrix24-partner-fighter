import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  TITLE_ART,
  TITLE_ASSETS,
  TITLE_TEXTURE_KEYS,
  TITLE_WIND_PARTS,
  windTextureKey,
} from '../src/render/assets/titleAssets';
import { TITLE_ART_LAYOUT } from '../src/ui/title/titleArtLayout';
import {
  DEFAULT_WIND,
  WIND_STYLES,
  stripFreedom,
  stripOffset,
  windGust,
} from '../src/ui/title/windMotion';
import { jpegSize, readRgbaPng } from './png';

const publicPath = (path: string) => `public/${path}`;

describe('title screen art', () => {
  it('declares every layer with a unique key, all present on disk and loaded at boot', () => {
    const keys = TITLE_ASSETS.map((asset) => asset.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const asset of TITLE_ASSETS)
      expect(existsSync(publicPath(asset.path)), asset.path).toBe(true);
    expect(TITLE_TEXTURE_KEYS).toEqual(keys);
    for (const part of TITLE_WIND_PARTS) expect(keys).toContain(windTextureKey(part));
  });

  it('the background fills the 960x540 logical screen without distortion', () => {
    expect(jpegSize(publicPath(TITLE_ART.background.path))).toEqual({ width: 960, height: 540 });
  });

  it('logo and START are separate layers, opaque inside and see-through at the corners', () => {
    for (const asset of [TITLE_ART.logo, TITLE_ART.button]) {
      const png = readRgbaPng(publicPath(asset.path));
      expect(png.alpha(0, 0)).toBeLessThan(8);
      expect(png.alpha(png.width - 1, png.height - 1)).toBeLessThan(8);
      let opaque = 0;
      for (let x = Math.floor(png.width * 0.3); x < png.width * 0.7; x++) {
        if (png.alpha(x, Math.floor(png.height / 2)) === 255) opaque++;
      }
      expect(opaque).toBeGreaterThan(png.width * 0.2);
    }
  });

  it('logo, START and hint stay on screen; START is wide enough to tap', () => {
    const { logo, button, hint } = TITLE_ART_LAYOUT;
    for (const box of [logo, button]) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(960);
      expect(box.y + box.height).toBeLessThanOrEqual(540);
    }
    expect(logo.y + logo.height).toBeLessThan(button.y);
    expect(button.y + button.height).toBeLessThan(hint.y);
    expect(button.width).toBeGreaterThan(200);
  });

  it('João’s hair and both fighters’ clothes are wind layers matching their placement', () => {
    expect(TITLE_WIND_PARTS).toContain('joao-hair');
    expect(TITLE_WIND_PARTS.filter((p) => p.startsWith('joao-')).length).toBeGreaterThan(2);
    expect(TITLE_WIND_PARTS.filter((p) => p.startsWith('isaque-')).length).toBeGreaterThan(2);
    for (const part of TITLE_WIND_PARTS) {
      const box = TITLE_ART_LAYOUT.wind[part];
      const png = readRgbaPng(publicPath(`ui/title/wind-${part}.png`));
      expect({ width: png.width, height: png.height }).toEqual({
        width: box.width,
        height: box.height,
      });
      expect(WIND_STYLES[part], part).toBeDefined();
    }
  });
});

describe('title wind', () => {
  it('gusts rise and fall but never stop', () => {
    const samples = Array.from({ length: 600 }, (_, i) => windGust(i * 0.1));
    expect(Math.min(...samples)).toBeGreaterThan(0.5);
    expect(Math.max(...samples)).toBeLessThanOrEqual(1);
    expect(Math.max(...samples) - Math.min(...samples)).toBeGreaterThan(0.2);
  });

  it('the edge sewn to the body stays still; the free edge moves the most', () => {
    expect(stripFreedom(0, 20, 'top')).toBe(0);
    expect(stripFreedom(19, 20, 'top')).toBe(1);
    expect(stripFreedom(19, 20, 'bottom')).toBe(0);
    expect(stripFreedom(0, 20, 'bottom')).toBe(1);
    for (let t = 0; t < 10; t += 0.25) {
      expect(stripOffset(t, 0, 20, 'top', DEFAULT_WIND)).toBe(0);
    }
  });

  it('small, smooth motion: within the part’s amplitude, no jumps between frames', () => {
    for (const [part, style] of Object.entries(WIND_STYLES)) {
      expect(style.amplitude, part).toBeLessThanOrEqual(3);
      let previous = stripOffset(0, 9, 10, 'top', style);
      for (let t = 1 / 60; t < 20; t += 1 / 60) {
        const offset = stripOffset(t, 9, 10, 'top', style);
        expect(Math.abs(offset)).toBeLessThanOrEqual(style.amplitude + 1e-9);
        expect(Math.abs(offset - previous)).toBeLessThan(0.5);
        previous = offset;
      }
    }
  });

  it('the hair leans with the wind (right to left), the cloth flutters both ways', () => {
    const hair = WIND_STYLES['joao-hair']!;
    const hairOffsets = Array.from({ length: 300 }, (_, i) =>
      stripOffset(i * 0.05, 0, 20, 'bottom', hair),
    );
    // Mostly blown back: it only swings a little forward past the drawn hair.
    expect(Math.max(...hairOffsets)).toBeLessThan(hair.amplitude * 0.3);
    expect(Math.min(...hairOffsets)).toBeLessThan(-1);
    const hem = WIND_STYLES['isaque-hem']!;
    const hemOffsets = Array.from({ length: 300 }, (_, i) =>
      stripOffset(i * 0.05, 19, 20, 'top', hem),
    );
    expect(Math.max(...hemOffsets)).toBeGreaterThan(0.3);
    expect(Math.min(...hemOffsets)).toBeLessThan(-0.3);
  });

  it('neighbouring strips move a little apart (a travelling wave, not a rigid slide)', () => {
    const style = WIND_STYLES['joao-hem']!;
    const a = stripOffset(3.3, 18, 20, 'top', style);
    const b = stripOffset(3.3, 10, 20, 'top', style);
    expect(a).not.toBeCloseTo(b, 3);
  });
});
