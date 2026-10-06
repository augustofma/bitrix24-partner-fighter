import { describe, expect, it } from 'vitest';
import { totalAttackFrames } from '../src/core/fighter/attackFrames';
import type { Fighter } from '../src/core/fighter/Fighter';
import type { FightSimulation, SimulationEvent } from '../src/core/FightSimulation';
import { toWorldRect } from '../src/core/geometry';
import { fighterA } from '../src/fighters/fighterA';
import { fighterB } from '../src/fighters/fighterB';
import { POSES, poseFor } from '../src/render/placeholder/poses';
import { resolveAnimationState, spriteFrameFor } from '../src/render/sprite/animationHelpers';
import type { FighterStateId } from '../src/types/fighter';
import type { InputState } from '../src/types/input';
import { createFightingSim, idle, placeAtDistance, press, stepFrames } from './helpers';

const DOWN = { down: true };
const { crouchPunch, crouchKick } = fighterA.attacks;

/** Steps one frame at a time while `p1(frame)` decides the input, recording player states. */
function run(
  sim: FightSimulation,
  frames: number,
  p1: (frame: number) => InputState,
  p2: (frame: number) => InputState = idle,
): { states: FighterStateId[]; events: SimulationEvent[] } {
  const states: FighterStateId[] = [];
  const events: SimulationEvent[] = [];
  for (let f = 0; f < frames; f++) {
    events.push(...sim.step([p1(f), p2(f)]));
    states.push(sim.fighters[0].state);
  }
  return { states, events };
}

const crouchingHurtbox = (f: Fighter) =>
  toWorldRect(fighterA.boxes.crouching, f.position, f.direction);

describe('crouching attacks: input', () => {
  it('↓ + A starts crouchPunch, ↓ + S starts crouchKick', () => {
    const sim = createFightingSim();
    const [player] = sim.fighters;
    stepFrames(sim, 1, press({ ...DOWN, punch: true }));
    expect(player.state).toBe('crouchPunch');
    expect(player.activeAttack).toBe(crouchPunch);

    const sim2 = createFightingSim();
    stepFrames(sim2, 1, press({ ...DOWN, kick: true }));
    expect(sim2.fighters[0].state).toBe('crouchKick');
    expect(sim2.fighters[0].activeAttack).toBe(crouchKick);
  });

  it('already crouching: the attack comes out on the same frame A/S is pressed', () => {
    const sim = createFightingSim();
    const [player] = sim.fighters;
    stepFrames(sim, 5, press(DOWN));
    expect(player.state).toBe('crouch');
    stepFrames(sim, 1, press({ ...DOWN, kick: true }));
    expect(player.state).toBe('crouchKick');
    expect(player.stateFrame).toBe(0);
  });

  it('A or S without ↓ are still the standing punch and kick', () => {
    const sim = createFightingSim();
    stepFrames(sim, 1, press({ punch: true }));
    expect(sim.fighters[0].state).toBe('punch');
    const sim2 = createFightingSim();
    stepFrames(sim2, 1, press({ kick: true }));
    expect(sim2.fighters[0].state).toBe('kick');
  });

  it('in the air, A and S are still air attacks even holding ↓', () => {
    const sim = createFightingSim();
    stepFrames(sim, 1, press({ up: true }));
    stepFrames(sim, 1, press({ ...DOWN, punch: true }));
    expect(sim.fighters[0].state).toBe('airPunch');
  });

  it('↓ + D is still crouchBlock', () => {
    const sim = createFightingSim();
    stepFrames(sim, 2, press({ ...DOWN, block: true }));
    expect(sim.fighters[0].state).toBe('crouchBlock');
  });

  it('holding ↓ + A does not repeat the attack', () => {
    const sim = createFightingSim();
    const { states } = run(sim, 90, () => press({ ...DOWN, punch: true }));
    const starts = states.filter((s, i) => s === 'crouchPunch' && states[i - 1] !== 'crouchPunch');
    expect(starts).toHaveLength(1);
  });
});

describe('crouching attacks: body, hits and facing', () => {
  it('both use the crouching hurtbox (and never walk) for the whole attack', () => {
    for (const button of ['punch', 'kick'] as const) {
      const sim = createFightingSim();
      const [player] = sim.fighters;
      const x = player.position.x;
      stepFrames(sim, 1, press({ ...DOWN, [button]: true }));
      const state = player.state;
      while (player.state === state) {
        expect(player.getHurtbox()).toEqual(crouchingHurtbox(player));
        stepFrames(sim, 1, press({ ...DOWN, right: true }));
      }
      expect(player.position.x).toBe(x);
    }
  });

  it('crouchPunch and crouchKick hit, deal their damage and connect only once', () => {
    for (const [button, attack, distance] of [
      ['punch', crouchPunch, 80],
      ['kick', crouchKick, 110],
    ] as const) {
      const sim = createFightingSim();
      placeAtDistance(sim, distance);
      const [, cpu] = sim.fighters;
      const { events } = run(sim, totalAttackFrames(attack) + 20, (f) =>
        press({ ...DOWN, [button]: f === 0 }),
      );
      expect(
        events.filter((e) => e.type === 'hit'),
        attack.id,
      ).toHaveLength(1);
      expect(cpu.health).toBe(cpu.maxHealth - attack.damage);
    }
  });

  it('the low kick also hits a crouching opponent; only the low guard blocks it', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 110);
    const hit = run(
      sim,
      30,
      (f) => press({ ...DOWN, kick: f === 0 }),
      () => press(DOWN),
    );
    expect(hit.events.some((e) => e.type === 'hit')).toBe(true);

    // The sweep is 'low': a standing guard is hit, a crouching guard blocks.
    for (const [guard, expected] of [
      [{ block: true }, 'hit'],
      [{ ...DOWN, block: true }, 'block'],
    ] as const) {
      const sim2 = createFightingSim();
      placeAtDistance(sim2, 110);
      const r = run(
        sim2,
        30,
        (f) => press({ ...DOWN, kick: f === 0 }),
        () => press(guard),
      );
      expect(r.events.some((e) => e.type === expected)).toBe(true);
    }
  });

  it('does not turn around in the middle of the attack, turns right after', () => {
    const sim = createFightingSim();
    const [player, cpu] = sim.fighters;
    stepFrames(sim, 1, press({ ...DOWN, kick: true }));
    cpu.position.x = player.position.x - 120; // opponent suddenly behind
    while (player.state === 'crouchKick') {
      expect(player.direction).toBe(1);
      stepFrames(sim, 1, press(DOWN));
    }
    expect(player.state).toBe('crouch');
    expect(player.direction).toBe(-1);
  });
});

