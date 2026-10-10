import type { EffectImage, ImpactFrame, MoveFrame, SpecialTheme } from './specialTheme';
import { clamp01, disc, easeOutCubic, hash01, lerp, pixelBox, type Graphics } from './vfxShapes';

/*
 * CHAMA O 190!: Gabriele calls the police, Rio style. Charge: she raises a hand (the call) and a
 * patrol car screeches in from behind her, red and blue lights flashing, tyre smoke as it brakes.
 * Execution: two officers lean out of the windows and fire a burst of tracers along the whole
 * reach, muzzle flashes and casings flying. Hit: a cartoon volley landing on the rival (bursts,
 * sparks, the siren's red/blue wash); a block: sparks ricocheting off the guard. Recovery: the
 * car reverses away, lights fading.
 *
 * Configured pixel artwork with a procedural fallback; no blood or real insignia.
 */

const WHITE = 0xf4f6fa;
const BLUE = 0x1f4fbf;
const NAVY = 0x14214f;
const GLASS = 0x7fb8e6;
const TYRE = 0x121218;
const HUB = 0x9aa3b5;
const RED = 0xff2d3d;
const SIREN_BLUE = 0x2f8bff;
const HEADLIGHT = 0xfff3a8;
const SKIN = 0xc98b62;
const GUN = 0x1a1a22;
/** Light-blue uniform shirt: reads against both the car and dark backgrounds. */
const SHIRT = 0x6f9bea;
const TRACER = 0xffe066;
const FLASH = 0xfff7d6;
const SMOKE = 0xc9ccd6;

/**
 * Patrol car drawing scale: the shapes below are designed at 1x and drawn this much bigger, so
 * the car reads at fighter scale (about their waist height).
 */
const S = 1.65;
/** Patrol car size (world px, at 1x) and where it parks: behind Gabriele, facing the rival. */
const CAR = { length: 132, bodyHeight: 22, cabinWidth: 72, cabinHeight: 22, wheel: 11 } as const;
/** Behind Gabriele, with the front bumper just behind her (the illustrated car is longer). */
const PARK_BEHIND = 208;
/** Where it comes from (and leaves to): well off-screen behind her. */
const ENTRY_DISTANCE = 520;
const TRACERS = 6;
const IMPACT_BURSTS = 7;
/**
 * Artwork is 1448x1086; wheels touch y=829, with its center at (724,543). Drawn at the size of
 * a real car next to Gabriele: the roof (with the light bar) close to her head height.
 */
const CAR_ART = { scale: 0.28, groundOffset: 286, roofX: -72, roofY: -524 } as const;

type Point = { x: number; y: number };

/** The siren alternates every few frames: true = red side lit. */
const redLit = (frame: number) => frame % 8 < 4;

/** A white-and-blue patrol car, `dir` = where its nose points, on the ground at `ground`. */
function patrolCar(
  g: Graphics,
  glow: Graphics,
  cx: number,
  ground: number,
  dir: 1 | -1,
  frame: number,
  alpha: number,
  image: EffectImage,
): void {
  if (alpha <= 0) return;
  if (image.available) {
    image.show({
      x: cx,
      y: ground - CAR_ART.groundOffset * CAR_ART.scale,
      scale: CAR_ART.scale,
      alpha,
      flipX: dir < 0,
    });
    const red = redLit(frame);
    const lightX = cx + dir * (CAR_ART.roofX + (red ? -70 : 70)) * CAR_ART.scale;
    disc(
      glow,
      lightX,
      ground + CAR_ART.roofY * CAR_ART.scale,
      65 * CAR_ART.scale,
      red ? RED : SIREN_BLUE,
      0.35 * alpha,
    );
    return;
  }
  const half = (CAR.length * S) / 2;
  const wheel = CAR.wheel * S;
  const bodyHeight = CAR.bodyHeight * S;
  const bodyTop = ground - wheel - bodyHeight + 4 * S;
  // Body, blue stripe, cabin and windows.
  pixelBox(g, cx - half, bodyTop, half * 2, bodyHeight, WHITE, alpha);
  g.fillStyle(BLUE, alpha).fillRect(cx - half, bodyTop + 9 * S, half * 2, 5 * S);
  const cabinWidth = CAR.cabinWidth * S;
  const cabinHeight = CAR.cabinHeight * S;
  const cabinTop = bodyTop - cabinHeight + 2 * S;
  const cabinLeft = cx - cabinWidth / 2 - dir * 6 * S;
  pixelBox(g, cabinLeft, cabinTop, cabinWidth, cabinHeight, WHITE, alpha);
  g.fillStyle(GLASS, alpha * 0.95);
  const pane = { w: cabinWidth / 2 - 8 * S, h: cabinHeight - 8 * S };
  g.fillRect(cabinLeft + 5 * S, cabinTop + 4 * S, pane.w, pane.h);
  g.fillRect(cx - dir * 6 * S + 3 * S, cabinTop + 4 * S, pane.w, pane.h);
  // Head and tail lights.
  const nose = cx + dir * half;
  const lamp = 6 * S;
  g.fillStyle(HEADLIGHT, alpha).fillRect(nose - (dir > 0 ? lamp : 0), bodyTop + 3 * S, lamp, 5 * S);
  g.fillStyle(RED, alpha).fillRect(
    cx - dir * half - (dir > 0 ? 0 : lamp),
    bodyTop + 3 * S,
    lamp,
    5 * S,
  );
  // Light bar on the roof, red and blue taking turns, each with a soft glow.
  const barY = cabinTop - 6 * S;
  const barX = cx - dir * 6 * S;
  const bar = 20 * S;
  const red = redLit(frame);
  g.fillStyle(red ? RED : 0x6a1820, alpha).fillRect(barX - bar, barY, bar, 6 * S);
  g.fillStyle(red ? 0x16306a : SIREN_BLUE, alpha).fillRect(barX, barY, bar, 6 * S);
  const lit = { x: barX + (red ? -bar / 2 : bar / 2), y: barY + 3 * S };
  disc(glow, lit.x, lit.y, 16 * S, red ? RED : SIREN_BLUE, 0.3 * alpha);
  disc(glow, lit.x, lit.y, 8 * S, red ? RED : SIREN_BLUE, 0.5 * alpha);
  // Wheels.
  for (const wx of [cx - half + 26 * S, cx + half - 26 * S]) {
    disc(g, wx, ground - wheel, wheel, TYRE, alpha);
    disc(g, wx, ground - wheel, wheel * 0.45, HUB, alpha);
  }
}

