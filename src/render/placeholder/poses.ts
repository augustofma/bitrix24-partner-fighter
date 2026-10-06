import { attackPhaseAt } from '../../core/fighter/attackFrames';
import type { ReadonlyFighter } from '../../core/fighter/ReadonlyFighter';
import type { Vec2 } from '../../types/geometry';

/**
 * Skeleton of the placeholder stick-figure, relative to the feet, facing right.
 * Temporary art: replaced by sprite animations later (see docs/ART_DIRECTION.md).
 */
export interface Pose {
  head: Vec2;
  neck: Vec2;
  hip: Vec2;
  frontElbow: Vec2;
  frontHand: Vec2;
  backElbow: Vec2;
  backHand: Vec2;
  frontKnee: Vec2;
  frontFoot: Vec2;
  backKnee: Vec2;
  backFoot: Vec2;
}

type PoseKey = keyof Pose;
const POSE_KEYS = [
  'head',
  'neck',
  'hip',
  'frontElbow',
  'frontHand',
  'backElbow',
  'backHand',
  'frontKnee',
  'frontFoot',
  'backKnee',
  'backFoot',
] as const satisfies readonly PoseKey[];

const p = (x: number, y: number): Vec2 => ({ x, y });

// prettier-ignore
export const POSES = {
  idle: {
    head: p(6, -158), neck: p(4, -138), hip: p(0, -84),
    frontElbow: p(22, -112), frontHand: p(34, -130), backElbow: p(-6, -108), backHand: p(16, -124),
    frontKnee: p(14, -42), frontFoot: p(20, 0), backKnee: p(-12, -42), backFoot: p(-20, 0),
  },
  crouch: {
    head: p(14, -112), neck: p(10, -94), hip: p(-2, -50),
    frontElbow: p(28, -76), frontHand: p(38, -92), backElbow: p(6, -72), backHand: p(24, -86),
    frontKnee: p(26, -34), frontFoot: p(22, 0), backKnee: p(-18, -26), backFoot: p(-24, 0),
  },
  jump: {
    head: p(6, -160), neck: p(4, -140), hip: p(0, -90),
    frontElbow: p(20, -118), frontHand: p(30, -134), backElbow: p(-8, -112), backHand: p(12, -126),
    frontKnee: p(22, -70), frontFoot: p(12, -42), backKnee: p(-2, -62), backFoot: p(-14, -40),
  },
  punchWindup: {
    head: p(2, -156), neck: p(0, -137), hip: p(0, -84),
    frontElbow: p(8, -112), frontHand: p(16, -124), backElbow: p(-8, -108), backHand: p(14, -124),
    frontKnee: p(16, -42), frontFoot: p(24, 0), backKnee: p(-14, -42), backFoot: p(-22, 0),
  },
  punch: {
    head: p(14, -156), neck: p(10, -138), hip: p(0, -84),
    frontElbow: p(44, -130), frontHand: p(74, -132), backElbow: p(-8, -110), backHand: p(6, -122),
    frontKnee: p(20, -42), frontFoot: p(30, 0), backKnee: p(-16, -40), backFoot: p(-26, 0),
  },
  kickWindup: {
    head: p(0, -156), neck: p(0, -136), hip: p(0, -86),
    frontElbow: p(18, -114), frontHand: p(28, -128), backElbow: p(-14, -110), backHand: p(0, -122),
    frontKnee: p(26, -80), frontFoot: p(20, -44), backKnee: p(-6, -44), backFoot: p(-10, 0),
  },
  kick: {
    head: p(-4, -154), neck: p(-4, -134), hip: p(0, -86),
    frontElbow: p(14, -116), frontHand: p(24, -128), backElbow: p(-20, -110), backHand: p(-12, -124),
    frontKnee: p(44, -88), frontFoot: p(92, -86), backKnee: p(-6, -44), backFoot: p(-10, 0),
  },
  airPunch: {
    head: p(12, -158), neck: p(8, -140), hip: p(0, -90),
    frontElbow: p(36, -118), frontHand: p(62, -104), backElbow: p(-14, -116), backHand: p(-4, -128),
    frontKnee: p(22, -70), frontFoot: p(12, -42), backKnee: p(-2, -62), backFoot: p(-14, -40),
  },
  airKick: {
    head: p(-6, -156), neck: p(-4, -138), hip: p(0, -90),
    frontElbow: p(14, -120), frontHand: p(22, -132), backElbow: p(-18, -116), backHand: p(-28, -128),
    frontKnee: p(30, -70), frontFoot: p(70, -54), backKnee: p(-2, -66), backFoot: p(-16, -44),
  },
  crouchBlock: {
    head: p(10, -108), neck: p(6, -92), hip: p(-4, -50),
    frontElbow: p(22, -80), frontHand: p(26, -106), backElbow: p(16, -74), backHand: p(24, -100),
    frontKnee: p(26, -34), frontFoot: p(22, 0), backKnee: p(-18, -26), backFoot: p(-24, 0),
  },
  block: {
    head: p(2, -150), neck: p(0, -132), hip: p(-4, -80),
    frontElbow: p(26, -118), frontHand: p(30, -146), backElbow: p(20, -108), backHand: p(28, -138),
    frontKnee: p(14, -40), frontFoot: p(22, 0), backKnee: p(-16, -40), backFoot: p(-24, 0),
  },
  hurt: {
    head: p(-20, -150), neck: p(-14, -132), hip: p(-2, -82),
    frontElbow: p(8, -110), frontHand: p(2, -90), backElbow: p(-30, -116), backHand: p(-44, -130),
    frontKnee: p(12, -42), frontFoot: p(18, 0), backKnee: p(-14, -42), backFoot: p(-22, 0),
  },
  knockedDown: {
    head: p(-78, -16), neck: p(-58, -16), hip: p(-4, -14),
    frontElbow: p(-46, -6), frontHand: p(-28, -4), backElbow: p(-64, -34), backHand: p(-84, -40),
    frontKnee: p(20, -26), frontFoot: p(46, -6), backKnee: p(22, -14), backFoot: p(50, -4),
  },
  victory: {
    head: p(2, -160), neck: p(2, -140), hip: p(0, -84),
    frontElbow: p(16, -164), frontHand: p(20, -196), backElbow: p(-16, -112), backHand: p(-6, -96),
    frontKnee: p(16, -42), frontFoot: p(24, 0), backKnee: p(-14, -42), backFoot: p(-24, 0),
  },
} satisfies Record<string, Pose>;

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out = {} as Pose;
  for (const key of POSE_KEYS) {
    out[key] = { x: a[key].x + (b[key].x - a[key].x) * t, y: a[key].y + (b[key].y - a[key].y) * t };
  }
  return out;
}

