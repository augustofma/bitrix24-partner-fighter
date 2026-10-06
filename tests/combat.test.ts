import { describe, expect, it } from 'vitest';
import { fighterA } from '../src/fighters/fighterA';
import {
  FAST_TIMING,
  SINGLE_ROUND,
  createFightingSim,
  placeAtDistance,
  press,
  stepFrames,
} from './helpers';

/** Frames until the punch's first active frame has been resolved. */
const PUNCH_FRAMES = fighterA.attacks.punch.startupFrames + 1;

describe('CombatSystem', () => {
  it('a punch in range deals damage and puts the defender in hurt', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 80);
    const [, cpu] = sim.fighters;
    const events = stepFrames(sim, PUNCH_FRAMES, press({ punch: true }));
    expect(events.some((e) => e.type === 'hit')).toBe(true);
    expect(cpu.health).toBe(cpu.maxHealth - fighterA.attacks.punch.damage);
    expect(cpu.state).toBe('hurt');
  });

  it('an attack only hits once', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 80);
    const events = stepFrames(sim, 40, press({ punch: true }));
    expect(events.filter((e) => e.type === 'hit')).toHaveLength(1);
  });

  it('a punch out of range does nothing', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 300);
    stepFrames(sim, 30, press({ punch: true }));
    expect(sim.fighters[1].health).toBe(sim.fighters[1].maxHealth);
  });

  it('blocking prevents punch damage', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 80);
    const events = stepFrames(sim, PUNCH_FRAMES, press({ punch: true }), press({ block: true }));
    expect(events.some((e) => e.type === 'block')).toBe(true);
    expect(sim.fighters[1].health).toBe(sim.fighters[1].maxHealth);
  });

  it('crouching dodges a standing punch but not a kick', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 80);
    stepFrames(sim, 20, press({ punch: true }), press({ down: true }));
    expect(sim.fighters[1].health).toBe(sim.fighters[1].maxHealth);

    placeAtDistance(sim, 80);
    stepFrames(sim, 20, press({ kick: true }), press({ down: true }));
    expect(sim.fighters[1].health).toBeLessThan(sim.fighters[1].maxHealth);
  });

  it('reaching zero health produces a KO, then the victory pose and round over', () => {
    const sim = createFightingSim(FAST_TIMING, SINGLE_ROUND);
    placeAtDistance(sim, 80);
    sim.fighters[1].health = 1;
    const events = stepFrames(sim, PUNCH_FRAMES, press({ punch: true }));
    expect(events.some((e) => e.type === 'koHit')).toBe(true);
    expect(events.some((e) => e.type === 'ko')).toBe(true);
    expect(sim.fighters[1].state).toBe('knockout');

    const later = stepFrames(sim, 120);
    const over = later.find((e) => e.type === 'roundOver');
    expect(over).toMatchObject({ result: { winnerIndex: 0, reason: 'ko' } });
    expect(sim.fighters[0].state).toBe('victory');
  });
});

describe('ArenaSystem', () => {
  it('keeps fighters from overlapping', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 60);
    stepFrames(sim, 60, press({ right: true }), press({ left: true }));
    const [a, b] = sim.fighters;
    expect(b.position.x - a.position.x).toBeGreaterThanOrEqual(fighterA.boxes.pushWidth - 0.001);
  });

  it('keeps fighters inside the walls', () => {
    const sim = createFightingSim();
    stepFrames(sim, 600, press({ left: true }), press({ left: true }));
    for (const fighter of sim.fighters) {
      expect(fighter.position.x).toBeGreaterThanOrEqual(sim.stage.wallMargin);
    }
  });

  it('never lets fighters drift further apart than the screen allows', () => {
    const sim = createFightingSim();
    stepFrames(sim, 600, press({ left: true }), press({ right: true }));
    const [a, b] = sim.fighters;
    expect(b.position.x - a.position.x).toBeLessThanOrEqual(760 + 0.001);
  });
});
