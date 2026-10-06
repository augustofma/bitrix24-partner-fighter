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
    // Air attacks: gravity and jump momentum continue; they end on landing.
    airPunch: {
      id: 'fighter-a.airPunch',
      displayName: 'Soco aéreo',
      state: 'airPunch',
      damage: 6,
      chipDamage: 0,
      startupFrames: 4,
      activeFrames: 6,
      recoveryFrames: 8,
      // Chest height, medium reach: connects on the way down.
      hitbox: { x: 16, y: -118, width: 50, height: 28 },
      hitstunFrames: 14,
      blockstunFrames: 9,
      knockback: 3.5,
      blockPushback: 3,
      hitstopFrames: 6,
    },
    airKick: {
      id: 'fighter-a.airKick',
      displayName: 'Chute aéreo',
      state: 'airKick',
      damage: 10,
      chipDamage: 1,
      startupFrames: 7,
      activeFrames: 8,
      recoveryFrames: 12,
      // Long, angled down and starting slightly behind the body: hits cross-ups.
      hitbox: { x: -12, y: -80, width: 88, height: 36 },
      hitstunFrames: 17,
      blockstunFrames: 12,
      knockback: 5,
      blockPushback: 4,
      hitstopFrames: 8,
    },
  },
  specials: [],
  palette: { body: 0x2f6bff, accent: 0xffd23f, skin: 0xf1c27d, outline: 0x0b0820 },
  // DEMO art (scripts/generate-demo-fighter-art.mjs) proving the sprite pipeline.
  // Replace with the final art following docs/ART_DIRECTION.md. Purely visual.
  assets: {
    portrait: 'fighters/fighter-a/portrait.png',
    pixelArt: true,
    sprite: {
      sheet: {
        key: 'fighter-a-demo-sheet',
        path: 'fighters/fighter-a/sprite.png',
        frameWidth: 96,
        frameHeight: 112,
      },
      // Native frames are drawn at half size: 2x makes the figure ~176 px tall.
      visual: { scale: 2, offsetX: 0, offsetY: 0 },
      animations: {
        idle: { frames: [0, 1, 2, 3], frameRate: 6 },
        walk: { frames: [4, 5, 6, 7], frameRate: 10 },
        // Picked by vertical velocity: rise / apex (tuck) / fall.
        jump: { frames: [8, 9, 31] },
        crouch: { frames: [10] },
        // Attacks follow the real frame data: startup / active / recovery = 1 frame each.
        punch: { frames: [11, 12, 13] },
        kick: { frames: [14, 15, 16] },
        // Air attacks keep the strike pose through recovery (until recovery or landing).
        airPunch: { frames: [26, 27], attackPhases: { startup: 1, active: 1, recovery: 0 } },
        airKick: { frames: [28, 29], attackPhases: { startup: 1, active: 1, recovery: 0 } },
        block: { frames: [17] },
        crouchBlock: { frames: [30] },
        hurt: { frames: [18, 19], frameRate: 12 },
        knockout: { frames: [20, 21, 22], frameRate: 8 },
        victory: { frames: [23, 24, 25], frameRate: 6, repeat: -1 },
      },
    },
  },
};
