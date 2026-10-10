import { describe, expect, it } from 'vitest';
import { FightSimulation } from '../src/core/FightSimulation';
import { fighterB } from '../src/fighters/fighterB';
import { gabriele } from '../src/fighters/gabriele';
import { partnerArena } from '../src/stages/partnerArena';
import { FAST_TIMING, idle, placeAtDistance, press } from './helpers';

const police = gabriele.specials[0]!;

function fight(distance: number, guard = false) {
  const sim = new FightSimulation({
    fighters: [gabriele, fighterB],
    stage: partnerArena,
    roundTiming: FAST_TIMING,
  });
  sim.step([idle(), idle()]);
  placeAtDistance(sim, distance);
  sim.fighters[0].changeSpecialMeter(police.meterCost);
  const events = [];
  for (let f = 0; f < 90; f++) {
    events.push(...sim.step([press({ special: f === 0 }), press({ block: guard })]));
  }
  return { sim, events };
}

describe('Gabriele: CHAMA O 190!', () => {
  it('is a ground-only mid special with the police look and its own sound', () => {
    expect(police).toMatchObject({
      id: 'gabriele.190',
      displayName: 'CHAMA O 190!',
      level: 'mid',
      meterCost: 40,
      groundOnly: true,
      damage: 18,
    });
    expect(gabriele.assets.specialEffects?.[police.id]).toEqual({
      style: 'policeRaid',
      label: 'CHAMA O 190!',
      sound: 'special-190',
    });
    // Her sprite has a pose for it (the call, then pointing at the rival).
    expect(gabriele.assets.sprite?.animations.special?.frames).toEqual([39, 15, 16]);
  });

  it('the longest reach in the cast: hits from 270 px, once, 18 damage; meter spent', () => {
    const { sim, events } = fight(270);
    const [a, b] = sim.fighters;
    expect(events.filter((e) => e.type === 'hit')).toHaveLength(1);
    expect(b.health).toBe(b.maxHealth - police.damage);
    expect(a.specialMeter).toBe(0);
  });

  it('a guard takes only the chip', () => {
    const { sim, events } = fight(150, true);
    expect(events.filter((e) => e.type === 'block')).toHaveLength(1);
    expect(sim.fighters[1].health).toBe(sim.fighters[1].maxHealth - police.chipDamage);
  });

  it('whiffs far away', () => {
    const { sim } = fight(360);
    expect(sim.fighters[1].health).toBe(sim.fighters[1].maxHealth);
  });
});