/** Where the two officers' guns are when they lean out (front and back windows). */
function muzzles(cx: number, ground: number, dir: 1 | -1, illustrated: boolean): Point[] {
  if (illustrated)
    return [
      { x: cx + dir * 330 * CAR_ART.scale, y: ground - 407 * CAR_ART.scale },
      { x: cx - dir * 65 * CAR_ART.scale, y: ground - 396 * CAR_ART.scale },
    ];
  const windowY = ground - (CAR.wheel + CAR.bodyHeight + 8) * S;
  return [
    { x: cx + dir * 60 * S, y: windowY },
    { x: cx + dir * 16 * S, y: windowY - 14 * S },
  ];
}

/** An officer leaning out of a window, arm and gun pointing at the rival. */
function officer(g: Graphics, muzzle: Point, dir: 1 | -1, alpha: number): void {
  const headX = muzzle.x - dir * 30 * S;
  const headY = muzzle.y - 4 * S;
  // A dark outline first, so the officer reads over any background.
  disc(g, headX, headY, 8.5 * S, NAVY, alpha);
  disc(g, headX, headY, 7 * S, SKIN, alpha);
  pixelBox(g, headX - 8 * S, headY - 11 * S, 16 * S, 6 * S, NAVY, alpha);
  const arm = 22 * S;
  g.fillStyle(NAVY, alpha).fillRect(
    Math.min(headX, headX + dir * arm) - S,
    muzzle.y - S,
    arm + 2 * S,
    7 * S,
  );
  g.fillStyle(SHIRT, alpha).fillRect(Math.min(headX, headX + dir * arm), muzzle.y, arm, 5 * S);
  const gun = 10 * S;
  g.fillStyle(GUN, alpha).fillRect(
    Math.min(muzzle.x - dir * gun, muzzle.x),
    muzzle.y - 2 * S,
    gun,
    5 * S,
  );
}

/** A short glowing tracer between two points along a shot (p = 0..1 of the way). */
function tracer(g: Graphics, glow: Graphics, from: Point, to: Point, p: number): void {
  if (p <= 0 || p > 1) return;
  const head = { x: lerp(from.x, to.x, p), y: lerp(from.y, to.y, p) };
  const tail = {
    x: lerp(from.x, to.x, Math.max(0, p - 0.12)),
    y: lerp(from.y, to.y, Math.max(0, p - 0.12)),
  };
  glow.lineStyle(7, TRACER, 0.35).lineBetween(tail.x, tail.y, head.x, head.y);
  g.lineStyle(3, TRACER, 1).lineBetween(tail.x, tail.y, head.x, head.y);
  g.fillStyle(FLASH, 1).fillRect(head.x - 2, head.y - 2, 4, 4);
}

