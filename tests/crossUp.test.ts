import { describe, expect, it } from 'vitest';
import { AIController } from '../src/controllers/AIController';
import { NORMAL_AI } from '../src/controllers/aiProfiles';
import type { FightSimulation } from '../src/core/FightSimulation';
import { createInputState } from '../src/core/input';
import { createRng, type Rng } from '../src/core/random';
import { fighterA } from '../src/fighters/fighterA';
import { INPUT_ACTIONS, type InputState } from '../src/types/input';
import { createFightingSim, idle, placeAtDistance, press, stepFrames } from './helpers';

/** Forward jump (→ + ↑), holding → in the air, optionally attacking on a given air frame. */
function forwardJump(
  sim: FightSimulation,
  attack?: { button: 'punch' | 'kick'; onFrame: number },
  onFrame?: (frame: number) => void,
): void {
  const [player] = sim.fighters;
  stepFrames(sim, 1, press({ up: true, right: true }));
  for (let frame = 0; frame < 120 && player.isAirborne; frame++) {
    const attacking = attack !== undefined && frame === attack.onFrame;
    sim.step([press({ right: true, ...(attacking ? { [attack.button]: true } : {}) }), idle()]);
    onFrame?.(frame);
  }
}

describe('cross-up', () => {
  it('walking never passes through the opponent', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 120);
    const [player, cpu] = sim.fighters;
    stepFrames(sim, 300, press({ right: true }));
    expect(player.position.x).toBeLessThan(cpu.position.x);
    expect(cpu.position.x - player.position.x).toBeGreaterThanOrEqual(
      fighterA.boxes.pushWidth - 0.001,
    );
  });

  it('a forward jump passes over the opponent and lands on the other side', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 100);
    const [player, cpu] = sim.fighters;
    expect(player.position.x).toBeLessThan(cpu.position.x);
    forwardJump(sim);
    expect(player.isAirborne).toBe(false);
    expect(player.position.x).toBeGreaterThan(cpu.position.x);
    // Bodies collide again after landing.
    expect(player.position.x - cpu.position.x).toBeGreaterThanOrEqual(
      fighterA.boxes.pushWidth - 0.001,
    );
  });

  it('a short hop from far away does not cross (natural physics, no teleport)', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 300);
    const [player, cpu] = sim.fighters;
    let maxStep = 0;
    let lastX = player.position.x + fighterA.stats.jumpHorizontalSpeed; // after take-off frame
    forwardJump(sim, undefined, () => {
      maxStep = Math.max(maxStep, Math.abs(player.position.x - lastX));
      lastX = player.position.x;
    });
    expect(player.position.x).toBeLessThan(cpu.position.x);
    expect(maxStep).toBeLessThanOrEqual(fighterA.stats.jumpHorizontalSpeed + 0.001);
  });

  it('both fighters face each other again after the cross-up', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 100);
    const [player, cpu] = sim.fighters;
    const airborneDirections = new Set<number>();
    forwardJump(sim, undefined, () => {
      if (player.isAirborne) airborneDirections.add(player.direction);
    });
    // The jumper never turns in the air.
    expect([...airborneDirections]).toEqual([1]);
    stepFrames(sim, 1);
    expect(player.direction).toBe(-1);
    expect(cpu.direction).toBe(1);
  });

  it('an air attack keeps its direction (and hitbox side) while crossing the opponent', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 100);
    const [player, cpu] = sim.fighters;
    let crossedDuringAttack = false;
    forwardJump(sim, { button: 'kick', onFrame: 6 }, () => {
      if (player.state !== 'airKick') return;
      expect(player.direction).toBe(1);
      const hitbox = player.getHitbox();
      if (hitbox) expect(hitbox.x + hitbox.width).toBeGreaterThan(player.position.x);
      if (player.position.x > cpu.position.x) crossedDuringAttack = true;
    });
    expect(crossedDuringAttack).toBe(true);
    stepFrames(sim, 1);
    expect(player.direction).toBe(-1);
  });

  it('an air kick can hit while crossing over', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 100);
    const [, cpu] = sim.fighters;
    let hits = 0;
    const [player] = sim.fighters;
    stepFrames(sim, 1, press({ up: true, right: true }));
    for (let frame = 0; frame < 120 && player.isAirborne; frame++) {
      const events = sim.step([press({ right: true, kick: frame === 16 }), idle()]);
      hits += events.filter((e) => e.type === 'hit').length;
    }
    expect(hits).toBe(1);
    expect(cpu.health).toBe(cpu.maxHealth - fighterA.attacks.airKick.damage);
  });
});

describe('determinism', () => {
  /** Random but seeded button mashing for the player, real AI for the CPU. */
  function runMatch(seed: number, frames: number): string[] {
    const sim = createFightingSim();
    const inputRng: Rng = createRng(seed);
    const ai = new AIController(NORMAL_AI, createRng(seed + 1));
    const [player, cpu] = sim.fighters;
    const trace: string[] = [];
    let held: InputState = createInputState();
    for (let i = 0; i < frames; i++) {
      if (i % 6 === 0) {
        held = createInputState();
        for (const action of INPUT_ACTIONS) held[action] = inputRng() < 0.25;
      }
      sim.step([held, ai.getInput({ self: cpu, opponent: player })]);
      trace.push(
        sim.fighters
          .map(
            (f) =>
              `${f.state}:${f.stateFrame}:${f.position.x}:${f.position.y}:${f.health}:${f.direction}`,
          )
          .join('|'),
      );
    }
    return trace;
  }

  it('same seed and inputs produce exactly the same fight', () => {
    const a = runMatch(42, 1500);
    const b = runMatch(42, 1500);
    expect(a).toEqual(b);
    // The scripted fight actually exercises the new states.
    const states = new Set(a.flatMap((line) => line.split('|').map((f) => f.split(':')[0])));
    for (const state of ['airPunch', 'airKick', 'crouchBlock', 'jump']) {
      expect(states.has(state), state).toBe(true);
    }
  });
});
