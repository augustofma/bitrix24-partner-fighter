import type { FighterConfig, SpecialMoveConfig } from '../../types/fighter';
import type { Direction, Rect, Vec2 } from '../../types/geometry';
import { attackWouldConnect } from './attackGeometry';

/*
 * Which specials a fighter may start right now, shared by the Fighter (a human or CPU press)
 * and the AI (deciding whether a press is worth it), so both apply exactly the same rules.
 */

/**
 * Specials payable with `meter` and allowed in the current posture (`groundOnly` in the air),
 * in config order. A special press starts the FIRST of them.
 */
export function usableSpecials(
  config: Pick<FighterConfig, 'specials'>,
  meter: number,
  airborne: boolean,
): SpecialMoveConfig[] {
  return config.specials.filter(
    (move) => (!move.groundOnly || !airborne) && move.meterCost <= meter,
  );
}

/** The special a press would start now, if any (same rule the Fighter applies). */
export function specialForPress(
  config: Pick<FighterConfig, 'specials'>,
  meter: number,
  airborne: boolean,
): SpecialMoveConfig | undefined {
  return usableSpecials(config, meter, airborne)[0];
}

/**
 * Would `move`, started now, touch `target`'s current hurtbox when it becomes active? Takes
 * the forward travel during startup (advanceSpeed) into account. Pure geometry: reach and height.
 */
export function specialWouldConnect(
  move: SpecialMoveConfig,
  origin: Readonly<Vec2>,
  direction: Direction,
  target: Rect | null,
): boolean {
  const travel = move.advanceSpeed * move.startupFrames * direction;
  return attackWouldConnect(move, { x: origin.x + travel, y: origin.y }, direction, target);
}

/** Farthest center distance (px) the move reaches forward, startup travel included. */
export function specialReach(move: SpecialMoveConfig): number {
  return move.hitbox.x + move.hitbox.width + move.advanceSpeed * move.startupFrames;
}
