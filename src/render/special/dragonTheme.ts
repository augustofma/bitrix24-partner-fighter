import { attackHits } from '../../core/fighter/attackFrames';
import type { EffectImage, ImpactFrame, MoveFrame, SpecialTheme } from './specialTheme';
import { clamp01, disc, easeOutCubic, hash01, pixelBox, type Graphics } from './vfxShapes';

/*
 * CÓLERA DOS 100 DRAGÕES: an avalanche of energy dragons, drawn with the user's dragon art
 * (public/vfx, prepared by scripts/vfx-art/hundred-dragons): `emblem` is the band of dragons
 * (the flood) and `glyph` the largest dragon with its pack (the lead and the final dragon).
 *
 * Concentration (startup): the view dims a little, gold and emerald energy spirals around the
 * fighter with three small dragons swimming in the flow, a ring of light and sparks on the
 * floor, the cocked fist charging. Release (active): the lead dragon bursts out of the fist and
 * opens the way (first hit); then copies of the band of dragons pour forward at several depths
 * (near ones larger and opaque, far ones smaller, fainter and lower or higher), with a glow
 * copy on the nearest, for the waves (the small hits); the final dragon, much larger, crosses
 * the rival (the main hit) under a gold flash. A handful of pooled images, each holding many
 * dragons, reads as a hundred; particles and specks are redrawn in the pooled Graphics.
 *
 * Timing comes only from the move's frame data and its `hits` steps (the final step is the
 * last one), so it freezes in hitstop and vanishes the moment the move ends.
 */

const GOLD = 0xffc83a;
const YELLOW = 0xfff05a;
const EMERALD = 0x1fd68a;
const CYAN = 0x3ff0ff;
const WHITE = 0xffffff;
const NAVY = 0x0b1640;

/** How dark the view gets (kept light: the fight stays readable). */
const DIM = 0.32;
const FALLBACK_HALF_VIEW = 480;
const VIEW_HEIGHT = 540;
/** Where the cocked fist is in the concentration pose, from the feet (facing right). */
const FIST = { x: 18, y: -122 };
/** Dragons start from just in front of the fighter. */
const ORIGIN_X = 30;
/** The hero image (dragon-hero.png, 410x162): where its big head is, from the image center. */
const HERO_HEAD = { x: 135, y: -16 };
/** Width of the band image (dragon-flood.png). */
const FLOOD_WIDTH = 1220;
const LEAD = { scale: 0.62, speed: 34 };
const FINAL = { scale: 1.55, runUp: 5 };
/**
 * Copies of the band of dragons, far first: scale, height from the lane, speed (px/frame),
 * delay (frames after the release), alpha and an optional tint (far ones cooler).
 */
const FLOOD_LAYERS = [
  { scale: 0.42, dy: -78, speed: 30, delay: 1, alpha: 0.5, tint: 0x9ff0ff },
  { scale: 0.48, dy: 64, speed: 32, delay: 3, alpha: 0.55, tint: 0x9ff0ff },
  { scale: 0.6, dy: -40, speed: 36, delay: 0, alpha: 0.8 },
  { scale: 0.66, dy: 34, speed: 38, delay: 4, alpha: 0.85 },
  { scale: 0.8, dy: -6, speed: 42, delay: 6, alpha: 1 },
] as const;
const SPECKS = 18;

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

/** Deep-blue dim over the stage, a little darker on the sides (a vignette): two fills only. */
function dimView(g: Graphics, aroundX: number, alpha: number): void {
  if (alpha <= 0) return;
  const v = viewOf(g, aroundX);
  const side = v.width * 0.12;
  g.fillStyle(NAVY, alpha).fillRect(v.left + side, v.top, v.width - side * 2, v.height);
  g.fillStyle(NAVY, Math.min(1, alpha * 1.6));
  g.fillRect(v.left, v.top, side, v.height);
  g.fillRect(v.left + v.width - side, v.top, side, v.height);
}

/** Gold and emerald motes rising around the fighter. */
function risingMotes(g: Graphics, base: Point, frame: number, alpha: number): void {
  for (let i = 0; i < 10; i++) {
    const p = (frame * 0.04 + hash01(i, 71)) % 1;
    const x = base.x + (hash01(i, 72) - 0.5) * 150;
    const y = base.y - p * 190;
    const s = i % 3 === 0 ? 4 : 3;
    g.fillStyle(i % 2 ? GOLD : EMERALD, alpha * (1 - p)).fillRect(x - s / 2, y - s / 2, s, s);
  }
}

/** The band of dragons: a copy sliding forward, its front (the heads) leaving the fist. */
function floodCopy(
  image: EffectImage,
  origin: Point,
  dir: 1 | -1,
  age: number,
  layer: (typeof FLOOD_LAYERS)[number],
  alpha: number,
): void {
  const width = FLOOD_WIDTH * layer.scale;
  const front = origin.x + dir * (age * layer.speed + 60);
  image.show({
    x: front - (dir * width) / 2,
    y: origin.y + layer.dy,
    scale: layer.scale,
    alpha,
    flipX: dir < 0,
    tint: 'tint' in layer ? layer.tint : undefined,
  });
}

