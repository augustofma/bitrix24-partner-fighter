import type { ReadonlyFighter } from '../core/fighter/ReadonlyFighter';

/** Frames of white flash at the start of hitstun (same for every renderer). */
export const HIT_FLASH_FRAMES = 4;
export const HIT_FLASH_COLOR = 0xffffff;

export function isHitFlashing(fighter: Pick<ReadonlyFighter, 'state' | 'stateFrame'>): boolean {
  return fighter.state === 'hurt' && fighter.stateFrame < HIT_FLASH_FRAMES;
}
