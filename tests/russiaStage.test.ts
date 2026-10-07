import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FightSimulation } from '../src/core/FightSimulation';
import { augusto } from '../src/fighters/augusto';
import { joaoGuiotti } from '../src/fighters/joaoGuiotti';
import { getStageConfig } from '../src/stages/stageRegistry';
import { getStoryLocation, stageIdForLocation } from '../src/story/locations';
import {
  STORY_PROFILES,
  quickFightStageId,
  rivalLeg,
  storyLocationId,
  storyRouteFor,
} from '../src/story/storyProfiles';
import {
  arriveForFight,
  legStageId,
  recordStoryMatch,
  startStory,
  storyMatchSetup,
} from '../src/story/storyProgress';
import type { StoryProgress } from '../src/types/story';
import { FAST_TIMING, stepFrames } from './helpers';

const JOAO = 'joao-guiotti';

function untilJoao(fighterId: string): StoryProgress {
  let progress = startStory(fighterId);
  while (progress.opponent !== JOAO) progress = recordStoryMatch(arriveForFight(progress), true);
  return progress;
}

describe('RUSSIA stage, chosen by João Guiotti’s encounter', () => {
  it('exists as a stage, separate from the Russia story location', () => {
    expect(getStageConfig('russia').displayName).toBe('PRAÇA VERMELHA');
    // The location has no stage of its own: the encounter picks the arena, not the country.
    expect(getStoryLocation('russia').stageId).toBeUndefined();
    expect(stageIdForLocation('russia')).not.toBe('russia');
  });

  it('João’s encounter points to the Russia stage; the destination stays Russia', () => {
    const profile = STORY_PROFILES.find((p) => p.fighterId === JOAO);
    expect(profile).toMatchObject({ encounter: 'russia', encounterStageId: 'russia' });
    expect(storyLocationId(JOAO)).toBe('russia');
    expect(rivalLeg(JOAO)).toEqual({ opponent: JOAO, destination: 'russia', stageId: 'russia' });
  });

  it.each(['augusto', 'filipe', 'isaque-ferreira', 'romualdo'])(
    '%s: the trip lands in Russia and the match setup carries the Russia stage',
    (fighter) => {
      const fight = arriveForFight(untilJoao(fighter));
      expect(fight).toMatchObject({ currentLocation: 'russia', opponent: JOAO });
      expect(storyMatchSetup(fight, 'normal')).toMatchObject({
        cpuFighterId: JOAO,
        stageId: 'russia',
      });
    },
  );

  it('a loss (retry) keeps the Russia stage; the next leg leaves Russia with its own stage', () => {
    const fight = arriveForFight(untilJoao('augusto'));
    const lost = recordStoryMatch(fight, false);
    expect(storyMatchSetup(lost, 'normal').stageId).toBe('russia');
    const next = arriveForFight(recordStoryMatch(fight, true));
    expect(next.currentLocation).not.toBe('russia');
    expect(storyMatchSetup(next, 'normal').stageId).not.toBe('russia');
  });

  it('other encounters keep their stages', () => {
    for (const leg of storyRouteFor('joao-guiotti')!) {
      expect(legStageId(leg)).toBe(stageIdForLocation(leg.destination));
    }
    expect(legStageId(rivalLeg('augusto'))).toBe('recife');
    expect(legStageId(rivalLeg('romualdo'))).toBe('joinville');
  });

  it('the stage stays the same for every round (it is part of the match, not the round)', () => {
    const stage = getStageConfig('russia');
    const sim = new FightSimulation({
      fighters: [augusto, joaoGuiotti],
      stage,
      roundTiming: FAST_TIMING,
    });
    expect(sim.stage).toBe(stage);
    // Round 1 ends by KO; the next round starts in the same simulation and stage.
    sim.fighters[1].health = 0;
    stepFrames(sim, 400);
    expect(sim.match.currentRound).toBeGreaterThan(1);
    expect(sim.stage).toBe(stage);
  });

  it('quick fights are unchanged (no Russia stage by default); no João rule in the core', () => {
    expect(quickFightStageId(JOAO, 'fighter-b')).not.toBe('russia');
    for (const file of [
      'src/scenes/FightScene.ts',
      'src/scenes/VersusScene.ts',
      'src/scenes/story/StoryMapScene.ts',
      'src/story/storyProgress.ts',
      'src/core/FightSimulation.ts',
    ]) {
      expect(readFileSync(join(__dirname, '..', file), 'utf8'), file).not.toContain(JOAO);
    }
  });
});