/** The hero dragon placed by its head (crisp, plus a glow copy when `glow` > 0). */
function heroAt(
  image: EffectImage,
  head: Point,
  dir: 1 | -1,
  scale: number,
  alpha: number,
  glow: number,
): void {
  const x = head.x - dir * HERO_HEAD.x * scale;
  const y = head.y - HERO_HEAD.y * scale;
  if (glow > 0) {
    image.show({ x, y, scale: scale * 1.06, alpha: alpha * glow, flipX: dir < 0, glow: true });
  }
  image.show({ x, y, scale, alpha, flipX: dir < 0 });
}

function drawStartup(f: MoveFrame, origin: Point): void {
  const { g, glow, t, frame, fighter, direction: dir } = f;
  const center = { x: fighter.position.x, y: fighter.position.y - 100 };
  dimView(g, fighter.position.x, DIM * easeOutCubic(t));
  // A ring of light on the floor, and the energy spiral around him.
  for (let i = 0; i < 3; i++) {
    const w = (70 + i * 30) * (0.6 + 0.4 * t);
    glow.fillStyle(i === 0 ? YELLOW : EMERALD, (0.5 - i * 0.14) * t);
    glow.fillRect(fighter.position.x - w, fighter.position.y - 3 - i * 2, w * 2, 4);
  }
  for (let i = 0; i < 16; i++) {
    const a = frame * 0.25 + (i / 16) * Math.PI * 2;
    const r = 1 - t * 0.35;
    const x = center.x + Math.cos(a) * 70 * r;
    const y = center.y + Math.sin(a) * 95 * r;
    const s = i % 4 === 0 ? 5 : 3;
    pixelBox(g, x - s / 2, y - s / 2, s, s, i % 3 ? GOLD : EMERALD, 0.5 + 0.5 * t);
  }
  // Small dragons swimming in the flow around him.
  for (let j = 0; j < 3; j++) {
    const a = frame * 0.18 + j * 2.1;
    f.glyph.show({
      x: center.x + Math.cos(a) * 95,
      y: center.y - 10 + Math.sin(a) * 60,
      scale: 0.2 + 0.05 * t,
      alpha: clamp01(t * 2) * 0.9,
      flipX: Math.sin(a) > 0,
    });
  }
  // Sparks flashing on the ground, and the charging fist.
  for (let i = 0; i < 6; i++) {
    if ((frame + i * 2) % 5 > 1) continue;
    const x = fighter.position.x + (hash01(i, frame) - 0.5) * 160;
    glow.fillStyle(i % 2 ? YELLOW : CYAN, 0.8).fillRect(x - 8, fighter.position.y - 2, 16, 3);
  }
  const fist = { x: fighter.position.x + dir * FIST.x, y: fighter.position.y + FIST.y };
  disc(glow, fist.x, fist.y, 6 + 10 * t, GOLD, 0.45 + 0.3 * t);
  disc(glow, fist.x, fist.y, 3 + 4 * t, WHITE, 0.8);
  risingMotes(g, { x: fighter.position.x, y: fighter.position.y }, frame, t);
  if (t > 0.7) disc(glow, origin.x, origin.y, 14 + 30 * (t - 0.7), YELLOW, 0.5);
}

function drawMove(f: MoveFrame): void {
  const { g, glow, phase, t, frame, fighter, direction: dir, attack } = f;
  const steps = attackHits(attack);
  const finalAt = attack.hits?.[attack.hits.length - 1]?.activeFrame ?? 0;
  const finalBox = steps[steps.length - 1]!.hitbox;
  const laneY = fighter.position.y + finalBox.y + finalBox.height / 2;
  const origin = { x: fighter.position.x + dir * ORIGIN_X, y: laneY };
  if (phase === 'startup') {
    drawStartup(f, origin);
    return;
  }
  const into = frame - attack.startupFrames;
  const fade = phase === 'recovery' ? 1 - easeOutCubic(clamp01(t * 2.5)) : 1;
  dimView(g, fighter.position.x, DIM * fade);
  risingMotes(g, { x: fighter.position.x, y: fighter.position.y }, frame, fade);
  if (into >= finalAt - 1 && into <= finalAt + 3) {
    const v = viewOf(g, fighter.position.x);
    glow.fillStyle(GOLD, 0.12).fillRect(v.left, v.top, v.width, v.height);
  }

  // Far specks streaming forward under the dragons: depth.
  for (let i = 0; i < SPECKS; i++) {
    if (into > finalAt + 2) break;
    const run = (into * 22 + hash01(i, 81) * 520) % 520;
    const x = origin.x + dir * run;
    const y = laneY + (hash01(i, 82) - 0.5) * 210;
    const s = 3 + (i % 3);
    pixelBox(g, x - s / 2, y - s / 2, s, s, i % 3 ? CYAN : GOLD, 0.7 * clamp01(run / 60) * fade);
  }

  // The flood: copies of the band of dragons pouring forward, far ones first.
  for (const layer of FLOOD_LAYERS) {
    const age = into - layer.delay;
    if (age < 0) continue;
    // The waves thin out just before the final dragon, so it stands alone on the main hit.
    const out = clamp01((finalAt - 1 - into) / 3);
    const alpha = layer.alpha * clamp01(age / 2 + 0.3) * out * fade;
    if (alpha <= 0.02) continue;
    floodCopy(f.emblem, origin, dir, age, layer, alpha);
  }

  // The lead dragon: bursts out first and opens the way (first hit at into 0).
  const leadAge = into + 3;
  if (leadAge <= 9) {
    const head = { x: origin.x + dir * (leadAge * LEAD.speed + 10), y: laneY - 8 };
    heroAt(f.glyph, head, dir, LEAD.scale, clamp01((9 - leadAge) / 3) * fade, 0.5);
  }

  // The final dragon: much larger, its head crosses the rival on the final hit.
  const finalAge = into - (finalAt - FINAL.runUp);
  if (finalAge >= 0 && finalAge <= FINAL.runUp + 10) {
    const target = fighter.position.x + dir * (finalBox.x + finalBox.width / 2);
    const speed = (Math.abs(target - origin.x) + 30) / FINAL.runUp;
    const head = { x: origin.x - dir * 30 + dir * finalAge * speed, y: laneY - 10 };
    const alpha = clamp01((FINAL.runUp + 10 - finalAge) / 4) * (phase === 'recovery' ? fade : 1);
    disc(glow, head.x, head.y, 80, GOLD, 0.3 * alpha);
    heroAt(f.glyph, head, dir, FINAL.scale, alpha, 0.55);
  }
}

