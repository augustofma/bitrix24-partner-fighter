import { describe, expect, it } from 'vitest';
import { filipe } from '../src/fighters/filipe';
import { readRgbaPng } from './png';

describe('Filipe PNG assets', () => {
  it('has a genuine transparent portrait at 240x300', () => {
    const image = readRgbaPng(`public/${filipe.assets.portrait}`);
    expect([image.width, image.height]).toEqual([240, 300]);
    expect(image.alpha(0, 0)).toBe(0);
    expect(image.alpha(120, 150)).toBeGreaterThan(0);
  });
  it('contains exactly 40 nonempty, isolated RGBA cells with safe margins', () => {
    const sheet = filipe.assets.sprite!.sheet;
    const image = readRgbaPng(`public/${sheet.path}`);
    expect([image.width, image.height]).toEqual([1536, 1120]);
    expect([sheet.frameWidth, sheet.frameHeight]).toEqual([192, 224]);
    expect((image.width / sheet.frameWidth) * (image.height / sheet.frameHeight)).toBe(40);
    for (let frame = 0; frame < 40; frame++) {
      let opaque = 0,
        marginContent = 0,
        bottom = 0;
      for (let y = 0; y < 224; y++)
        for (let x = 0; x < 192; x++) {
          if (image.alpha((frame % 8) * 192 + x, Math.floor(frame / 8) * 224 + y) === 0) continue;
          opaque++;
          bottom = Math.max(bottom, y + 1);
          if (x < 4 || x >= 188 || y < 4 || y >= 220) marginContent++;
        }
      expect(opaque, `frame ${frame} content`).toBeGreaterThan(500);
      expect(marginContent, `frame ${frame} isolation`).toBe(0);
      const airborne = [10, 11, 12, 26, 27, 28, 29, 30, 31].includes(frame);
      if (airborne) expect(bottom).toBeLessThan(216);
      else expect(bottom, `frame ${frame} ground baseline`).toBe(216);
    }
  });
});
