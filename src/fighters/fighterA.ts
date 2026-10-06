import type { FighterConfig } from '../types/fighter';
import { STANDARD_BODY } from './shared/standardBody';

/**
 * FIGHTER_A - provisional balanced fighter (player character in v0.1).
 * Use this file as the template for new characters.
 */
export const fighterA: FighterConfig = {
  id: 'fighter-a',
  name: 'fighter_a',
  displayName: 'FIGHTER_A',
  description: 'Lutador equilibrado e rápido.',
  selectable: true,
  stats: {
    maxHealth: 100,
    walkSpeed: 3.2,
    backWalkSpeed: 2.6,
    jumpForce: 17,
    jumpHorizontalSpeed: 4,
  },
  boxes: STANDARD_BODY,
  attacks: {
    punch: {
      id: 'fighter-a.punch',
      displayName: 'Soco',
      state: 'punch',
      damage: 7,
      chipDamage: 0,
      startupFrames: 5,
      activeFrames: 3,
      recoveryFrames: 9,
      hitbox: { x: 24, y: -142, width: 56, height: 22 },
      hitstunFrames: 14,
      blockstunFrames: 9,
      knockback: 4,
      blockPushback: 3,
      hitstopFrames: 6,
    },
    kick: {
      id: 'fighter-a.kick',
      displayName: 'Chute',
      state: 'kick',
      damage: 11,
      chipDamage: 1,
      startupFrames: 9,
      activeFrames: 4,
      recoveryFrames: 15,
      hitbox: { x: 30, y: -100, width: 66, height: 30 },
      hitstunFrames: 18,
      blockstunFrames: 12,
      knockback: 6,
      blockPushback: 4.5,
      hitstopFrames: 8,
    },
  },
  specials: [],
  palette: { body: 0x2f6bff, accent: 0xffd23f, skin: 0xf1c27d, outline: 0x0b0820 },
  // Real art goes in public/fighters/fighter-a/ (see docs/ART_DIRECTION.md).
  // Example: { portrait: 'fighters/fighter-a/portrait.png', animations: { idle: {...} } }
  assets: {},
};
