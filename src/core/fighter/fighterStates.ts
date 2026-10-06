import {
  AIR_ATTACK_STATES,
  ATTACK_STATES,
  CROUCH_ATTACK_STATES,
  type AttackButton,
  type AttackSlot,
  type FighterBoxes,
  type FighterStateId,
} from '../../types/fighter';
import type { LocalBox } from '../../types/geometry';

/*
 * Pure rules about fighter states, shared by Fighter and its tests. Generic: nothing here
 * depends on a specific character.
 */

export const ATTACK_STATE_SET: ReadonlySet<FighterStateId> = new Set<FighterStateId>(ATTACK_STATES);

/** Grounded states in which the fighter is free to act. */
export const FREE_GROUND_STATES: ReadonlySet<FighterStateId> = new Set<FighterStateId>([
  'idle',
  'walk',
  'crouch',
]);

/** Guarding states. Future high/low rules compare these with the attack's height. */
export const BLOCK_STATES: ReadonlySet<FighterStateId> = new Set<FighterStateId>([
  'block',
  'crouchBlock',
]);

/** States that use the low (crouching) body: crouch, low guard and crouching attacks. */
export const CROUCHING_STATES: ReadonlySet<FighterStateId> = new Set<FighterStateId>([
  'crouch',
  'crouchBlock',
  ...CROUCH_ATTACK_STATES,
]);

/** States that end when the fighter touches the ground. */
export const LANDING_STATES: ReadonlySet<FighterStateId> = new Set<FighterStateId>([
  'jump',
  ...AIR_ATTACK_STATES,
]);

export type Stance = 'ground' | 'crouch' | 'air';

/** Which attack each button performs in each stance. */
export const ATTACK_SLOTS: Readonly<Record<Stance, Readonly<Record<AttackButton, AttackSlot>>>> = {
  ground: { punch: 'punch', kick: 'kick' },
  crouch: { punch: 'crouchPunch', kick: 'crouchKick' },
  air: { punch: 'airPunch', kick: 'airKick' },
};

/**
 * Stance of a grounded fighter starting an attack: holding ↓ at that moment means crouching.
 * (Being in the crouch state implies ↓ is held, so this also covers "already crouched".)
 */
export function groundStance(downHeld: boolean): Stance {
  return downHeld ? 'crouch' : 'ground';
}

/** The body box (relative to the feet) that can be hit in this situation. */
export function hurtboxFor(
  boxes: FighterBoxes,
  state: FighterStateId,
  airborne: boolean,
): LocalBox {
  if (airborne) return boxes.airborne;
  if (CROUCHING_STATES.has(state)) return boxes.crouching;
  return boxes.standing;
}

/**
 * The body box that blocks movement. On the ground it always starts at the feet, so two
 * grounded fighters always collide. In the air it is the airborne body, so a fighter high
 * enough above the opponent's `pushHeight` passes over it (cross-up).
 */
export function pushboxFor(
  boxes: FighterBoxes,
  state: FighterStateId,
  airborne: boolean,
): LocalBox {
  const body = hurtboxFor(boxes, state, airborne);
  const halfWidth = boxes.pushWidth / 2;
  if (airborne) return { x: -halfWidth, y: body.y, width: boxes.pushWidth, height: body.height };
  const height = Math.min(boxes.pushHeight, -body.y);
  return { x: -halfWidth, y: -height, width: boxes.pushWidth, height };
}
