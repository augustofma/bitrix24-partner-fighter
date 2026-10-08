import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dmitry } from '../src/fighters/dmitry';
import { ROSTER, getPlayableFighters } from '../src/fighters/roster';
import { collectStageAssets } from '../src/render/assets/stageAssets';
import { bitrix24Moscow } from '../src/stages/bitrix24Moscow';
import { getSelectableStages, getStageConfig } from '../src/stages/stageRegistry';
import { STORY_LOCATIONS } from '../src/story/locations';
import {
  STORY_FINAL_BOSS,
  STORY_PROFILES,
  campaignOpponents,
  hasStoryCampaign,
  isStoryRival,
  isFinalBossEncounter,
  quickFightStageId,
  storyRouteFor,
} from '../src/story/storyProfiles';
import {
  arriveForFight,
  recordStoryMatch,
  startStory,
  storyMatchSetup,
} from '../src/story/storyProgress';
import type { FighterConfig } from '../src/types/fighter';

const STAGE = 'bitrix24-moscow';
const usesStage = (fighterId: string) =>
  (storyRouteFor(fighterId) ?? []).filter((leg) => leg.stageId === STAGE);

/** Temporarily varies only the selection flag of the real boss. */
function withDmitry(playable: boolean, body: () => void): void {
  const roster = ROSTER as FighterConfig[];
  const original = [...roster];
  try {
    roster.splice(
      roster.findIndex((f) => f.id === dmitry.id),
      1,
      { ...dmitry, playable },
    );
    body();
  } finally {
    roster.splice(0, roster.length, ...original);
  }
}

describe('BITRIX24 MOSCOU stage', () => {
  it('is registered with its own art, prepared at the stages’ display size', () => {
    expect(getStageConfig(STAGE)).toBe(bitrix24Moscow);
    expect(bitrix24Moscow.displayName).toBe('BITRIX24 MOSCOU');
    const assets = collectStageAssets([bitrix24Moscow]);
    expect(assets.map((a) => a.path)).toEqual(['stages/bitrix24-moscow/background.jpg']);
    const file = join(__dirname, '..', 'public', 'stages/bitrix24-moscow/background.jpg');
    expect(existsSync(file)).toBe(true);
    // JPEG SOF0/SOF2 frame: height and width of the image.
    const data = readFileSync(file);
    let size: [number, number] | null = null;
    for (let i = 2; i < data.length - 9; i++) {
      if (data[i] === 0xff && (data[i + 1] === 0xc0 || data[i + 1] === 0xc2)) {
        size = [data.readUInt16BE(i + 7), data.readUInt16BE(i + 5)];
        break;
      }
    }
    expect(size).toEqual([1075, 605]);
  });

  it('can be picked in the quick fight (stage select)', () => {
    expect(getSelectableStages().map((s) => s.id)).toContain(STAGE);
  });

  it('is never a quick-fight suggestion nor a story place’s stage', () => {
    expect(STORY_LOCATIONS.some((location) => location.stageId === STAGE)).toBe(false);
    for (const a of getPlayableFighters()) {
      for (const b of getPlayableFighters()) expect(quickFightStageId(a.id, b.id)).not.toBe(STAGE);
    }
  });

  it('without Dmitry in the roster no campaign uses it (and the campaigns are unchanged)', () => {
    const roster = ROSTER as FighterConfig[];
    const index = roster.findIndex((f) => f.id === dmitry.id);
    roster.splice(index, 1);
    try {
      for (const { fighterId } of STORY_PROFILES) {
        expect(usesStage(fighterId)).toEqual([]);
        expect(storyRouteFor(fighterId)?.map((leg) => leg.opponent)).toEqual(
          campaignOpponents(fighterId),
        );
      }
    } finally {
      roster.splice(index, 0, dmitry);
    }
  });
});

describe('Dmitry, the story’s final boss', () => {
  it.each([false, true])(
    'playable: %s: every campaign ends against him in Moscow, on this stage only',
    (playable) => {
      withDmitry(playable, () => {
        for (const { fighterId } of STORY_PROFILES) {
          const route = storyRouteFor(fighterId)!;
          expect(route.at(-1)).toEqual({
            opponent: STORY_FINAL_BOSS.fighterId,
            destination: 'russia',
            stageId: STAGE,
          });
          // The stage is used by that last leg alone; Dmitry is fought once.
          expect(usesStage(fighterId)).toHaveLength(1);
          expect(route.filter((leg) => leg.opponent === STORY_FINAL_BOSS.fighterId)).toHaveLength(
            1,
          );
          expect(campaignOpponents(fighterId)).not.toContain(STORY_FINAL_BOSS.fighterId);
        }
        // He is a rival in story mode, without a campaign of his own.
        expect(isStoryRival(STORY_FINAL_BOSS.fighterId)).toBe(true);
        expect(hasStoryCampaign(STORY_FINAL_BOSS.fighterId)).toBe(false);
      });
    },
  );

  it('the last fight of a real campaign is set up on this stage', () => {
    withDmitry(false, () => {
      let progress = startStory('augusto');
      while (progress.opponent !== STORY_FINAL_BOSS.fighterId) {
        progress = recordStoryMatch(arriveForFight(progress), true);
        expect(progress.phase).not.toBe('complete');
      }
      const fight = arriveForFight(progress);
      expect(storyMatchSetup(fight, 'normal')).toMatchObject({
        cpuFighterId: STORY_FINAL_BOSS.fighterId,
        stageId: STAGE,
        mode: 'story',
      });
      const retry = recordStoryMatch(fight, false);
      expect(retry).toBe(fight);
      expect(storyMatchSetup(retry, 'hard')).toEqual(storyMatchSetup(fight, 'hard'));
      expect(isFinalBossEncounter(storyRouteFor('augusto')!.at(-1)!)).toBe(true);
      expect(isFinalBossEncounter(storyRouteFor('augusto')![0]!)).toBe(false);
      expect(recordStoryMatch(fight, true).phase).toBe('complete');
    });
  });
});
