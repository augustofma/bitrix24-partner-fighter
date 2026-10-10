import { describe, expect, it } from 'vitest';
import { MENU_NEXT_KEYS, MENU_PREV_KEYS } from '../src/config/controls';
import { stepFocus } from '../src/input/menuKeys';

describe('button row focus', () => {
  it('moves along the row and wraps at both ends', () => {
    expect(stepFocus(0, 1, 2)).toBe(1);
    expect(stepFocus(1, 1, 2)).toBe(0);
    expect(stepFocus(0, -1, 2)).toBe(1);
    expect(stepFocus(2, 1, 3)).toBe(0);
    expect(stepFocus(0, -1, 3)).toBe(2);
  });

  it('stays at 0 on an empty row', () => {
    expect(stepFocus(0, 1, 0)).toBe(0);
  });

  it('answers the side arrows', () => {
    expect(MENU_PREV_KEYS).toContain('LEFT');
    expect(MENU_NEXT_KEYS).toContain('RIGHT');
  });
});
