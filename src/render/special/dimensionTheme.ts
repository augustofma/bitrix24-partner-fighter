import { attackHits } from '../../core/fighter/attackFrames';
import type { ImpactFrame, MoveFrame, SpecialTheme } from './specialTheme';
import {
  clamp01,
  disc,
  easeOutBack,
  easeOutCubic,
  hash01,
  lerp,
  pixelBox,
  tickRing,
  type Graphics,
} from './vfxShapes';

/*
 * OUTRA DIMENSÃO: a rift in space opened in front of the fighter. Original drawing (no symbol,
 * armor or effect taken from any franchise): a pixel oval, stars and orbiting particles.
 *
 * Conjuring (startup): cosmic particles spiral into the outstretched hand, the view dims a
 * little, and in the last part a vertical crack tears open at the end of the reach.
 * Rift (active): the crack widens into an oval portal with a glowing electric-blue / purple /
 * cyan rim, a deep starfield inside, curved orbit lines and particles circling it. Pull: on the
 * first contact the rival is "sucked" toward it (streaks converging into the rift and a short
 * parallel-dimension wash of nebula and stars around it). Collapse: on the final contact the
 * rift implodes into a circular burst: white/cyan flash, a purple shockwave, shards and a few
 * gold sparks. Recovery: the rift closes into a thin line and fades; the view returns to normal.
 *
 * Everything is rectangles, discs and strokes (vfxShapes): nothing to load, nothing created at
 * the button press. Timing comes only from the move's frame data and its `hits` steps.
 */

const BLUE = 0x2f6bff;
const PURPLE = 0x8a3cff;
const DEEP = 0x14062e;
const CYAN = 0x34e8ff;
const WHITE = 0xffffff;
const GOLD = 0xffd75a;
const VOID = 0x05020f;
/** Where the conjuring hand is, from the feet (facing right). */
const HAND = { x: 48, y: -128 };
/** Rift size (half width / half height of the oval when fully open). */
const RIFT = { rx: 34, ry: 86 };
/** How dark the view gets while the rift is open (kept light: the fight stays readable). */
const DIM = 0.42;
const FALLBACK_HALF_VIEW = 480;
const VIEW_HEIGHT = 540;
const ORBITERS = 10;
const STARS = 22;

type Point = { x: number; y: number };

/** The camera's visible world rectangle (or a screen around `aroundX` without a camera). */
function viewOf(g: Graphics, aroundX: number) {
  const scene = (g as { scene?: { cameras?: { main?: { worldView?: object } } } }).scene;
  const view = scene?.cameras?.main?.worldView as
    { x: number; y: number; width: number; height: number } | undefined;
  if (view && typeof view.x === 'number' && view.width > 0) {
    return { left: view.x, top: view.y, width: view.width, height: view.height };
  }
  return {
    left: aroundX - FALLBACK_HALF_VIEW,
    top: 0,
    width: FALLBACK_HALF_VIEW * 2,
    height: VIEW_HEIGHT,
  };
}

function dimView(g: Graphics, aroundX: number, alpha: number): void {
  if (alpha <= 0) return;
  const view = viewOf(g, aroundX);
  g.fillStyle(DEEP, alpha).fillRect(view.left, view.top, view.width, view.height);
}

/** A pixel oval (rows of rectangles: no path triangulation) centered on c. */
function oval(g: Graphics, c: Point, rx: number, ry: number, color: number, alpha: number): void {
  if (rx < 2 || ry < 2 || alpha <= 0) return;
  const step = 4;
  g.fillStyle(color, alpha);
  for (let y = -ry; y < ry; y += step) {
    const k = (y + step / 2) / ry;
    const half = rx * Math.sqrt(Math.max(0, 1 - k * k));
    if (half >= 1) g.fillRect(c.x - half, c.y + y, half * 2, step);
  }
}

