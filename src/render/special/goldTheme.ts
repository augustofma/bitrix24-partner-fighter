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
  type Graphics,
} from './vfxShapes';

/*
 * GOLD PARTNER!: partner tiers leveling up (Juliana). Original drawing: medals, a laurel, stars,
 * light pillars and glitter; no real program badge or logo.
 *
 * Powering up (startup): golden sparkles spiral up around her into the raised hand, a gold ring
 * of light grows on the floor and a soft gold glow rises behind her. Leveling up (active): a
 * pillar of light bursts from the floor in front of her and a medal rises in it for each tier,
 * synced to `hits`: BRONZE, then SILVER (bigger), then GOLD (the largest: a laurel around it, a
 * star on its face, ribbons, rays turning behind it and a shower of glitter). Impacts: a ring of
 * tier-colored sparks for bronze and silver; for gold, a white-gold flash, a starburst of rays,
 * shockwaves and confetti. On block, smaller.
 *
 * Everything is rectangles, discs (pixel octagons), strokes and a few triangles (the stars):
 * nothing to load, nothing created at the button press. Timing comes from the frame data and
 * the `hits` steps only.
 */

const GOLD = 0xffd24a;
const GOLD_DEEP = 0xc8901a;
const GOLD_LIGHT = 0xfff3b0;
const SILVER = 0xd9e2ee;
const SILVER_DEEP = 0x8b98ad;
const BRONZE = 0xd98a4a;
const BRONZE_DEEP = 0x8a4d22;
const WHITE = 0xffffff;
const INK = 0x2a1606;
const RIBBON = 0xd8323c;
const RIBBON_DEEP = 0x8e1c25;
/** Raised hand in the hand-on-hip pose, from the feet (facing right). */
const HAND = { x: 14, y: -168 };

type Point = { x: number; y: number };
type Tier = { face: number; deep: number; radius: number };

const TIERS: readonly Tier[] = [
  { face: BRONZE, deep: BRONZE_DEEP, radius: 30 },
  { face: SILVER, deep: SILVER_DEEP, radius: 38 },
  { face: GOLD, deep: GOLD_DEEP, radius: 52 },
];

/** A round pixel-art disc: rows of rectangles (no path triangulation), 3 px tall. */
function roundDisc(g: Graphics, c: Point, r: number, color: number, alpha: number): void {
  if (r < 2 || alpha <= 0) return;
  const step = 3;
  g.fillStyle(color, alpha);
  for (let y = -r; y < r; y += step) {
    const k = (y + step / 2) / r;
    const half = r * Math.sqrt(Math.max(0, 1 - k * k));
    if (half >= 1) g.fillRect(c.x - half, c.y + y, half * 2, step);
  }
}

/** A five-point star (five triangles from the center), facing up. */
function star(g: Graphics, c: Point, r: number, color: number, alpha: number, spin = 0): void {
  if (r < 2 || alpha <= 0) return;
  g.fillStyle(color, alpha);
  for (let i = 0; i < 5; i++) {
    const a = spin - Math.PI / 2 + (i / 5) * Math.PI * 2;
    const b1 = a - Math.PI / 5;
    const b2 = a + Math.PI / 5;
    g.fillTriangle(
      c.x + Math.cos(a) * r,
      c.y + Math.sin(a) * r,
      c.x + Math.cos(b1) * r * 0.42,
      c.y + Math.sin(b1) * r * 0.42,
      c.x + Math.cos(b2) * r * 0.42,
      c.y + Math.sin(b2) * r * 0.42,
    );
  }
  disc(g, c.x, c.y, r * 0.45, color, alpha);
}

/** A four-point twinkle (a glitter sparkle). */
function twinkle(g: Graphics, c: Point, r: number, color: number, alpha: number): void {
  if (r < 1 || alpha <= 0) return;
  g.fillStyle(color, alpha);
  g.fillRect(c.x - r, c.y - 1, r * 2, 2);
  g.fillRect(c.x - 1, c.y - r, 2, r * 2);
  g.fillRect(c.x - r * 0.35, c.y - r * 0.35, r * 0.7, r * 0.7);
}