describe('crouching attacks: transitions', () => {
  it('crouch → crouchPunch → crouch and crouch → crouchKick → crouch (no standing frame)', () => {
    for (const [button, state] of [
      ['punch', 'crouchPunch'],
      ['kick', 'crouchKick'],
    ] as const) {
      const sim = createFightingSim();
      const { states } = run(sim, 60, (f) => press({ ...DOWN, [button]: f === 5 }));
      const after = states.slice(states.indexOf(state));
      const firstOther = after.find((s) => s !== state);
      expect(states.slice(0, 5).every((s) => s === 'crouch')).toBe(true);
      expect(firstOther).toBe('crouch');
      expect(after.slice(after.indexOf('crouch'))).not.toContain('idle');
    }
  });

  it('releasing ↓ during the attack ends it in idle (but the attack itself stays low)', () => {
    for (const [button, state, attack] of [
      ['punch', 'crouchPunch', crouchPunch],
      ['kick', 'crouchKick', crouchKick],
    ] as const) {
      const sim = createFightingSim();
      const [player] = sim.fighters;
      const releaseAt = attack.startupFrames + attack.activeFrames + 1; // during recovery
      const { states } = run(sim, 60, (f) =>
        f < releaseAt ? press({ ...DOWN, [button]: f === 0 }) : idle(),
      );
      expect(states.slice(0, totalAttackFrames(attack)).every((s) => s === state)).toBe(true);
      expect(states[totalAttackFrames(attack)]).toBe('idle');
      expect(player.state).toBe('idle');
    }
  });

  it('crouchBlock → crouchPunch / crouchKick once free (incl. a press buffered in blockstun)', () => {
    const kick = fighterB.attacks.kick;
    const freeAt = 1 + kick.startupFrames + kick.hitstopFrames + kick.blockstunFrames + 2;
    for (const [button, state, pressAt] of [
      ['punch', 'crouchPunch', freeAt + 3], // pressed after the blockstun
      ['kick', 'crouchKick', freeAt - 4], // pressed during blockstun: buffered
    ] as const) {
      const sim = createFightingSim();
      placeAtDistance(sim, 80);
      const { states, events } = run(
        sim,
        freeAt + 10,
        (f) => press({ ...DOWN, block: true, [button]: f === pressAt }),
        (f) => press({ kick: f === 0 }),
      );
      expect(events.some((e) => e.type === 'block')).toBe(true);
      const attackAt = states.indexOf(state);
      expect(attackAt, state).toBeGreaterThan(0);
      expect(states[attackAt - 1]).toBe('crouchBlock');
    }
  });
});

describe('crouching attacks: presentation', () => {
  const sprite = fighterA.assets.sprite;
  if (!sprite) throw new Error('FIGHTER_A must have demo sprite assets');

  it('sprite pipeline has both animations and shows the impact frame while active', () => {
    expect(resolveAnimationState(sprite.animations, 'crouchPunch')).toBe('crouchPunch');
    expect(resolveAnimationState(sprite.animations, 'crouchKick')).toBe('crouchKick');
    for (const [button, attack, impactFrame] of [
      ['punch', crouchPunch, 33],
      ['kick', crouchKick, 36],
    ] as const) {
      const sim = createFightingSim();
      const [player] = sim.fighters;
      stepFrames(sim, 1, press({ ...DOWN, [button]: true }));
      stepFrames(sim, attack.startupFrames, press(DOWN));
      expect(player.attackPhase).toBe('active');
      expect(spriteFrameFor(sprite.animations, player)).toBe(impactFrame);
    }
  });

  it('a fighter without crouch attack art falls back to the crouch animation, never standing', () => {
    const set = { idle: { frames: [0] }, crouch: { frames: [10] } };
    expect(resolveAnimationState(set, 'crouchPunch')).toBe('crouch');
    expect(resolveAnimationState(set, 'crouchKick')).toBe('crouch');
  });

  it('placeholder draws both attacks crouched for every frame', () => {
    for (const [button, extended] of [
      ['punch', POSES.crouchPunch],
      ['kick', POSES.crouchKick],
    ] as const) {
      const sim = createFightingSim();
      const [player] = sim.fighters;
      stepFrames(sim, 1, press({ ...DOWN, [button]: true }));
      const state = player.state;
      let sawExtended = false;
      while (player.state === state) {
        const pose = poseFor(player, 0);
        if (pose === extended) sawExtended = true;
        // Standing head is ~-158; crouched poses keep it near -110.
        expect(pose.head.y).toBeGreaterThan(-120);
        stepFrames(sim, 1, press(DOWN));
      }
      expect(sawExtended).toBe(true);
    }
  });
});
