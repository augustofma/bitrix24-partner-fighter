import type { FighterConfig, SpecialMoveConfig } from '../types/fighter';
import { augusto } from './augusto';
import { filipe } from './filipe';
import { STANDARD_BODY } from './shared/standardBody';

/*
 * Rômulo (Arrecife Digital) uses both house specials, Augusto's 24ZAP and Filipe's MINDHUB
 * AGENT, one at a time: a press starts one, the next press the other (specialForPress takes
 * turns between a fighter's specials). Same frame data, cost and look as the originals; only the
 * ids are his (effects are keyed by move id).
 */
const zap = augusto.specials[0]!;
const mindhub = filipe.specials[0]!;
const zapEffect = augusto.assets.specialEffects![zap.id]!;
const mindhubEffect = filipe.assets.specialEffects![mindhub.id]!;
const ROMULO_24ZAP: SpecialMoveConfig = { ...zap, id: 'romulo.24zap' };
const ROMULO_MINDHUB: SpecialMoveConfig = { ...mindhub, id: 'romulo.mindhubAgent' };

/** Heavier normals trade mobility and recovery for modest extra damage. */
export const romulo: FighterConfig = {
  id: 'romulo',
  name: 'romulo',
  displayName: 'RÔMULO',
  description: 'Arrecife Digital',
  playable: true,
  stats: {
    maxHealth: 100,
    walkSpeed: 3.0,
    backWalkSpeed: 2.4,
    jumpForce: 16.5,
    jumpHorizontalSpeed: 3.9,
  },
  boxes: STANDARD_BODY,
  attacks: {
    punch: {
      id: 'romulo.punch',
      displayName: 'Soco',
      state: 'punch',
      level: 'high',
      damage: 8,
      chipDamage: 0,
      startupFrames: 6,
      activeFrames: 3,
      recoveryFrames: 13,
      hitbox: { x: 24, y: -142, width: 58, height: 22 },
      hitstunFrames: 14,
      blockstunFrames: 9,
      knockback: 4,
      blockPushback: 3,
      hitstopFrames: 6,
    },
    kick: {
      id: 'romulo.kick',
      displayName: 'Chute',
      state: 'kick',
      level: 'mid',
      damage: 12,
      chipDamage: 1,
      startupFrames: 11,
      activeFrames: 4,
      recoveryFrames: 19,
      hitbox: { x: 30, y: -100, width: 70, height: 30 },
      hitstunFrames: 18,
      blockstunFrames: 12,
      knockback: 6,
      blockPushback: 4.5,
      hitstopFrames: 8,
    },
    crouchPunch: {
      id: 'romulo.crouchPunch',
      displayName: 'Soco agachado',
      state: 'crouchPunch',
      level: 'mid',
      damage: 6,
      chipDamage: 0,
      startupFrames: 6,
      activeFrames: 3,
      recoveryFrames: 11,
      hitbox: { x: 22, y: -92, width: 52, height: 22 },
      hitstunFrames: 13,
      blockstunFrames: 8,
      knockback: 3,
      blockPushback: 2.5,
      hitstopFrames: 5,
    },
    crouchKick: {
      id: 'romulo.crouchKick',
      displayName: 'Rasteira',
      state: 'crouchKick',
      level: 'low',
      damage: 10,
      chipDamage: 1,
      startupFrames: 10,
      activeFrames: 4,
      recoveryFrames: 20,
      hitbox: { x: 26, y: -28, width: 86, height: 24 },
      hitstunFrames: 16,
      blockstunFrames: 11,
      knockback: 5,
      blockPushback: 4,
      hitstopFrames: 7,
    },
    airPunch: {
      id: 'romulo.airPunch',
      displayName: 'Soco aéreo',
      state: 'airPunch',
      level: 'overhead',
      damage: 8,
      chipDamage: 0,
      startupFrames: 6,
      activeFrames: 6,
      recoveryFrames: 12,
      hitbox: { x: 16, y: -118, width: 52, height: 28 },
      hitstunFrames: 14,
      blockstunFrames: 9,
      knockback: 3.5,
      blockPushback: 3,
      hitstopFrames: 6,
    },
    airKick: {
      id: 'romulo.airKick',
      displayName: 'Chute aéreo',
      state: 'airKick',
      level: 'overhead',
      damage: 11,
      chipDamage: 1,
      startupFrames: 9,
      activeFrames: 8,
      recoveryFrames: 16,
      hitbox: { x: -12, y: -80, width: 90, height: 36 },
      hitstunFrames: 17,
      blockstunFrames: 12,
      knockback: 5,
      blockPushback: 4,
      hitstopFrames: 8,
    },
  },
  specials: [ROMULO_24ZAP, ROMULO_MINDHUB],
  palette: { body: 0x181c2b, accent: 0xd9a52e, skin: 0xcf926b, outline: 0x0b0820 },
  assets: {
    portrait: 'fighters/romulo/portrait.png',
    pixelArt: true,
    specialEffects: {
      [ROMULO_24ZAP.id]: zapEffect,
      [ROMULO_MINDHUB.id]: mindhubEffect,
    },
    sprite: {
      sheet: {
        key: 'romulo-sheet',
        path: 'fighters/romulo/sprite.png',
        frameWidth: 192,
        frameHeight: 224,
      },
      // Eight transparent pixels below the grounded soles.
      visual: { scale: 1, offsetX: 0, offsetY: 8 },
      animations: {
        idle: { frames: [0, 1, 2, 3], frameRate: 6 },
        walk: { frames: [4, 5, 6, 7, 8, 9], frameRate: 10 },
        jump: { frames: [10, 11, 12], jumpPhases: { rise: 1, apex: 1, fall: 1 } },
        crouch: { frames: [13] },
        punch: { frames: [14, 15, 16], attackPhases: { startup: 1, active: 1, recovery: 1 } },
        kick: { frames: [17, 18, 19], attackPhases: { startup: 1, active: 1, recovery: 1 } },
        crouchPunch: { frames: [20, 21, 22], attackPhases: { startup: 1, active: 1, recovery: 1 } },
        crouchKick: { frames: [23, 24, 25], attackPhases: { startup: 1, active: 1, recovery: 1 } },
        airPunch: { frames: [26, 27, 28], attackPhases: { startup: 1, active: 1, recovery: 1 } },
        airKick: { frames: [29, 30, 31], attackPhases: { startup: 1, active: 1, recovery: 1 } },
        block: { frames: [32] },
        crouchBlock: { frames: [33] },
        hurt: { frames: [34, 35], frameRate: 10 },
        knockout: { frames: [36, 37, 38], frameRate: 8 },
        victory: { frames: [39] },
        // Both specials thrust the hand forward: the punch's poses, one per phase.
        special: { frames: [14, 15, 16], attackPhases: { startup: 1, active: 1, recovery: 1 } },
      },
    },
  },
};