/** A medal: ribbons, a dark rim, the face, a bevel and a star; gold gets a laurel. */
function medal(
  g: Graphics,
  glow: Graphics,
  c: Point,
  tier: Tier,
  scale: number,
  gold: boolean,
  a: number,
): void {
  const r = tier.radius * scale;
  if (r < 4 || a <= 0) return;
  // Ribbons hanging behind (two tails in a V).
  g.fillStyle(RIBBON_DEEP, a).fillTriangle(
    c.x - r * 0.7,
    c.y,
    c.x - r * 0.1,
    c.y,
    c.x - r * 0.55,
    c.y + r * 1.6,
  );
  g.fillStyle(RIBBON, a).fillTriangle(
    c.x + r * 0.7,
    c.y,
    c.x + r * 0.1,
    c.y,
    c.x + r * 0.55,
    c.y + r * 1.6,
  );
  roundDisc(glow, c, r * 1.5, tier.face, 0.25 * a);
  roundDisc(g, c, r + 4, INK, a);
  roundDisc(g, c, r, tier.deep, a);
  roundDisc(g, c, r * 0.84, tier.face, a);
  // Bevel highlight (upper left) and the star on its face.
  roundDisc(g, { x: c.x - r * 0.32, y: c.y - r * 0.32 }, r * 0.2, WHITE, 0.6 * a);
  star(g, c, r * 0.5, tier.deep, a);
  star(g, c, r * 0.4, gold ? GOLD_LIGHT : WHITE, 0.9 * a);
  if (!gold) return;
  // Laurel: leaves along both sides of a ring around the medal.
  for (let i = 0; i < 9; i++) {
    for (const side of [-1, 1]) {
      const ang = Math.PI / 2 + side * (0.45 + i * 0.27);
      const lx = c.x + Math.cos(ang) * (r + 12);
      const ly = c.y + Math.sin(ang) * (r + 12);
      pixelBox(g, lx - 5, ly - 3, 10, 6, INK, a);
      pixelBox(g, lx - 4, ly - 2, 8, 4, i % 2 ? GOLD : GOLD_DEEP, a);
    }
  }
}

/** The pillar of light rising from the floor in front of her. */
function pillar(
  glow: Graphics,
  g: Graphics,
  base: Point,
  height: number,
  width: number,
  a: number,
): void {
  if (height <= 2 || a <= 0) return;
  for (let i = 0; i < 3; i++) {
    const w = width * (1 - i * 0.3);
    glow.fillStyle(i === 2 ? WHITE : GOLD, (0.22 + i * 0.12) * a);
    glow.fillRect(base.x - w / 2, base.y - height, w, height);
  }
  // Bright core streaks and a ring of light on the floor.
  g.fillStyle(GOLD_LIGHT, 0.6 * a).fillRect(base.x - 3, base.y - height, 6, height);
  glow.fillStyle(GOLD, 0.5 * a).fillRect(base.x - width, base.y - 4, width * 2, 6);
}

/** Rays turning behind a point (the gold medal's glory). */
function rays(glow: Graphics, c: Point, r: number, spin: number, a: number): void {
  for (let i = 0; i < 12; i++) {
    const ang = spin + (i / 12) * Math.PI * 2;
    glow
      .lineStyle(i % 2 ? 6 : 10, i % 2 ? GOLD_LIGHT : GOLD, 0.35 * a)
      .lineBetween(
        c.x + Math.cos(ang) * r * 0.6,
        c.y + Math.sin(ang) * r * 0.6,
        c.x + Math.cos(ang) * r * 1.8,
        c.y + Math.sin(ang) * r * 1.8,
      );
  }
}

