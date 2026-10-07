import type { ReadonlyFighter } from '../core/fighter/ReadonlyFighter';
import type { SimulationEvent } from '../core/FightSimulation';
import type { AttackStateId } from '../types/fighter';
import type { SfxId } from '../types/audio';

/*
 * Which sounds a simulation event makes. Pure and driven only by real events: a whiff
 * produces no contact event, so it never sounds like an impact.
 */

/** Impact of each attack that connected (specials hit with the heaviest one). */
const IMPACT_BY_ATTACK: Readonly<Record<AttackStateId, SfxId>> = {
  punch: 'punch',
  kick: 'kick',
  crouchPunch: 'crouch-punch',
  crouchKick: 'crouch-kick',
  airPunch: 'air-punch',
  airKick: 'air-kick',
  special: 'kick',
};

export function impactSfx(attackState: AttackStateId): SfxId {
  return IMPACT_BY_ATTACK[attackState];
}

export function combatSfx(
  event: SimulationEvent,
  /** When given, a special with its own sound (assets.specialEffects[id].sound) uses it. */
  fighters?: readonly ReadonlyFighter[],
): SfxId[] {
  switch (event.type) {
    case 'hit':
    case 'koHit':
      // The blow lands (impact) and the defender reacts (hurt). KO itself sounds on 'ko'.
      return [impactSfx(event.attack.state), 'hurt'];
    case 'block':
      return ['block'];
    case 'jump':
      return ['jump'];
    case 'land':
      return ['landing'];
    case 'specialStart': {
      const fighter = fighters?.[event.fighterIndex];
      const move = fighter?.activeAttack;
      const themed = move ? fighter.config.assets.specialEffects?.[move.id]?.sound : undefined;
      return [themed ?? 'special'];
    }
    case 'ko':
      return ['ko'];
    case 'fightStart':
      return ['fight'];
    case 'victoryPose':
      return ['victory'];
    default:
      return [];
  }
}