/** A dragon of the flood bites: jaws snapping shut, an emerald ring and gold sparks. */
function biteImpact(fr: ImpactFrame): void {
  const { g, glow, x, y, blocked, direction: dir } = fr;
  const t = clamp01(fr.t * 2);
  if (t >= 1) return;
  const fade = 1 - t;
  const size = blocked ? 0.55 : 1;
  const snap = (1 - easeOutCubic(t * 2)) * 18 * size;
  glow.fillStyle(YELLOW, 0.8 * fade);
  glow.fillRect(x - 22 * size, y - snap - 6, 44 * size, 5);
  glow.fillRect(x - 22 * size, y + snap + 1, 44 * size, 5);
  glow.lineStyle(5, EMERALD, 0.8 * fade).strokeCircle(x, y, (10 + 34 * easeOutCubic(t)) * size);
  const count = blocked ? 4 : 8;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + hash01(i, 101);
    const d = (14 + 46 * easeOutCubic(t)) * size;
    const s = i % 2 ? 4 : 3;
    pixelBox(g, x + Math.cos(a) * d * dir - s / 2, y + Math.sin(a) * d - s / 2, s, s, GOLD, fade);
  }
}

/** The final dragon hits: white-gold flash, rays, shockwaves and an explosion of particles. */
function finalImpact(fr: ImpactFrame): void {
  const { g, glow, x, y, t, blocked, direction: dir } = fr;
  const fade = 1 - t;
  const size = (blocked ? 0.5 : 1) * (fr.ko ? 1.3 : 1);
  const out = easeOutCubic(t);
  if (t < 0.22) {
    const k = 1 - t / 0.22;
    for (let i = 0; i < 4; i++) {
      glow
        .lineStyle(30 * size, i < 2 ? WHITE : GOLD, (i < 2 ? 0.9 : 0.6) * k)
        .strokeCircle(x, y, (14 + i * 28) * size * (1 + t));
    }
  }
  // Rays of light bursting out.
  const rays = blocked ? 6 : fr.ko ? 16 : 12;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + 0.2;
    const r0 = 30 * size;
    const r1 = (60 + 170 * out) * size;
    glow
      .lineStyle(i % 2 ? 4 : 7, i % 3 ? GOLD : WHITE, 0.7 * fade)
      .lineBetween(
        x + Math.cos(a) * r0,
        y + Math.sin(a) * r0,
        x + Math.cos(a) * r1,
        y + Math.sin(a) * r1,
      );
  }
  glow.lineStyle(14, EMERALD, 0.75 * fade).strokeCircle(x, y, (24 + 160 * out) * size);
  glow.lineStyle(6, GOLD, 0.85 * fade).strokeCircle(x, y, (16 + 110 * out) * size);
  g.lineStyle(3, WHITE, 0.85 * fade).strokeCircle(x, y, (10 + 64 * out) * size);
  const count = blocked ? 10 : fr.ko ? 34 : 26;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + hash01(i, 111) * 0.5;
    const d = (26 + 140 * hash01(i, 112)) * out * size;
    const s = 3 + (i % 3) * 2;
    const color = i % 5 === 0 ? WHITE : i % 3 === 0 ? CYAN : i % 2 ? GOLD : EMERALD;
    pixelBox(g, x + Math.cos(a) * d * dir - s / 2, y + Math.sin(a) * d - s / 2, s, s, color, fade);
  }
}

function drawImpact(fr: ImpactFrame): void {
  if (fr.hit < fr.hits - 1) biteImpact(fr);
  else finalImpact(fr);
}

export const DRAGON_THEME: SpecialTheme = {
  impactMs: 760,
  drawMove,
  drawImpact,
};
