import type { ReadonlyFighter } from '../core/fighter/ReadonlyFighter';
import { ANNOUNCER_VOICE } from './announcerVoice';
import type { SimulationEvent } from '../core/FightSimulation';
import type { AttackStateId } from '../types/fighter';
import type { SfxId } from '../types/audio';

/*
 * Which sounds a simulation event makes. Pure and driven only by real events: a whiff
 * produces no contact event, so it never sounds like an impact.
 */

/** Impact of each attack that connected (specials have their own, heavier one). */
const IMPACT_BY_ATTACK: Readonly<Record<AttackStateId, SfxId>> = {
  punch: 'punch',
  kick: 'kick',
  crouchPunch: 'crouch-punch',
  crouchKick: 'crouch-kick',
  airPunch: 'air-punch',
  airKick: 'air-kick',
  special: 'special-hit',
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
    case 'koHit': {
      // The blow lands (impact) and the defender reacts (hurt). KO itself sounds on 'ko'. A
      // multi-hit special may give each of its steps its own impact (hitSounds).
      const attacker = fighters?.[event.attackerIndex];
      const themed =
        event.attack.state === 'special'
          ? attacker?.config.assets.specialEffects?.[event.attack.id]?.hitSounds?.[event.hitIndex]
          : undefined;
      return [themed ?? impactSfx(event.attack.state), 'hurt'];
    }
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
    // The big calls: the stinger and the announcer's voice together.
    case 'ko':
      return ['ko', ANNOUNCER_VOICE.ko];
    case 'fightStart':
      return ['fight', ANNOUNCER_VOICE.fight];
    case 'timeUp':
      return [ANNOUNCER_VOICE.timeOver];
    case 'roundDraw':
      return [ANNOUNCER_VOICE.draw];
    case 'victoryPose':
      return ['victory'];
    default:
      return [];
  }
}
