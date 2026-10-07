import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FONT_FILES, GAME_FONTS } from '../src/config/fonts';
import { FONT_ASSETS } from '../src/render/assets/fontAssets';
import { TIMER_COLORS, timerLabel, timerStyle } from '../src/ui/timerStyle';

const PUBLIC_DIR = join(__dirname, '..', 'public');

describe('typography', () => {
  it('defines every font role with a generic fallback', () => {
    expect(Object.keys(GAME_FONTS).sort()).toEqual(['ARCADE', 'BODY', 'HUD', 'PIXEL', 'TITLE']);
    for (const family of Object.values(GAME_FONTS)) {
      expect(family).toMatch(/(sans-serif|monospace)$/);
    }
  });

  it('bundles each font offline with its open-source license', () => {
    for (const font of FONT_FILES) {
      const file = join(PUBLIC_DIR, font.path);
      expect(existsSync(file), font.path).toBe(true);
      expect(font.license).toBe('OFL-1.1');
      const license = readFileSync(join(dirname(file), 'OFL.txt'), 'utf8');
      expect(license).toContain('SIL Open Font License');
    }
  });

  it('uses only bundled fonts as primary families, and loads all of them', () => {
    const bundled = new Set(FONT_FILES.map((font) => font.family));
    for (const [role, family] of Object.entries(GAME_FONTS)) {
      if (role === 'BODY') continue; // system UI font on purpose: best reading comfort
      const primary = /^"([^"]+)"/.exec(family)?.[1];
      expect(primary && bundled.has(primary), role).toBe(true);
    }
    expect(FONT_ASSETS.map((asset) => asset.key)).toEqual([...bundled]);
    expect(FONT_ASSETS.every((asset) => asset.type === 'font')).toBe(true);
  });
});

describe('fight timer', () => {
  it('stays gold and still while there is time', () => {
    for (const seconds of [99, 60, 11]) {
      expect(timerStyle(seconds)).toEqual({
        urgency: 'normal',
        color: TIMER_COLORS.normal,
        pulseScale: 1,
      });
    }
  });

  it('turns yellow, orange then red over the last ten seconds', () => {
    expect(timerStyle(10).urgency).toBe('warning');
    expect(timerStyle(7).urgency).toBe('warning');
    expect(timerStyle(6).urgency).toBe('urgent');
    expect(timerStyle(4).urgency).toBe('urgent');
    expect(timerStyle(3).urgency).toBe('critical');
    expect(timerStyle(1).color).toBe(TIMER_COLORS.critical);
  });

  it('pulses discreetly, a bit more at the very end, and rests at zero', () => {
    const pulses = [10, 6, 3, 1].map((s) => timerStyle(s).pulseScale);
    expect(pulses.every((scale) => scale > 1 && scale <= 1.15)).toBe(true);
    expect(timerStyle(2).pulseScale).toBeGreaterThan(timerStyle(8).pulseScale);
    expect(timerStyle(0).pulseScale).toBe(1);
  });

  it('always shows two digits', () => {
    expect(timerLabel(99)).toBe('99');
    expect(timerLabel(7)).toBe('07');
    expect(timerLabel(-3)).toBe('00');
  });
});
