import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import { STRINGS } from '../src/config/strings';
import { parseHint } from '../src/ui/ControlsHint';

describe('controls hint', () => {
  it('splits each command into its keys and its action', () => {
    expect(parseHint(STRINGS.selectHint)).toEqual([
      { keys: '← → ↑ ↓', action: 'lutador' },
      { keys: 'Q E', action: 'dificuldade' },
      { keys: 'ENTER', action: 'selecionar' },
      { keys: 'ESC', action: 'voltar' },
    ]);
    expect(parseHint(STRINGS.stageSelectHint)).toEqual([
      { keys: '↑ ↓ ← →', action: 'fase' },
      { keys: 'ENTER', action: 'lutar' },
      { keys: 'ESC', action: 'voltar' },
    ]);
  });

  it('a label without an action (the rival step’s P1) stays whole', () => {
    expect(parseHint(STRINGS.selectRivalHint('ISAQUE FERREIRA'))[0]).toEqual({
      keys: 'P1: ISAQUE FERREIRA',
      action: '',
    });
  });
});