function drawMove(f: MoveFrame): void {
  const { g, glow, phase, t, frame, fighter, direction: dir, attack } = f;
  const box = attackHits(attack)[0]!.hitbox;
  const base = { x: fighter.position.x + dir * (box.x + box.width * 0.5), y: fighter.position.y };
  const hand = { x: fighter.position.x + dir * HAND.x, y: fighter.position.y + HAND.y };

  if (phase === 'startup') {
    // Streaks of gold light rising behind her, a ring of light on the floor, sparkles spiraling up.
    for (let i = 0; i < 6; i++) {
      const p = (t * 1.2 + hash01(i, 7)) % 1;
      const x = fighter.position.x + (hash01(i, 8) - 0.5) * 90;
      const h = 40 + 60 * hash01(i, 9);
      const y = fighter.position.y - 20 - p * 180;
      glow.fillStyle(i % 2 ? GOLD : GOLD_LIGHT, 0.5 * t * (1 - p)).fillRect(x - 2, y - h, 4, h);
    }
    for (let i = 0; i < 3; i++) {
      const w = (60 + i * 26) * easeOutCubic(t);
      glow.fillStyle(i === 0 ? GOLD_LIGHT : GOLD, (0.55 - i * 0.15) * t);
      glow.fillRect(fighter.position.x - w, fighter.position.y - 3 - i * 2, w * 2, 4);
    }
    for (let i = 0; i < 14; i++) {
      const p = (t * 1.4 + hash01(i, 3)) % 1;
      const a = p * Math.PI * 3 + i;
      const r = 70 * (1 - p);
      const at = {
        x: lerp(fighter.position.x + Math.cos(a) * r, hand.x, p * p),
        y: lerp(fighter.position.y - 10, hand.y, p) + Math.sin(a) * 10,
      };
      twinkle(g, at, i % 3 === 0 ? 6 : 4, i % 2 ? GOLD : GOLD_LIGHT, clamp01(p * 2));
    }
    // The power gathering in the raised hand: a small star turning.
    roundDisc(glow, hand, 10 + 12 * t, GOLD, 0.5);
    star(g, hand, 8 + 6 * t, GOLD_LIGHT, clamp01(t * 2), frame * 0.2);
    return;
  }

  const into = frame - attack.startupFrames;
  const steps = attack.hits ?? [];
  const fade = phase === 'recovery' ? 1 - easeOutCubic(clamp01(t * 2.2)) : 1;
  if (fade <= 0) return;
  // Which tier is up: the latest step that has started.
  let tierIndex = 0;
  steps.forEach((step, i) => {
    if (into >= step.activeFrame) tierIndex = i;
  });
  const tier = TIERS[Math.min(tierIndex, TIERS.length - 1)]!;
  const gold = tierIndex >= TIERS.length - 1;
  const since = into - (steps[tierIndex]?.activeFrame ?? 0);
  const rise = easeOutBack(clamp01((since + 1) / 4));

  // The pillar: shoots up on each tier, widest on gold.
  const pillarHeight = lerp(140, 300, clamp01((since + 1) / 3)) * (gold ? 1.1 : 0.85);
  pillar(glow, g, base, pillarHeight, gold ? 84 : 56, fade);
  // The medal rides up the pillar and stops above the rival's head.
  const c = { x: base.x, y: base.y - lerp(40, 170, rise) };
  if (gold) rays(glow, c, tier.radius, frame * 0.05, fade);
  medal(g, glow, c, tier, lerp(0.4, 1, rise), gold, fade);
  // The previous tiers' medals fading away, smaller, beside it (the climb).
  for (let i = 0; i < tierIndex; i++) {
    const old = TIERS[i]!;
    const side = i === 0 ? -1 : 1;
    const at = { x: c.x + side * 70, y: c.y + 40 - since * 2 };
    medal(g, glow, at, old, 0.55, false, fade * clamp01(1 - since / 8));
  }
  // Glitter shower falling around the pillar.
  const glitter = gold ? 18 : 8;
  for (let i = 0; i < glitter; i++) {
    const p = (into * 0.07 + hash01(i, 11)) % 1;
    const at = { x: base.x + (hash01(i, 12) - 0.5) * 180, y: base.y - 300 + p * 300 };
    twinkle(g, at, i % 4 === 0 ? 6 : 3, i % 3 ? GOLD_LIGHT : tier.face, fade * (1 - p));
  }
  // The thrown hand still glowing.
  roundDisc(
    glow,
    { x: fighter.position.x + dir * 70, y: fighter.position.y - 150 },
    14,
    GOLD,
    0.45 * fade,
  );
}

