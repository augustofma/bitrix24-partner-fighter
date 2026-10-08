import type { ImpactFrame, MoveFrame, SpecialTheme } from './specialTheme';
import { clamp01, disc, easeOutBack, easeOutCubic, hash01, lerp, type Graphics } from './vfxShapes';

/*
 * FLUIDZ!: a pink liquid special. Charge: pink liquid gathers in the hand as a wobbling blob,
 * drops are pulled into it, bubbles rise and a drip falls from it. Execution: a thick, rippling
 * stream of liquid gushes from the hand to the end of the reach, with a rounded wave crest at the
 * head, glossy highlights running along it and drops splashing off. Hit: a splash: a pink flash,
 * a crown of drops thrown up and out that fall back with gravity, a ripple and the emblem.
 * Dissipation: the stream breaks into falling drops and a puddle spreads and dries on the floor.
 */

const PINK = 0xff4fa3;
const HOT = 0xff2d8a;
const LIGHT = 0xffa6d2;
const DEEP = 0xc2186b;
const WHITE = 0xffffff;
/** Width of one vertical slice of the stream (px): it is drawn from rectangles only. */
const SLICE = 4;
const GATHER_DROPS = 8;
const SPRAY_DROPS = 7;
/** Gravity of the drops (px per normalized time², scaled per use). */
const GRAVITY = 140;
/** How far in front of the hand the liquid gathers while charging (px). */
const POOL_AHEAD = 36;

/** A round-ish drop (two rectangles, like `disc` but slightly taller: liquid). */
function drop(g: Graphics, x: number, y: number, radius: number, color: number, alpha: number) {
  if (radius < 1 || alpha <= 0) return;
  g.fillStyle(color, alpha);
  g.fillRect(x - radius * 0.6, y - radius * 1.15, radius * 1.2, radius * 2.2);
  g.fillRect(x - radius, y - radius * 0.55, radius * 2, radius * 1.3);
}

/** Wobbling blob of liquid: a disc whose width and height breathe out of phase. */
function blob(
  g: Graphics,
  x: number,
  y: number,
  radius: number,
  frame: number,
  color: number,
  alpha: number,
) {
  if (radius < 1 || alpha <= 0) return;
  const wobble = Math.sin(frame * 0.7) * 0.18;
  const w = radius * (1 + wobble);
  const h = radius * (1 - wobble);
  g.fillStyle(color, alpha);
  g.fillRect(x - w * 0.55, y - h, w * 1.1, h * 2);
  g.fillRect(x - w, y - h * 0.55, w * 2, h * 1.1);
  g.fillRect(x - w * 0.8, y - h * 0.82, w * 1.6, h * 1.64);
}

/**
 * The stream from the hand to `headX`: vertical slices whose center follows a travelling wave
 * and whose thickness ripples, in three layers (glow, body, glossy core).
 */
function stream(
  f: MoveFrame,
  headX: number,
  thickness: number,
  frame: number,
  alpha: number,
): void {
  const { g, glow, hand, direction: dir } = f;
  const length = Math.abs(headX - hand.x);
  const slices = Math.floor(length / SLICE);
  for (let i = 0; i <= slices; i++) {
    const d = i * SLICE;
    const x = hand.x + dir * d - (dir < 0 ? SLICE : 0);
    const phase = d * 0.09 - frame * 0.55;
    const cy = hand.y + Math.sin(phase) * thickness * 0.35;
    // Thicker toward the head, thinner at the hand where it leaves.
    const swell = 0.55 + 0.45 * clamp01(d / Math.max(1, length));
    const th = thickness * swell * (1 + 0.22 * Math.sin(phase * 1.7 + 1.3));
    glow.fillStyle(PINK, 0.32 * alpha).fillRect(x, cy - th * 0.85, SLICE, th * 1.7);
    g.fillStyle(i % 2 ? HOT : PINK, alpha).fillRect(x, cy - th / 2, SLICE, th);
    g.fillStyle(DEEP, 0.55 * alpha).fillRect(x, cy + th * 0.22, SLICE, th * 0.28);
    // Gloss: a highlight line that runs along the stream.
    if ((i + Math.floor(frame / 2)) % 5 < 3) {
      g.fillStyle(WHITE, 0.75 * alpha).fillRect(x, cy - th * 0.32, SLICE, Math.max(1, th * 0.12));
    }
  }
}