/** Moves the upper body (everything above the hip) vertically, e.g. for breathing. */
function bobUpperBody(pose: Pose, dy: number): Pose {
  const out = lerpPose(pose, pose, 0);
  for (const key of ['head', 'neck', 'frontElbow', 'frontHand', 'backElbow', 'backHand'] as const) {
    out[key].y += dy;
  }
  out.hip.y += dy / 2;
  return out;
}

function walkPose(frame: number): Pose {
  const swing = Math.sin(frame * 0.3);
  const pose = bobUpperBody(POSES.idle, Math.abs(swing) * 2);
  pose.frontKnee = p(14 + swing * 8, -42);
  pose.frontFoot = p(20 + swing * 14, -Math.max(0, swing) * 6);
  pose.backKnee = p(-12 - swing * 8, -42);
  pose.backFoot = p(-20 - swing * 14, -Math.max(0, -swing) * 6);
  return pose;
}

/** `rest` is the pose the attack starts from and returns to (idle on the ground, jump in the air). */
function attackPose(fighter: ReadonlyFighter, windup: Pose, extended: Pose, rest: Pose): Pose {
  const attack = fighter.activeAttack;
  if (!attack) return rest;
  const frame = fighter.stateFrame;
  switch (attackPhaseAt(attack, frame)) {
    case 'startup':
      return lerpPose(rest, windup, Math.min(1, (frame + 1) / attack.startupFrames));
    case 'active':
      return extended;
    case 'recovery': {
      const elapsed = frame - attack.startupFrames - attack.activeFrames;
      return lerpPose(extended, rest, Math.min(1, elapsed / attack.recoveryFrames));
    }
  }
}

/** Picks the placeholder pose for the fighter's current state. `timeMs` drives idle loops. */
export function poseFor(fighter: ReadonlyFighter, timeMs: number): Pose {
  switch (fighter.state) {
    case 'idle':
      return bobUpperBody(POSES.idle, Math.sin(timeMs / 220) * 2);
    case 'walk':
      return walkPose(fighter.stateFrame);
    case 'jump':
      return POSES.jump;
    case 'crouch':
      return POSES.crouch;
    case 'punch':
      return attackPose(fighter, POSES.punchWindup, POSES.punch, POSES.idle);
    case 'kick':
      return attackPose(fighter, POSES.kickWindup, POSES.kick, POSES.idle);
    case 'airPunch':
      return attackPose(fighter, POSES.jump, POSES.airPunch, POSES.jump);
    case 'airKick':
      return attackPose(fighter, POSES.jump, POSES.airKick, POSES.jump);
    case 'block':
      return POSES.block;
    case 'crouchBlock':
      return POSES.crouchBlock;
    case 'hurt':
      return POSES.hurt;
    case 'knockout':
      return fighter.isAirborne ? POSES.hurt : POSES.knockedDown;
    case 'victory':
      return bobUpperBody(POSES.victory, Math.sin(timeMs / 120) * 3);
  }
}