/** Twinkling pixel stars inside the oval (deterministic per index). */
function starfield(
  g: Graphics,
  c: Point,
  rx: number,
  ry: number,
  frame: number,
  alpha: number,
): void {
  for (let i = 0; i < STARS; i++) {
    const a = hash01(i, 3) * Math.PI * 2;
    const r = Math.sqrt(hash01(i, 4));
    // Stars drift toward the center: depth.
    const drift = (frame * 0.02 + hash01(i, 5)) % 1;
    const d = r * (1 - drift * 0.6);
    const x = c.x + Math.cos(a) * rx * 0.85 * d;
    const y = c.y + Math.sin(a) * ry * 0.85 * d;
    const size = i % 5 === 0 ? 3 : 2;
    const twinkle = (frame + i * 3) % 12 < 6 ? 1 : 0.55;
    const color = i % 7 === 0 ? GOLD : i % 2 ? WHITE : CYAN;
    g.fillStyle(color, alpha * twinkle).fillRect(x - size / 2, y - size / 2, size, size);
  }
}

/** The open rift: glowing rim, void, nebula, stars, orbit lines and circling particles. */
function rift(
  g: Graphics,
  glow: Graphics,
  c: Point,
  open: number,
  frame: number,
  alpha: number,
): void {
  if (open <= 0.02 || alpha <= 0) return;
  const rx = RIFT.rx * open;
  const ry = RIFT.ry * Math.min(1, open * 1.6);
  // Outer glow and rim (electric blue, purple, cyan), then the void with a purple nebula.
  disc(glow, c.x, c.y, ry * 0.9, PURPLE, 0.22 * alpha);
  oval(glow, c, rx + 14, ry + 14, BLUE, 0.35 * alpha);
  oval(g, c, rx + 6, ry + 6, CYAN, alpha);
  oval(g, c, rx + 3, ry + 3, PURPLE, alpha);
  oval(g, c, rx, ry, VOID, alpha);
  oval(g, { x: c.x - rx * 0.2, y: c.y - ry * 0.25 }, rx * 0.6, ry * 0.45, DEEP, alpha * 0.9);
  oval(g, { x: c.x + rx * 0.15, y: c.y + ry * 0.3 }, rx * 0.45, ry * 0.3, 0x2a0f5a, alpha * 0.8);
  starfield(g, c, rx, ry, frame, alpha);
  // Curved orbit lines around the rift (tilted ellipses as arcs of a circle, squashed by rows).
  const spin = frame * 0.12;
  tickRing(glow, c.x, c.y, ry * 0.75 + 12, 5, spin, 3, CYAN, 0.45 * alpha);
  tickRing(glow, c.x, c.y, ry * 0.55 + 10, 4, -spin * 1.3, 2, PURPLE, 0.55 * alpha);
  // Particles orbiting on a flattened ring.
  for (let i = 0; i < ORBITERS; i++) {
    const a = spin * (1 + (i % 3) * 0.3) + (i / ORBITERS) * Math.PI * 2;
    const x = c.x + Math.cos(a) * (rx + 26 + (i % 3) * 8);
    const y = c.y + Math.sin(a) * (ry * 0.9);
    const front = Math.sin(a) > 0;
    const s = front ? 4 : 3;
    pixelBox(
      g,
      x - s / 2,
      y - s / 2,
      s,
      s,
      i % 4 === 0 ? GOLD : i % 2 ? CYAN : WHITE,
      alpha * (front ? 1 : 0.6),
    );
  }
}

/** Where the rift opens: near the end of the move's reach, at body height. */
function riftCenter(f: MoveFrame): Point {
  const { fighter, direction: dir, attack } = f;
  const hits = attackHits(attack);
  const box = hits[hits.length - 1]!.hitbox;
  return {
    x: fighter.position.x + dir * (box.x + box.width * 0.72),
    y: fighter.position.y + box.y + box.height * 0.45,
  };
}

