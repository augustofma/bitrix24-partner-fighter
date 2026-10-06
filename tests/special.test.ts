import { describe, expect, it } from 'vitest';
import { PLAYER_ONE_KEYS } from '../src/config/controls';
import { AIController } from '../src/controllers/AIController';
import { NORMAL_AI } from '../src/controllers/aiProfiles';
import { FightSimulation } from '../src/core/FightSimulation';
import { InputTracker, mergeInputs } from '../src/core/input';
import { createRng } from '../src/core/random';
import { augusto } from '../src/fighters/augusto';
import { fighterB } from '../src/fighters/fighterB';
import { partnerArena } from '../src/stages/partnerArena';
import type { FighterConfig } from '../src/types/fighter';
import { FAST_TIMING, idle, placeAtDistance, press, stepFrames } from './helpers';

const move = augusto.specials[0]!;
function setup(config: FighterConfig = augusto) {
  const sim = new FightSimulation({
    fighters: [config, fighterB],
    stage: partnerArena,
    roundTiming: FAST_TIMING,
  });
  stepFrames(sim, 1);
  placeAtDistance(sim, 100);
  return sim;
}

describe('special input and meter', () => {
  it('maps F, merges multi-device actions and derives one pressed edge', () => {
    expect(PLAYER_ONE_KEYS.special).toEqual(['F']);
    const tracker = new InputTracker();
    const input = mergeInputs([{ special: true }, { left: true }]);
    expect(input.left).toBe(true);
    expect(tracker.next(input).pressed.special).toBe(true);
    expect(tracker.next(input).pressed.special).toBe(false);
    tracker.next(idle());
    expect(tracker.next(input).pressed.special).toBe(true);
  });
  it('starts at zero and clamps both ends', () => {
    const [a, b] = setup().fighters;
    expect([a.specialMeter, b.specialMeter]).toEqual([0, 0]);
    a.changeSpecialMeter(150);
    expect(a.specialMeter).toBe(100);
    a.changeSpecialMeter(-200);
    expect(a.specialMeter).toBe(0);
  });
  it('awards 10 on a normal hit and 5 to its recipient only once', () => {
    const sim = setup();
    placeAtDistance(sim, 60);
    stepFrames(sim, 40, press({ punch: true }));
    expect(sim.fighters.map((f) => f.specialMeter)).toEqual([10, 5]);
  });
  it('awards 3 to the attacker on a blocked normal', () => {
    const sim = setup();
    placeAtDistance(sim, 60);
    stepFrames(sim, 40, press({ punch: true }), press({ block: true }));
    expect(sim.fighters.map((f) => f.specialMeter)).toEqual([3, 0]);
  });
  it('clamps meter earned from real contacts', () => {
    const sim = setup();
    placeAtDistance(sim, 60);
    sim.fighters.forEach((f) => f.changeSpecialMeter(99));
    stepFrames(sim, 40, press({ punch: true }));
    expect(sim.fighters.map((f) => f.specialMeter)).toEqual([100, 100]);
  });
  it('does not execute or charge with insufficient meter', () => {
    const sim = setup();
    const a = sim.fighters[0];
    a.changeSpecialMeter(29);
    stepFrames(sim, 1, press({ special: true }));
    expect(a.state).toBe('idle');
    expect(a.specialMeter).toBe(29);
  });
  it('charges exactly 30 on startup, even on a whiff, and never repeats while held', () => {
    const sim = setup();
    placeAtDistance(sim, 400);
    const a = sim.fighters[0];
    a.changeSpecialMeter(100);
    stepFrames(sim, 1, press({ special: true }));
    expect(a.state).toBe('special');
    expect(a.stateFrame).toBe(0);
    expect(a.specialMeter).toBe(70);
    stepFrames(sim, 120, press({ special: true }));
    expect(a.state).toBe('idle');
    expect(a.specialMeter).toBe(70);
    expect(sim.fighters[1].health).toBe(100);
    stepFrames(sim, 1);
    stepFrames(sim, 1, press({ special: true }));
    expect(a.specialMeter).toBe(40);
  });
  it('works at the exact cost and selects configuration without character IDs', () => {
    const config: FighterConfig = {
      ...fighterB,
      id: 'test-special-user',
      specials: [{ ...move, id: 'test-move' }],
    };
    const sim = setup(config);
    sim.fighters[0].changeSpecialMeter(30);
    stepFrames(sim, 1, press({ special: true }));
    expect(sim.fighters[0].activeAttack?.id).toBe('test-move');
    expect(sim.fighters[0].specialMeter).toBe(0);
  });
});

