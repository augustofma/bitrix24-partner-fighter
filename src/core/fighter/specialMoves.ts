import type { FighterConfig, SpecialMoveConfig } from '../../types/fighter';
import type { Direction, Rect, Vec2 } from '../../types/geometry';
import { attackHits } from './attackFrames';
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

/**
 * The special a press would start now, if any (same rule the Fighter applies). A fighter with
 * several specials takes turns: `turn` (how many specials it has started) picks where the list
 * starts, so each press starts the next move in config order and they alternate. When the move
 * whose turn it is cannot be paid (or not in the air), the next usable one in the list goes.
 */
export function specialForPress(
  config: Pick<FighterConfig, 'specials'>,
  meter: number,
  airborne: boolean,
  turn = 0,
): SpecialMoveConfig | undefined {
  const { specials } = config;
  const usable = new Set(usableSpecials(config, meter, airborne));
  const start = specials.length > 0 ? (turn ?? 0) % specials.length : 0;
  for (let i = 0; i < specials.length; i++) {
    const move = specials[(start + i) % specials.length]!;
    if (usable.has(move)) return move;
  }
  return undefined;
}

/**
 * Would `move` (any of its hits), started now, touch `target`'s current hurtbox when it becomes
 * active? Takes
 * the forward travel during startup (advanceSpeed) into account. Pure geometry: reach and height.
 */
export function specialWouldConnect(
  move: SpecialMoveConfig,
  origin: Readonly<Vec2>,
  direction: Direction,
  target: Rect | null,
): boolean {
  const travel = move.advanceSpeed * move.startupFrames * direction;
  const from = { x: origin.x + travel, y: origin.y };
  return attackHits(move).some((hit) => attackWouldConnect(hit, from, direction, target));
}

/** Farthest center distance (px) the move reaches forward, startup travel included. */
export function specialReach(move: SpecialMoveConfig): number {
  const reach = Math.max(...attackHits(move).map(({ hitbox }) => hitbox.x + hitbox.width));
  return reach + move.advanceSpeed * move.startupFrames;
}