/** Bronze / silver tier lands: a ring of tier-colored sparks. */
function tierImpact(fr: ImpactFrame): void {
  const { g, glow, x, y, blocked, hit } = fr;
  const t = clamp01(fr.t * 2);
  if (t >= 1) return;
  const fade = 1 - t;
  const size = blocked ? 0.55 : 1;
  const tier = TIERS[Math.min(hit, TIERS.length - 1)]!;
  glow.lineStyle(8, tier.face, 0.8 * fade).strokeCircle(x, y, (12 + 50 * easeOutCubic(t)) * size);
  for (let i = 0; i < (blocked ? 5 : 10); i++) {
    const a = (i / 10) * Math.PI * 2 + hash01(i, 21);
    const d = (14 + 56 * easeOutCubic(t)) * size;
    twinkle(
      g,
      { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d },
      5,
      i % 2 ? WHITE : tier.face,
      fade,
    );
  }
}

/** GOLD lands: white-gold flash, a starburst of rays, shockwaves, a big star and confetti. */
function goldImpact(fr: ImpactFrame): void {
  const { g, glow, x, y, t, blocked, direction: dir } = fr;
  const fade = 1 - t;
  const size = (blocked ? 0.5 : 1) * (fr.ko ? 1.25 : 1);
  const out = easeOutCubic(t);
  if (t < 0.2) {
    const k = 1 - t / 0.2;
    for (let i = 0; i < 3; i++) {
      glow
        .lineStyle(
          28 * size,
          i === 0 ? WHITE : i === 1 ? GOLD_LIGHT : GOLD,
          (i === 0 ? 0.95 : 0.6) * k,
        )
        .strokeCircle(x, y, (14 + i * 26) * size);
    }
  }
  const rayCount = blocked ? 8 : 16;
  for (let i = 0; i < rayCount; i++) {
    const a = (i / rayCount) * Math.PI * 2;
    const r0 = 24 * size;
    const r1 = (70 + 190 * out) * size;
    glow
      .lineStyle(i % 2 ? 5 : 9, i % 2 ? GOLD_LIGHT : GOLD, 0.7 * fade)
      .lineBetween(
        x + Math.cos(a) * r0,
        y + Math.sin(a) * r0,
        x + Math.cos(a) * r1,
        y + Math.sin(a) * r1,
      );
  }
  glow.lineStyle(12, GOLD, 0.8 * fade).strokeCircle(x, y, (24 + 150 * out) * size);
  g.lineStyle(4, WHITE, 0.85 * fade).strokeCircle(x, y, (14 + 90 * out) * size);
  star(g, { x, y }, (30 + 26 * out) * size, GOLD_LIGHT, fade, out * 1.5);
  if (blocked) return;
  for (let i = 0; i < 24; i++) {
    const a = hash01(i, 31) * Math.PI * 2;
    const d = (30 + 150 * hash01(i, 32)) * out;
    const color = i % 4 === 0 ? RIBBON : i % 4 === 1 ? WHITE : i % 4 === 2 ? GOLD : SILVER;
    pixelBox(
      g,
      x + Math.cos(a) * d * dir - 3,
      y + Math.sin(a) * d - 2 + 70 * t * t,
      7,
      4,
      color,
      fade,
    );
  }
}

function drawImpact(fr: ImpactFrame): void {
  if (fr.hit < fr.hits - 1) tierImpact(fr);
  else goldImpact(fr);
}

export const GOLD_THEME: SpecialTheme = {
  impactMs: 720,
  drawMove,
  drawImpact,
};
