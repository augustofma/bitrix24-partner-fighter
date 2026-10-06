import type { AttackConfig } from '../../types/fighter';
import { SPECIAL_METER } from '../../config/special';
import type { Direction, Vec2 } from '../../types/geometry';
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

    const push = pushDirection(attacker, defender);
    let type: CombatEvent['type'];
    if (isAttackBlocked(defender, attack)) {
      defender.applyBlock(attack, push);
      if (attack.state !== 'special') attacker.changeSpecialMeter(SPECIAL_METER.blocked);
      type = 'block';
    } else {
      defender.applyHit(attack, push);
      if (attack.state !== 'special') {
        attacker.changeSpecialMeter(SPECIAL_METER.hit);
        if (attack.damage > 0) defender.changeSpecialMeter(SPECIAL_METER.received);
      }
      type = defender.isKnockedOut ? 'koHit' : 'hit';
    }
    return { type, attackerIndex, defenderIndex, attack, point };
  }
}

/**
 * Single place that decides whether a guard stops an attack. Today any guard (standing or
 * crouching) blocks everything. Future high/low/overhead rules belong here, e.g. comparing an
 * `AttackConfig` height with the defender's guard state.
 */
export function isAttackBlocked(defender: Fighter, _attack: AttackConfig): boolean {
  return defender.isBlocking;
}

/**
 * Hits push the defender away from the attacker. For ground attacks this equals the
 * attacker's facing; for a cross-up it correctly pushes toward the side the defender is on.
 */
export function pushDirection(attacker: Fighter, defender: Fighter): Direction {
  const dx = defender.position.x - attacker.position.x;
  if (dx === 0) return attacker.direction;
  return dx > 0 ? 1 : -1;
}

export function otherIndex(index: FighterIndex): FighterIndex {
  return index === 0 ? 1 : 0;
}