function drawMove(f: MoveFrame): void {
  const { g, glow, phase, t, frame, direction: dir, hand, front, box } = f;
  const height = box.bottom - box.top;

  if (phase === 'startup') {
    // The liquid gathers in front of the body (never over the chest or the face).
    const pool = { x: hand.x + dir * POOL_AHEAD, y: hand.y };
    const grow = easeOutBack(clamp01(t / 0.75));
    // Drops pulled into the hand from around it.
    for (let i = 0; i < GATHER_DROPS; i++) {
      const angle = hash01(i, 81) * Math.PI * 2;
      const distance = 70 * (1 - t) + 12;
      drop(
        g,
        pool.x + Math.cos(angle) * distance,
        pool.y + Math.sin(angle) * distance * 0.8,
        3 + 2 * hash01(i, 82),
        i % 3 ? PINK : LIGHT,
        clamp01(t * 2),
      );
    }
    // The gathering blob, its glow and a highlight.
    disc(glow, pool.x, pool.y, 24 * grow + 6, PINK, 0.35 + 0.25 * t);
    blob(g, pool.x, pool.y, 16 * grow, frame, PINK, 1);
    blob(g, pool.x - 3, pool.y - 4, 7 * grow, frame + 2, LIGHT, 0.9);
    g.fillStyle(WHITE, 0.9).fillRect(pool.x - 6, pool.y - 9 * grow, 4, 3);
    // Bubbles rising and a drip falling off the blob.
    for (let i = 0; i < 3; i++) {
      const p = (t * 1.8 + i / 3) % 1;
      const bx = pool.x + (hash01(i, 83) - 0.5) * 30;
      glow.lineStyle(2, LIGHT, 0.8 * (1 - p)).strokeCircle(bx, pool.y - 10 - p * 50, 3 + i);
    }
    const drip = (t * 2) % 1;
    drop(g, pool.x + dir * 4, pool.y + 14 * grow + drip * 40, 3, HOT, 1 - drip);
    f.emblem.show({ x: pool.x, y: pool.y - 42, scale: 0.8 * grow, alpha: clamp01(t * 1.5) });
    return;
  }

  if (phase === 'active') {
    const gush = easeOutCubic(clamp01(t * 1.7));
    const headX = lerp(hand.x, front.x, gush);
    const thickness = height * 0.62;
    stream(f, headX, thickness, frame, 1);
    // Wave crest at the head: a big blob with a curl of foam.
    blob(glow, headX, hand.y, thickness * 0.75, frame, PINK, 0.4);
    blob(g, headX, hand.y, thickness * 0.55, frame, PINK, 1);
    blob(g, headX + dir * 4, hand.y - thickness * 0.2, thickness * 0.28, frame + 3, LIGHT, 1);
    g.fillStyle(WHITE, 0.95).fillRect(headX + dir * 6 - 3, hand.y - thickness * 0.38, 6, 3);
    // Drops splashing off the stream.
    for (let i = 0; i < SPRAY_DROPS; i++) {
      const p = (t * 1.6 + i / SPRAY_DROPS) % 1;
      const along = lerp(hand.x, headX, hash01(i, 84));
      const rise = 26 * p - GRAVITY * 0.3 * p * p;
      drop(
        g,
        along + dir * p * 18,
        hand.y - thickness * 0.4 - rise,
        2.5,
        i % 2 ? LIGHT : HOT,
        1 - p,
      );
    }
    disc(glow, hand.x, hand.y, 18 + 6 * Math.sin(frame), PINK, 0.4);
    if (!f.impacting)
      f.emblem.show({
        x: headX,
        y: hand.y - thickness * 0.9,
        scale: 0.9 + 0.08 * Math.sin(frame),
        alpha: 1,
      });
    return;
  }

  // Recovery: the stream breaks into falling drops and a puddle spreads, then dries.
  const fade = 1 - t;
  const floor = f.fighter.position.y - 2;
  for (let i = 0; i < 12; i++) {
    const x = lerp(hand.x, front.x, (i + 0.5) / 12) + dir * hash01(i, 85) * 6;
    const fall = hand.y + GRAVITY * 1.4 * t * t * (0.7 + 0.6 * hash01(i, 86));
    if (fall < floor) drop(g, x, fall, 3 + 2 * hash01(i, 87), i % 2 ? PINK : HOT, fade);
  }
  const spread = easeOutCubic(t);
  const cx = lerp(hand.x, front.x, 0.6);
  const halfWidth = (30 + 70 * spread) * (0.4 + 0.6 * fade);
  glow.fillStyle(PINK, 0.3 * fade).fillRect(cx - halfWidth - 6, floor - 6, halfWidth * 2 + 12, 8);
  g.fillStyle(HOT, 0.85 * fade).fillRect(cx - halfWidth, floor - 4, halfWidth * 2, 5);
  g.fillStyle(LIGHT, 0.8 * fade).fillRect(cx - halfWidth * 0.5, floor - 4, halfWidth * 0.6, 2);
  if (!f.impacting)
    f.emblem.show({ x: front.x, y: front.y - 30 - t * 20, scale: 1 + 0.25 * t, alpha: fade });
}

function drawImpact(f: ImpactFrame): void {
  const { g, glow, x, y, t, blocked, direction: dir } = f;
  const out = easeOutCubic(t);
  const fade = 1 - t;
  const size = blocked ? 0.6 : 1;
  if (t < 0.14) disc(glow, x, y, 40 * size, WHITE, 0.9 * (1 - t / 0.14));
  blob(glow, x, y, (22 + 22 * out) * size, Math.floor(t * 30), PINK, 0.5 * fade);
  // Ripple rings.
  glow.lineStyle(5, PINK, 0.85 * fade).strokeCircle(x, y, (14 + 90 * out) * size);
  glow.lineStyle(2, LIGHT, 0.8 * fade).strokeCircle(x, y, (8 + 60 * out) * size);
  // Splash crown: drops thrown up and outward (mostly forward), falling back with gravity.
  const drops = blocked ? 7 : 16;
  for (let i = 0; i < drops; i++) {
    const spread = (hash01(i, 88) - 0.3) * Math.PI * 0.9;
    const speed = (70 + 80 * hash01(i, 89)) * size;
    const vx = Math.sin(spread) * speed * dir;
    const vy = -Math.cos(spread) * speed;
    const px = x + vx * t;
    const py = y + vy * t + GRAVITY * 1.6 * t * t * size;
    drop(
      g,
      px,
      py,
      (3 + 3 * hash01(i, 90)) * size * (1 - 0.3 * t),
      i % 3 ? PINK : i % 2 ? HOT : LIGHT,
      fade,
    );
  }
  if (blocked) return;
  const pop = t < 0.3 ? lerp(0.4, 1.35, easeOutBack(t / 0.3)) : 1.25;
  f.emblem.show({ x, y: y - 8, scale: pop, alpha: clamp01(fade * 2.2) });
}

export const FLUID_THEME: SpecialTheme = {
  impactMs: 620,
  drawMove,
  drawImpact,
};
