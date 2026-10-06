import { GRAVITY, GROUND_FRICTION, MIN_SLIDE_SPEED } from '../../config/simulation';
import type { FighterStateId } from '../../types/fighter';
import type { Vec2 } from '../../types/geometry';

/** Landing changes state before friction, preserving the same-frame air-attack cancellation. */
export function integrateFighterPhysics(
  position: Vec2,
  velocity: Vec2,
  groundY: number,
  state: () => FighterStateId,
  land: () => void,
): void {
  if (position.y < groundY || velocity.y < 0) velocity.y += GRAVITY;
  position.x += velocity.x;
  position.y += velocity.y;
  if (position.y >= groundY) {
    const wasAirborne = velocity.y > 0;
    position.y = groundY;
    velocity.y = 0;
    if (wasAirborne) land();
  }
  if (position.y >= groundY && state() !== 'walk') {
    velocity.x *= GROUND_FRICTION;
    if (Math.abs(velocity.x) < MIN_SLIDE_SPEED) velocity.x = 0;
  }
}