/** A star-shaped muzzle flash. */
function muzzleFlash(g: Graphics, glow: Graphics, at: Point, dir: 1 | -1, size: number): void {
  disc(glow, at.x + dir * 6, at.y, size * 1.6, TRACER, 0.6);
  g.fillStyle(FLASH, 1);
  g.fillTriangle(at.x, at.y - size * 0.45, at.x, at.y + size * 0.45, at.x + dir * size * 1.4, at.y);
  g.fillTriangle(
    at.x + dir * size * 0.3,
    at.y - size,
    at.x + dir * size * 0.3,
    at.y + size,
    at.x + dir * size * 0.75,
    at.y,
  );
}

function drawMove(f: MoveFrame): void {
  const { g, glow, phase, t, frame, direction: dir, fighter, front, hand } = f;
  const ground = fighter.position.y;
  const parked = fighter.position.x - dir * PARK_BEHIND;

  if (phase === 'startup') {
    // Screeching in from behind, braking hard at the end.
    const arrive = easeOutCubic(clamp01(t * 1.15));
    const cx = lerp(parked - dir * ENTRY_DISTANCE, parked, arrive);
    patrolCar(g, glow, cx, ground, dir, frame, 1, f.emblem);
    if (arrive > 0.55) {
      for (let i = 0; i < 4; i++) {
        const puff = clamp01(t * 2 - 1 + i * 0.1);
        disc(
          g,
          cx - dir * ((CAR.length * S) / 2 - 20 + i * 12 * puff),
          ground - 6 - i * 4 * puff,
          5 + 6 * puff,
          SMOKE,
          0.5 * (1 - puff),
        );
      }
    }
    return;
  }

  if (phase === 'active') {
    patrolCar(g, glow, parked, ground, dir, frame, 1, f.emblem);
    const target = { x: front.x, y: hand.y };
    muzzles(parked, ground, dir, f.emblem.available).forEach((muzzle, gun) => {
      if (!f.emblem.available) officer(g, muzzle, dir, 1);
      if ((frame + gun) % 3 === 0) muzzleFlash(g, glow, muzzle, dir, 9);
      // A burst of tracers along the whole reach, each aimed a little differently.
      for (let i = 0; i < TRACERS / 2; i++) {
        const aim = { x: target.x, y: target.y + (hash01(i, gun) - 0.5) * 50 };
        tracer(g, glow, muzzle, aim, (t * 2.4 + i / 3 + gun * 0.17) % 1);
      }
      // Casings flying up and back.
      for (let i = 0; i < 2; i++) {
        const c = (t * 3 + i * 0.5 + gun * 0.25) % 1;
        g.fillStyle(TRACER, 1 - c).fillRect(
          muzzle.x - dir * (8 + 26 * c),
          muzzle.y - 30 * c + 40 * c * c,
          3,
          2,
        );
      }
    });
    return;
  }

  // Recovery: the car reverses away, lights fading.
  const leave = clamp01(t * 1.2) ** 2;
  patrolCar(
    g,
    glow,
    lerp(parked, parked - dir * ENTRY_DISTANCE, leave),
    ground,
    dir,
    frame,
    1 - leave * 0.6,
    f.emblem,
  );
}

function drawImpact(f: ImpactFrame): void {
  const { g, glow, x, y, t, blocked, direction: dir } = f;
  const fade = 1 - t;
  // The siren's red/blue wash over the rival.
  const red = Math.floor(t * 12) % 2 === 0;
  disc(glow, x, y, 80 * (blocked ? 0.6 : 1), red ? RED : SIREN_BLUE, 0.22 * fade);
  const bursts = blocked ? 3 : IMPACT_BURSTS;
  for (let i = 0; i < bursts; i++) {
    // The volley lands one shot after another.
    const local = clamp01((t - i * 0.08) / 0.3);
    if (local <= 0 || local >= 1) continue;
    const bx = x + (hash01(i, 3) - 0.5) * 50 * dir;
    const by = y + (hash01(i, 4) - 0.5) * 70;
    const size = (blocked ? 10 : 16) * (1 - local * 0.5);
    disc(glow, bx, by, size * 1.8, TRACER, 0.7 * (1 - local));
    disc(g, bx, by, size * 0.5, FLASH, 1 - local);
    // Sparks: straight off the hit, or ricocheting back off a guard.
    g.lineStyle(2, TRACER, 1 - local);
    for (let s = 0; s < 4; s++) {
      const a = hash01(i, s + 9) * Math.PI * 2;
      const back = blocked ? -dir : dir;
      const len = (8 + 18 * local) * (blocked ? 1.3 : 1);
      g.lineBetween(
        bx,
        by,
        bx + Math.cos(a) * len * back + back * 6 * local,
        by + Math.sin(a) * len,
      );
    }
  }
}

export const POLICE_THEME: SpecialTheme = {
  impactMs: 720,
  drawMove,
  drawImpact,
};
