import type { AttackConfig } from '../../types/fighter';
import type { Vec2 } from '../../types/geometry';
import type { Fighter } from '../fighter/Fighter';
import { intersectionCenter, rectsOverlap } from '../geometry';

export type FighterIndex = 0 | 1;

export interface CombatEvent {
  type: 'hit' | 'block' | 'koHit';
  attackerIndex: FighterIndex;
  defenderIndex: FighterIndex;
  attack: AttackConfig;
  /** World position of the contact, for effects. */
  point: Vec2;
}

interface Contact {
  attackerIndex: FighterIndex;
  attack: AttackConfig;
  point: Vec2;
}

/**
 * Resolves hitbox-vs-hurtbox contacts between the two fighters.
 * Fighter-agnostic: damage, stun and push all come from the AttackConfig.
 * Contacts are gathered first and applied afterwards, so simultaneous hits trade.
 */
export class CombatSystem {
  resolve(fighters: readonly [Fighter, Fighter]): CombatEvent[] {
    const contacts: Contact[] = [];
    for (const attackerIndex of [0, 1] as const) {
      const attacker = fighters[attackerIndex];
      const defender = fighters[otherIndex(attackerIndex)];
      const hitbox = attacker.getHitbox();
      const hurtbox = defender.getHurtbox();
      if (!hitbox || !hurtbox || !attacker.activeAttack) continue;
      if (!rectsOverlap(hitbox, hurtbox)) continue;
      contacts.push({
        attackerIndex,
        attack: attacker.activeAttack,
        point: intersectionCenter(hitbox, hurtbox),
      });
    }

    return contacts.map((contact) => this.applyContact(fighters, contact));
  }

  private applyContact(fighters: readonly [Fighter, Fighter], contact: Contact): CombatEvent {
    const { attackerIndex, attack, point } = contact;
    const defenderIndex = otherIndex(attackerIndex);
    const attacker = fighters[attackerIndex];
    const defender = fighters[defenderIndex];
    attacker.markAttackConnected();

    let type: CombatEvent['type'];
    if (defender.isBlocking) {
      defender.applyBlock(attack, attacker.direction);
      type = 'block';
    } else {
      defender.applyHit(attack, attacker.direction);
      type = defender.isKnockedOut ? 'koHit' : 'hit';
    }
    return { type, attackerIndex, defenderIndex, attack, point };
  }
}

export function otherIndex(index: FighterIndex): FighterIndex {
  return index === 0 ? 1 : 0;
}
