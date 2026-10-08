import { describe, expect, it } from 'vitest';
import { collectStageAssets } from '../src/render/assets/stageAssets';
import { getStageConfig } from '../src/stages/stageRegistry';
import { aislan } from '../src/fighters/aislan';
import { collectFighterAssets } from '../src/render/assets/fighterAssets';
import { tripForProgress } from '../src/story/flightPath';
import { STORY_LOCATIONS } from '../src/story/locations';
import { STORY_PROFILES, rivalLeg, storyRouteFor } from '../src/story/storyProfiles';
import {
  arriveForFight,
  legStageId,
  recordStoryMatch,
  startStory,
  storyMatchSetup,
} from '../src/story/storyProgress';
import { STORY_MAP_LAYOUT } from '../src/ui/story/storyMapLayout';

function reachAislan(player = 'augusto') {
  let progress = startStory(player);
  while (progress.opponent !== 'aislan' && progress.phase !== 'complete') {
    progress = recordStoryMatch(arriveForFight(progress), true);
  }
  return progress;
}

describe('Aislan shared location, independent encounter', () => {
  it('loads his own assets through the existing collector', () => {
    const requests = collectFighterAssets([aislan]);
    expect(JSON.stringify(requests)).toContain('fighters/aislan/sprite.png');
    expect(JSON.stringify(requests)).toContain('fighters/aislan/portrait.png');
  });
  it('uses the existing Joinville location and arena without a fighter alias', () => {
    expect(STORY_LOCATIONS.filter((l) => l.id === 'joinville')).toHaveLength(1);
    expect(rivalLeg('aislan')).toEqual({
      opponent: 'aislan',
      destination: 'joinville',
      stageId: 'joinville',
    });
    expect(legStageId(rivalLeg('romualdo'))).toBe('joinville');
    expect(legStageId(rivalLeg('aislan'))).toBe('joinville');
    // An encounter override affects only this leg, not the shared location or the other rival.
    expect(legStageId({ ...rivalLeg('aislan'), stageId: 'partner-summit' })).toBe('partner-summit');
    expect(legStageId(rivalLeg('romualdo'))).toBe('joinville');
  });
  it.each(STORY_PROFILES.filter((p) => p.fighterId !== 'aislan'))(
    'adds one encounter to $fighterId',
    ({ fighterId }) => {
      const route = storyRouteFor(fighterId)!;
      expect(route.filter((l) => l.opponent === 'aislan')).toHaveLength(1);
      expect(route.at(-1)?.opponent).toBe('aislan');
    },
  );
  it('loads one shared set of stage images for both encounters', () => {
    const first = getStageConfig(legStageId(rivalLeg('romualdo')));
    const second = getStageConfig(legStageId(rivalLeg('aislan')));
    expect(second).toBe(first);
    expect(collectStageAssets([first, second])).toEqual(collectStageAssets([first]));
    expect(collectStageAssets([second]).every((asset) => !asset.path.includes('aislan'))).toBe(
      true,
    );
  });
  it('presents the local challenge after Romualdo without a flight', () => {
    const progress = reachAislan();
    expect(progress).toMatchObject({
      currentLocation: 'joinville',
      nextLocation: 'joinville',
      phase: 'travel',
    });
    expect(tripForProgress(progress, STORY_MAP_LAYOUT.maps)?.requiresFlight).toBe(false);
    expect(storyMatchSetup(arriveForFight(progress), 'normal')).toMatchObject({
      cpuFighterId: 'aislan',
      stageId: 'joinville',
      mode: 'story',
    });
  });
  it('flies from the actual previous location when Joinville has not been reached', () => {
    const progress = reachAislan('romualdo');
    expect(progress.currentLocation).toBe('spain');
    const trip = tripForProgress(progress, STORY_MAP_LAYOUT.maps)!;
    expect(trip.from.id).toBe('spain');
    expect(trip.to.id).toBe('joinville');
    expect(trip.requiresFlight).toBe(true);
  });
  it('loss/retry preserves the opponent, arena, location and difficulty', () => {
    const fight = arriveForFight(reachAislan());
    const retry = recordStoryMatch(fight, false);
    expect(retry).toBe(fight);
    expect(retry.currentLocation).toBe('joinville');
    expect(storyMatchSetup(retry, 'hard')).toEqual(storyMatchSetup(fight, 'hard'));
    expect(recordStoryMatch(fight, true).phase).toBe('complete');
  });
});
