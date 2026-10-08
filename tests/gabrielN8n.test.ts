import { describe, expect, it } from 'vitest';
import { FightSimulation } from '../src/core/FightSimulation';
import { fighterB } from '../src/fighters/fighterB';
import { gabrielMattozo } from '../src/fighters/gabrielMattozo';
import { partnerArena } from '../src/stages/partnerArena';
import { FAST_TIMING, idle, placeAtDistance, press } from './helpers';

const n8n = gabrielMattozo.specials[0]!;

function fight(distance: number, guard = false) {
  const sim = new FightSimulation({
    fighters: [gabrielMattozo, fighterB],
    stage: partnerArena,
    roundTiming: FAST_TIMING,
  });
  sim.step([idle(), idle()]);
  placeAtDistance(sim, distance);
  sim.fighters[0].changeSpecialMeter(n8n.meterCost);
  const events = [];
  for (let f = 0; f < 80; f++) {
    events.push(...sim.step([press({ special: f === 0 }), press({ block: guard })]));
  }
  return { sim, events };
}

describe('Gabriel Mattozo: N8N!', () => {
  it('is a ground-only mid special with the workflow look and its own sound', () => {
    expect(n8n).toMatchObject({
      id: 'gabriel-mattozo.n8n',
      displayName: 'N8N!',
      level: 'mid',
      meterCost: 30,
      groundOnly: true,
      damage: 16,
    });
    expect(gabrielMattozo.assets.specialEffects?.[n8n.id]).toEqual({
      style: 'workflowNodes',
      label: 'N8N!',
      sound: 'special-n8n',
    });
  });

  it('hits beyond his kick (the whole workflow), once, 16 damage; meter spent', () => {
    const { sim, events } = fight(190);
    const [a, b] = sim.fighters;
    expect(events.filter((e) => e.type === 'hit')).toHaveLength(1);
    expect(b.health).toBe(b.maxHealth - n8n.damage);
    expect(a.specialMeter).toBe(0);
  });

  it('a guard takes only the chip', () => {
    const { sim, events } = fight(150, true);
    expect(events.filter((e) => e.type === 'block')).toHaveLength(1);
    expect(sim.fighters[1].health).toBe(sim.fighters[1].maxHealth - n8n.chipDamage);
  });

  it('whiffs far away', () => {
    const { sim } = fight(320);
    expect(sim.fighters[1].health).toBe(sim.fighters[1].maxHealth);
  });
});