function drawMove(f: MoveFrame): void {
  const { g, glow, phase, t, frame, fighter, direction: dir, attack } = f;
  const hand = { x: fighter.position.x + dir * HAND.x, y: fighter.position.y + HAND.y };
  const c = riftCenter(f);

  if (phase === 'startup') {
    dimView(g, fighter.position.x, DIM * easeOutCubic(t));
    // Cosmic particles spiralling into the outstretched hand, a glow growing on it.
    disc(glow, hand.x, hand.y, 10 + 16 * t, BLUE, 0.3 + 0.25 * t);
    disc(glow, hand.x, hand.y, 5 + 7 * t, CYAN, 0.5);
    for (let i = 0; i < 12; i++) {
      const p = (t * 1.6 + hash01(i, 11)) % 1;
      const a = hash01(i, 12) * Math.PI * 2 + p * 3;
      const d = (1 - p) * (34 + hash01(i, 13) * 30);
      const s = i % 3 === 0 ? 3 : 2;
      g.fillStyle(i % 5 === 0 ? GOLD : i % 2 ? CYAN : PURPLE, clamp01(p * 2)).fillRect(
        hand.x + Math.cos(a) * d - s / 2,
        hand.y + Math.sin(a) * d - s / 2,
        s,
        s,
      );
    }
    // The space cracks open in front of him at the end of the startup.
    if (t > 0.55) {
      const crack = (t - 0.55) / 0.45;
      const h = RIFT.ry * 2 * easeOutCubic(crack);
      glow.fillStyle(CYAN, 0.6).fillRect(c.x - 3, c.y - h / 2, 6, h);
      g.fillStyle(WHITE, 1).fillRect(c.x - 1, c.y - h / 2, 2, h);
      for (let i = 0; i < 4; i++) {
        const y = c.y - h / 2 + (h * (i + 0.5)) / 4;
        const len = 6 + hash01(i, 21) * 10;
        g.lineStyle(2, PURPLE, 0.9).lineBetween(c.x, y, c.x + (i % 2 ? len : -len), y - 6);
      }
    }
    return;
  }

  if (phase === 'active') {
    dimView(g, fighter.position.x, DIM);
    const into = frame - attack.startupFrames;
    // Once the collapse has landed, its burst replaces the rift (no portal drawn over it).
    const steps = attack.hits ?? [];
    const collapseAt = steps[steps.length - 1]?.activeFrame ?? 0;
    if (into >= collapseAt && f.impacting) return;
    const open = easeOutBack(clamp01((into + 1) / 4));
    // A thin beam of energy from the hand feeding the rift.
    glow.lineStyle(6, PURPLE, 0.35).lineBetween(hand.x, hand.y, c.x, c.y);
    g.lineStyle(2, CYAN, 0.8).lineBetween(hand.x, hand.y, c.x, c.y);
    rift(g, glow, c, open, frame, 1);
    // Suction streaks converging into the rift.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + hash01(i, 31);
      const p = (into * 0.15 + hash01(i, 32)) % 1;
      const from = 120 * (1 - p) + 40;
      const to = from - 30;
      g.lineStyle(2, i % 2 ? CYAN : WHITE, 0.7 * (1 - p)).lineBetween(
        c.x + Math.cos(a) * from * 0.7,
        c.y + Math.sin(a) * from * 0.6,
        c.x + Math.cos(a) * to * 0.7,
        c.y + Math.sin(a) * to * 0.6,
      );
    }
    return;
  }

  // Recovery: the rift closes into a thin line and fades; the view returns to normal.
  const close = 1 - easeOutCubic(clamp01(t * 2.2));
  dimView(g, fighter.position.x, DIM * close);
  if (f.impacting) return;
  rift(g, glow, c, close * 0.9, frame, close);
}

