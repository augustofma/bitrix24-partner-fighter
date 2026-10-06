import type { AttackConfig } from '../../types/fighter';
import type { Direction, Rect, Vec2 } from '../../types/geometry';
import { rectsOverlap, toWorldRect } from '../geometry';

/**
 * Would `attack`, thrown now from `origin` facing `direction`, touch `target`'s current
 * hurtbox? Pure geometry (reach AND height), so it works for any character and posture:
 * e.g. a standing punch passes over a crouching hurtbox.
 */
export function attackWouldConnect(
  attack: AttackConfig,
  origin: Readonly<Vec2>,
  direction: Direction,
  target: Rect | null,
): boolean {
  if (!target) return false;
  return rectsOverlap(toWorldRect(attack.hitbox, origin, direction), target);
}
