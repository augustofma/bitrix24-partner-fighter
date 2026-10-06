import { describe, expect, it } from 'vitest';
import { toWorldRect } from '../src/core/geometry';
import { fighterB } from '../src/fighters/fighterB';
import { STANDARD_BODY } from '../src/fighters/shared/standardBody';
import { createFightingSim, idle, placeAtDistance, press, stepFrames } from './helpers';

const DOWN_BLOCK = { down: true, block: true };

describe('crouchBlock (↓ + D)', () => {
  it('enters crouchBlock and uses the crouching hurtbox', () => {
    const sim = createFightingSim();
    const [player] = sim.fighters;
    stepFrames(sim, 2, press(DOWN_BLOCK));
    expect(player.state).toBe('crouchBlock');
    expect(player.isBlocking).toBe(true);
    expect(player.getHurtbox()).toEqual(
      toWorldRect(STANDARD_BODY.crouching, player.position, player.direction),
    );
  });

  it('cannot walk while guarding low', () => {
    const sim = createFightingSim();
    const [player] = sim.fighters;
    const x = player.position.x;
    stepFrames(sim, 20, press({ ...DOWN_BLOCK, right: true }));
    expect(player.state).toBe('crouchBlock');
    expect(player.position.x).toBe(x);
  });

  it('blocks a kick: chip damage, blockstun, stays crouched', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 80);
    const [player] = sim.fighters;
    const kick = fighterB.attacks.kick;
    const events = stepFrames(
      sim,
      kick.startupFrames + 1,
      press(DOWN_BLOCK),
      press({ kick: true }),
    );
    expect(events.filter((e) => e.type === 'block')).toHaveLength(1);
    expect(player.health).toBe(player.maxHealth - kick.chipDamage);
    expect(player.state).toBe('crouchBlock');

    // Releasing the guard during blockstun does not cancel it.
    stepFrames(sim, 2, idle());
    expect(player.state).toBe('crouchBlock');
    // The impact freezes the fight (hitstop) before blockstun starts counting.
    stepFrames(sim, kick.hitstopFrames + kick.blockstunFrames, idle());
    expect(player.state).toBe('idle');
  });

  it('a standing punch still whiffs over a low guard (crouching hurtbox)', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 80);
    const events = stepFrames(sim, 20, press(DOWN_BLOCK), press({ punch: true }));
    expect(events.some((e) => e.type === 'block' || e.type === 'hit')).toBe(false);
  });

  it('transitions: crouch ↔ crouchBlock ↔ block ↔ idle', () => {
    const sim = createFightingSim();
    const [player] = sim.fighters;
    const hold = (input: Parameters<typeof press>[0]) => {
      stepFrames(sim, 1, press(input));
      return player.state;
    };
    expect(hold({ down: true })).toBe('crouch');
    expect(hold(DOWN_BLOCK)).toBe('crouchBlock');
    expect(hold({ down: true })).toBe('crouch'); // released D, kept ↓
    expect(hold(DOWN_BLOCK)).toBe('crouchBlock');
    expect(hold({ block: true })).toBe('block'); // released ↓, kept D
    expect(hold(DOWN_BLOCK)).toBe('crouchBlock');
    expect(hold({})).toBe('idle'); // released both
  });

  it('plain crouch and standing block keep working', () => {
    const sim = createFightingSim();
    placeAtDistance(sim, 80);
    const [player] = sim.fighters;
    stepFrames(sim, 2, press({ down: true }));
    expect(player.state).toBe('crouch');
    const events = stepFrames(sim, 10, press({ block: true }), press({ punch: true }));
    expect(events.some((e) => e.type === 'block')).toBe(true);
    expect(player.health).toBe(player.maxHealth);
  });
});
