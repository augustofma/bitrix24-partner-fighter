import type { FighterBoxes } from '../../types/fighter';

/**
 * Hurtboxes for a standard-size (about 170 px tall) humanoid fighter.
 * Boxes are relative to the feet and authored facing right (see LocalBox).
 * Characters with a different build can define their own FighterBoxes.
 */
export const STANDARD_BODY: FighterBoxes = {
  standing: { x: -28, y: -170, width: 56, height: 170 },
  // Lower than any standing punch hitbox: crouching dodges high attacks.
  crouching: { x: -30, y: -112, width: 64, height: 112 },
  airborne: { x: -26, y: -150, width: 52, height: 120 },
  pushWidth: 50,
  // A jumper whose feet are ~80 px above the ground (airborne box bottom at -30) clears this
  // body and can cross over: a forward jump from close/mid range lands on the other side.
  pushHeight: 110,
};
