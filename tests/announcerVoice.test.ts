import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ANNOUNCER_VOICE, roundVoice, verdictVoice } from '../src/audio/announcerVoice';
import { combatSfx } from '../src/audio/combatSfx';
import { SFX, sfxFiles } from '../src/config/audio';
import { MAX_ROUNDS } from '../src/config/match';
import type { SfxId } from '../src/types/audio';

const voices = Object.keys(SFX).filter((id) => id.startsWith('voice-')) as SfxId[];

describe('announcer voice', () => {
  it('every line is a registered sound with both files on disk', () => {
    expect(voices.length).toBe(MAX_ROUNDS + 8);
    for (const id of voices) {
      for (const file of sfxFiles(id)) {
        expect(existsSync(join(__dirname, '..', 'public', file)), file).toBe(true);
      }
    }
  });

  it('says the round number, or FINAL ROUND', () => {
    expect(roundVoice(1, false)).toBe('voice-round-1');
    expect(roundVoice(3, false)).toBe('voice-round-3');
    expect(roundVoice(MAX_ROUNDS, false)).toBe(`voice-round-${MAX_ROUNDS}`);
    expect(roundVoice(3, true)).toBe('voice-final-round');
    for (let round = 1; round <= MAX_ROUNDS; round++) {
      expect(voices).toContain(roundVoice(round, false));
    }
  });

  it('calls FIGHT!, K.O., TIME OVER and DRAW with the fight events', () => {
    expect(combatSfx({ type: 'fightStart' })).toContain(ANNOUNCER_VOICE.fight);
    expect(combatSfx({ type: 'ko' } as never)).toContain(ANNOUNCER_VOICE.ko);
    expect(combatSfx({ type: 'timeUp' } as never)).toEqual([ANNOUNCER_VOICE.timeOver]);
    expect(combatSfx({ type: 'roundDraw' } as never)).toEqual([ANNOUNCER_VOICE.draw]);
  });

  it('the verdict is from the player side', () => {
    expect(verdictVoice(0)).toBe('voice-you-win');
    expect(verdictVoice(1)).toBe('voice-you-lose');
    expect(verdictVoice(null)).toBe('voice-draw');
  });
});