describe('special combat', () => {
  it('selects the first affordable special in configuration order', () => {
    const sim = setup({
      ...augusto,
      specials: [
        { ...move, id: 'expensive', meterCost: 80 },
        { ...move, id: 'affordable' },
      ],
    });
    sim.fighters[0].changeSpecialMeter(30);
    stepFrames(sim, 1, press({ special: true }));
    expect(sim.fighters[0].activeAttack?.id).toBe('affordable');
  });
  it('supports an airborne special by configuration and cancels its hitbox on landing', () => {
    const sim = setup({
      ...augusto,
      specials: [{ ...move, groundOnly: false, activeFrames: 120 }],
    });
    const a = sim.fighters[0];
    placeAtDistance(sim, 400);
    a.changeSpecialMeter(30);
    stepFrames(sim, 1, press({ up: true }));
    stepFrames(sim, 1, press({ special: true }));
    expect(a.state).toBe('special');
    expect(a.specialMeter).toBe(0);
    stepFrames(sim, 9);
    expect(a.getHitbox()).not.toBeNull();
    for (let i = 0; i < 100 && a.isAirborne; i++) stepFrames(sim, 1);
    expect(a.state).toBe('idle');
    expect(a.getHitbox()).toBeNull();
  });
  it('buffers during the last blockstun frames and spends only when free', () => {
    const sim = setup();
    placeAtDistance(sim, 400);
    const a = sim.fighters[0];
    a.changeSpecialMeter(30);
    a.applyBlock(fighterB.attacks.punch, -1);
    stepFrames(sim, fighterB.attacks.punch.blockstunFrames - 2);
    stepFrames(sim, 1, press({ special: true }));
    expect(a.state).toBe('block');
    expect(a.specialMeter).toBe(30);
    stepFrames(sim, 2);
    expect(a.state).toBe('special');
    expect(a.specialMeter).toBe(0);
  });
  it('deals one strong hit: no meter for its user, +5 for the damaged defender', () => {
    const sim = setup();
    const [a, b] = sim.fighters;
    a.changeSpecialMeter(30);
    const events = stepFrames(sim, 80, press({ special: true }));
    expect(events.filter((e) => e.type === 'hit')).toHaveLength(1);
    expect(b.health).toBe(82);
    expect([a.specialMeter, b.specialMeter]).toEqual([0, 5]);
  });
  it.each([false, true])('can be blocked, crouching=%s, with chip and no meter', (down) => {
    const sim = setup();
    const [a, b] = sim.fighters;
    a.changeSpecialMeter(30);
    const events = stepFrames(sim, 80, press({ special: true }), press({ block: true, down }));
    expect(events.filter((e) => e.type === 'block')).toHaveLength(1);
    expect(b.health).toBe(98);
    expect([a.specialMeter, b.specialMeter]).toEqual([0, 0]);
  });
  it('cannot KO through guard', () => {
    const sim = setup();
    sim.fighters[0].changeSpecialMeter(30);
    sim.fighters[1].health = 1;
    stepFrames(sim, 80, press({ special: true }), press({ block: true }));
    expect(sim.fighters[1].health).toBe(1);
  });
  it('causes KO and normal round completion', () => {
    const sim = setup();
    sim.fighters[0].changeSpecialMeter(30);
    sim.fighters[1].health = 18;
    const events = stepFrames(sim, 100, press({ special: true }));
    expect(events.some((e) => e.type === 'koHit')).toBe(true);
    expect(events.some((e) => e.type === 'roundOver')).toBe(true);
    expect(sim.fighters[1].isKnockedOut).toBe(true);
  });
  it('has no hitbox in startup/recovery and stops advancing in recovery', () => {
    const sim = setup();
    placeAtDistance(sim, 400);
    const a = sim.fighters[0];
    a.changeSpecialMeter(30);
    stepFrames(sim, 1, press({ special: true }));
    expect(a.getHitbox()).toBeNull();
    stepFrames(sim, move.startupFrames);
    expect(a.getHitbox()).not.toBeNull();
    stepFrames(sim, move.activeFrames);
    expect(a.getHitbox()).toBeNull();
    const x = a.position.x;
    stepFrames(sim, move.recoveryFrames - 1);
    expect(a.position.x).toBe(x);
    expect(a.state).toBe('special');
    stepFrames(sim, 1);
    expect(a.state).toBe('idle');
  });
  it('mirrors its forward advance and hitbox', () => {
    const sim = setup();
    const [a, b] = sim.fighters;
    a.position.x = b.position.x + 100;
    stepFrames(sim, 1);
    a.changeSpecialMeter(30);
    const x = a.position.x;
    stepFrames(sim, 20, press({ special: true }));
    expect(a.direction).toBe(-1);
    expect(a.position.x).toBeLessThan(x);
    expect(b.health).toBe(82);
  });
  it.each(['hurt', 'blockstun', 'attack', 'jump', 'knockout'] as const)(
    'does not cancel %s',
    (state) => {
      const sim = setup();
      placeAtDistance(sim, 400);
      const a = sim.fighters[0];
      a.changeSpecialMeter(100);
      if (state === 'hurt') a.applyHit(fighterB.attacks.kick, -1);
      if (state === 'blockstun') a.applyBlock(fighterB.attacks.kick, -1);
      if (state === 'attack') stepFrames(sim, 1, press({ kick: true }));
      if (state === 'jump') stepFrames(sim, 1, press({ up: true }));
      if (state === 'knockout') {
        a.health = 1;
        a.applyHit(fighterB.attacks.kick, -1);
      }
      stepFrames(sim, 8, press({ special: true }));
      expect(a.state).not.toBe('special');
      expect(a.specialMeter).toBe(100);
      stepFrames(sim, 100, press({ special: true }));
      expect(a.specialMeter).toBe(100);
    },
  );
  it('buffers a fresh press in the last recovery frames without cancelling', () => {
    const sim = setup();
    placeAtDistance(sim, 400);
    const a = sim.fighters[0];
    a.changeSpecialMeter(60);
    stepFrames(sim, 1, press({ kick: true }));
    stepFrames(sim, 27);
    stepFrames(sim, 1, press({ special: true }));
    expect(a.state).toBe('kick');
    stepFrames(sim, 2);
    expect(a.state).toBe('special');
    expect(a.specialMeter).toBe(30);
  });
  it('CPU continues fighting and replaying the same inputs remains deterministic', () => {
    function run() {
      const sim = setup();
      const [a, b] = sim.fighters;
      a.changeSpecialMeter(100);
      const cpu = new AIController(NORMAL_AI, createRng(123));
      const snapshots = [];
      for (let frame = 0; frame < 600; frame++) {
        const input = cpu.getInput({ self: b, opponent: a });
        expect(input.special).toBe(false);
        const events = sim.step([
          press({ special: frame % 90 === 0, punch: frame % 30 === 0, right: true }),
          input,
        ]);
        snapshots.push({
          events,
          fighters: sim.fighters.map((f) => ({
            state: f.state,
            frame: f.stateFrame,
            health: f.health,
            meter: f.specialMeter,
            x: f.position.x,
          })),
        });
      }
      expect(b.health).toBeLessThan(100);
      expect(a.health).toBeLessThan(100);
      return snapshots;
    }
    expect(run()).toEqual(run());
  });
});
