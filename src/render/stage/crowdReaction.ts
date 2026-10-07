import type { SimulationEvent } from '../../core/FightSimulation';
import type { CrowdReaction } from '../../types/stage';
import { BIG_HIT_DAMAGE } from './stageMotion';

/**
 * How the crowd reacts to a simulation event (null: no reaction). Read-only: the crowd is
 * presentation, so this never feeds anything back into the fight.
 */
export function crowdReaction(event: SimulationEvent): CrowdReaction | null {
  switch (event.type) {
    case 'koHit':
      return 'ko';
    case 'specialStart':
      return 'special';
    case 'hit':
      if (event.attack.state === 'special') return 'special';
      return event.attack.damage >= BIG_HIT_DAMAGE ? 'bigHit' : null;
    default:
      return null;
  }
}
