import { describe, expect, it } from 'vitest';
import { STRINGS } from '../src/config/strings';

describe('boot loading label', () => {
  it('shows the rounded, clamped percentage', () => {
    expect(STRINGS.loading(0)).toBe('CARREGANDO  0%');
    expect(STRINGS.loading(0.374)).toBe('CARREGANDO  37%');
    expect(STRINGS.loading(1)).toBe('CARREGANDO  100%');
    expect(STRINGS.loading(1.2)).toBe('CARREGANDO  100%');
  });
});