/** First contact: the pull, with a short "parallel dimension" wash around the rival. */
function pullImpact(fr: ImpactFrame): void {
  const { g, glow, x, y, blocked, direction: dir } = fr;
  const t = clamp01(fr.t * 1.6);
  if (t >= 1) return;
  const fade = 1 - t;
  const size = blocked ? 0.55 : 1;
  // The other dimension bleeding in: nebula blobs and stars around the rival.
  if (!blocked) {
    disc(glow, x, y, 90 * size, PURPLE, 0.28 * fade);
    disc(glow, x + 30 * dir, y - 20, 50, BLUE, 0.25 * fade);
    for (let i = 0; i < 14; i++) {
      const a = hash01(i, 51) * Math.PI * 2;
      const d = 20 + hash01(i, 52) * 80;
      const s = i % 4 === 0 ? 3 : 2;
      g.fillStyle(i % 6 === 0 ? GOLD : i % 2 ? WHITE : CYAN, fade).fillRect(
        x + Math.cos(a) * d - s / 2,
        y + Math.sin(a) * d * 0.7 - s / 2,
        s,
        s,
      );
    }
    // Speed streaks: the rival dragged toward the rift (thin lines trailing behind).
    for (let i = 0; i < 7; i++) {
      const ly = y - 60 + i * 20 + hash01(i, 53) * 8;
      const len = (30 + hash01(i, 54) * 50) * (0.4 + 0.6 * t);
      const lx = x + dir * (16 + hash01(i, 55) * 20);
      g.lineStyle(2, i % 2 ? CYAN : WHITE, 0.7 * fade).lineBetween(lx, ly, lx + dir * len, ly);
    }
  }
  glow.lineStyle(4, CYAN, 0.8 * fade).strokeCircle(x, y, (12 + 40 * easeOutCubic(t)) * size);
}

/** Final contact: the rift collapses into a circular burst of cosmic energy. */
function collapseImpact(fr: ImpactFrame): void {
  const { g, glow, x, y, t, blocked, direction: dir } = fr;
  const fade = 1 - t;
  const size = blocked ? 0.5 : 1;
  const out = easeOutCubic(t);
  if (t < 0.2) {
    // The flash: concentric thick rings (round, unlike a large pixel disc), white at the core.
    const k = 1 - t / 0.2;
    for (let i = 0; i < 4; i++) {
      const r = (14 + i * 26) * size * (1 + t);
      glow
        .lineStyle(28 * size, i < 2 ? WHITE : CYAN, (i < 2 ? 0.9 : 0.5) * k)
        .strokeCircle(x, y, r);
    }
  }
  // The imploding rift (a shrinking oval) right at the start.
  if (t < 0.25) rift(g, glow, { x, y }, (1 - t / 0.25) * size, Math.floor(t * 60), 1 - t / 0.25);
  glow.lineStyle(14, PURPLE, 0.8 * fade).strokeCircle(x, y, (20 + 150 * out) * size);
  glow.lineStyle(6, BLUE, 0.85 * fade).strokeCircle(x, y, (14 + 100 * out) * size);
  glow.lineStyle(4, CYAN, 0.8 * fade).strokeCircle(x, y, (10 + 70 * out) * size);
  g.lineStyle(3, WHITE, 0.85 * fade).strokeCircle(x, y, (8 + 50 * out) * size);
  const count = blocked ? 8 : 20;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + hash01(i, 61) * 0.4;
    const d = (24 + 110 * hash01(i, 62)) * out * size;
    const s = 3 + (i % 3) * 2;
    const color = i % 6 === 0 ? GOLD : i % 3 === 0 ? WHITE : i % 2 ? CYAN : PURPLE;
    pixelBox(g, x + Math.cos(a) * d * dir - s / 2, y + Math.sin(a) * d - s / 2, s, s, color, fade);
  }
  if (blocked) return;
  // A brief dark cosmic wash with stars as the dimension closes.
  if (t < 0.45) {
    const k = 1 - t / 0.45;
    disc(g, x, y, 130 * lerp(0.6, 1, out), DEEP, 0.25 * k);
    starfield(g, { x, y }, 110, 90, Math.floor(t * 60), k);
  }
}

function drawImpact(fr: ImpactFrame): void {
  if (fr.hit < fr.hits - 1) pullImpact(fr);
  else collapseImpact(fr);
}

export const DIMENSION_THEME: SpecialTheme = {
  impactMs: 720,
  drawMove,
  drawImpact,
};
