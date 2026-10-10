import type { AttackConfig } from '../../types/fighter';
import { SPECIAL_METER } from '../../config/special';
import type { Direction, Vec2 } from '../../types/geometry';
import type { Fighter } from '../fighter/Fighter';
import { attackHits } from '../fighter/attackFrames';
import { GUARD_COVERAGE, guardPostureOf } from '../fighter/fighterStates';
import { intersectionCenter, rectsOverlap } from '../geometry';

export type FighterIndex = 0 | 1;

export interface CombatEvent {
  type: 'hit' | 'block' | 'koHit';
  attackerIndex: FighterIndex;
  defenderIndex: FighterIndex;
  /** The contact that landed: the attack, or its step resolved to a full config. */
  attack: AttackConfig;
  /** Which step of a multi-hit attack (0 for single-hit ones) and how many it has. */
  hitIndex: number;
  hitCount: number;
  /** World position of the contact, for effects. */
  point: Vec2;
}

interface Contact {
  attackerIndex: FighterIndex;
  attack: AttackConfig;
  hitIndex: number;
  hitCount: number;
  point: Vec2;
}

/**
 * Resolves hitbox-vs-hurtbox contacts between the two fighters.
 * Fighter-agnostic: damage, stun and push all come from the AttackConfig (per step for a
 * multi-hit attack, each step connecting at most once).
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
      const attack = attacker.activeHit;
      if (!hitbox || !hurtbox || !attack || !attacker.activeAttack) continue;
      if (!rectsOverlap(hitbox, hurtbox)) continue;
      contacts.push({
        attackerIndex,
        attack,
        hitIndex: attacker.attackStep,
        hitCount: attackHits(attacker.activeAttack).length,
        point: intersectionCenter(hitbox, hurtbox),
      });
    }

    return contacts.map((contact) => this.applyContact(fighters, contact));
  }

  private applyContact(fighters: readonly [Fighter, Fighter], contact: Contact): CombatEvent {
    const { attackerIndex, attack, hitIndex, hitCount, point } = contact;
    const defenderIndex = otherIndex(attackerIndex);
    const attacker = fighters[attackerIndex];
    const defender = fighters[defenderIndex];
    attacker.markAttackConnected();

    const push = pushDirection(attacker, defender);
    let type: CombatEvent['type'];
    // Meter: a special never pays its own user; taking damage always pays the defender.
    const normalAttack = attack.state !== 'special';
    if (isAttackBlocked(defender, attack)) {
      defender.applyBlock(attack, push);
      if (normalAttack) attacker.changeSpecialMeter(SPECIAL_METER.blocked);
      type = 'block';
    } else {
      defender.applyHit(attack, push);
      if (normalAttack) attacker.changeSpecialMeter(SPECIAL_METER.hit);
      if (attack.damage > 0) defender.changeSpecialMeter(SPECIAL_METER.received);
      type = defender.isKnockedOut ? 'koHit' : 'hit';
    }
    return { type, attackerIndex, defenderIndex, attack, hitIndex, hitCount, point };
  }
}

/**
 * Single place that decides whether a guard stops an attack: the defender must be guarding,
 * with a posture that covers the attack's level (GUARD_COVERAGE). A low hits a standing guard;
 * an overhead (jump-ins included) hits a crouching guard.
 */
export function isAttackBlocked(defender: Fighter, attack: AttackConfig): boolean {
  const posture = guardPostureOf(defender.state);
  return posture !== null && GUARD_COVERAGE[attack.level].includes(posture);
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
