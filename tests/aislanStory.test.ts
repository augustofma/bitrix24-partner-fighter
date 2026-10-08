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
  it('shares the Joinville location but fights in the ZOPU Joinville; Romualdo keeps his', () => {
    expect(STORY_LOCATIONS.filter((l) => l.id === 'joinville')).toHaveLength(1);
    expect(rivalLeg('aislan')).toEqual({
      opponent: 'aislan',
      destination: 'joinville',
      stageId: 'joinville-zopu',
    });
    expect(legStageId(rivalLeg('romualdo'))).toBe('joinville');
    expect(legStageId(rivalLeg('aislan'))).toBe('joinville-zopu');
    // An encounter override affects only this leg, not the shared location or the other rival.
    expect(legStageId({ ...rivalLeg('aislan'), stageId: 'partner-summit' })).toBe('partner-summit');
    expect(legStageId(rivalLeg('romualdo'))).toBe('joinville');
  });
  it.each(STORY_PROFILES.filter((p) => p.fighterId !== 'aislan'))(
    'adds one encounter to $fighterId',
    ({ fighterId }) => {
      const route = storyRouteFor(fighterId)!;
      expect(route.filter((l) => l.opponent === 'aislan')).toHaveLength(1);
      // After Romualdo, before Rômulo (Castelo Branco) and the final boss.
      const order = route.map((l) => l.opponent).filter((id) => id !== 'romulo');
      expect(order.at(-2)).toBe('aislan');
    },
  );
  it('each encounter loads its own Joinville art, with no texture key shared', () => {
    const romualdoStage = getStageConfig(legStageId(rivalLeg('romualdo')));
    const aislanStage = getStageConfig(legStageId(rivalLeg('aislan')));
    expect(aislanStage).not.toBe(romualdoStage);
    const romualdoKeys = collectStageAssets([romualdoStage]).map((asset) => asset.key);
    const aislanAssets = collectStageAssets([aislanStage]);
    expect(aislanAssets.every((asset) => asset.path.startsWith('stages/joinville-zopu/'))).toBe(
      true,
    );
    expect(aislanAssets.some((asset) => romualdoKeys.includes(asset.key))).toBe(false);
    // Same arena: only the art differs.
    expect(aislanStage).toMatchObject({
      width: romualdoStage.width,
      groundY: romualdoStage.groundY,
      wallMargin: romualdoStage.wallMargin,
    });
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
      stageId: 'joinville-zopu',
      mode: 'story',
    });
  });
  it('flies from the actual previous location when Joinville has not been reached', () => {
    // Romualdo's campaign meets Gabriel Mattozo in Curitiba right before Aislan.
    const progress = reachAislan('romualdo');
    expect(progress.currentLocation).toBe('curitiba');
    const trip = tripForProgress(progress, STORY_MAP_LAYOUT.maps)!;
    expect(trip.from.id).toBe('curitiba');
    expect(trip.to.id).toBe('joinville');
    expect(trip.requiresFlight).toBe(true);
  });
  it('loss/retry preserves the opponent, arena, location and difficulty', () => {
    const fight = arriveForFight(reachAislan());
    const retry = recordStoryMatch(fight, false);
    expect(retry).toBe(fight);
    expect(retry.currentLocation).toBe('joinville');
    expect(storyMatchSetup(retry, 'hard')).toEqual(storyMatchSetup(fight, 'hard'));
    expect(recordStoryMatch(fight, true)).toMatchObject({
      phase: 'travel',
      opponent: 'romulo',
      nextLocation: 'castelo-branco',
    });
  });
});
