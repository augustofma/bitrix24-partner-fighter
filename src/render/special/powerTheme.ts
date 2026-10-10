import { attackHits } from '../../core/fighter/attackFrames';
import type { AttackConfig } from '../../types/fighter';
import type { ImpactFrame, MoveFrame, SpecialTheme } from './specialTheme';
import {
  chatBubble,
  clamp01,
  disc,
  easeOutBack,
  easeOutCubic,
  hash01,
  lerp,
  pixelBox,
  tickRing,
  waveArc,
  type Graphics,
} from './vfxShapes';

/*
 * POWER COMBO: two apps in sequence, one special. It follows the move's `hits` timeline: every
 * step but the last is a messaging hit, the last is the AI finisher.
 *
 * POWERZAP (messaging hits): while she charges, a green chat bubble with typing dots forms at
 * her hand and "send" waves pulse out; each hit then fires a chat bubble with a cyan trail and
 * a burst of digital packets racing to the end of that hit's reach. Impact: a small
 * message-sent pop (green ring, bubble bits, a read receipt flash).
 *
 * POWERBOT (finisher): just before it opens, an analysis reticle locks on at the end of the
 * reach, a network of nodes links up around it and a small bot hologram appears above it,
 * scanning. Impact: a digital explosion in electric blue, purple and white with a short white
 * flash, glitch bars and pixel shards.
 *
 * Original drawing (no app logo): bubbles, packets, nodes and a generic bot face only.
 */

const ZAP_GREEN = 0x2fe08a;
const ZAP_CYAN = 0x2fe0ff;
const BOT_BLUE = 0x2f6bff;
const BOT_PURPLE = 0x9b5cff;
const WHITE = 0xffffff;
const INK = 0x0b0820;
/** Frames a messaging hit's bubble takes to fly from the hand to the end of its reach. */
const ZAP_FLIGHT = 6;
/** Frames before the finisher opens when the scan starts locking on. */
const SCAN_LEAD = 5;
const NETWORK_NODES = 6;

type Point = { x: number; y: number };

/** Where a step's energy leaves and lands (front of that step's hitbox, mid height). */
function stepSpan(f: MoveFrame, hit: AttackConfig): { from: Point; to: Point } {
  const { fighter, direction: dir } = f;
  const { hitbox } = hit;
  const y = fighter.position.y + hitbox.y + hitbox.height / 2;
  return {
    from: { x: fighter.position.x + dir * hitbox.x, y },
    to: { x: fighter.position.x + dir * (hitbox.x + hitbox.width * 0.85), y },
  };
}

/** Frames into the active window at which each step opens (0 for a single-hit move). */
function stepStarts(attack: AttackConfig): number[] {
  return attack.hits?.map((step) => step.activeFrame) ?? [0];
}

/** A messaging hit in flight: the bubble, its trail and packets around it. */
function zapShot(f: MoveFrame, from: Point, to: Point, progress: number, seed: number): void {
  const { g, glow, direction: dir } = f;
  const p = easeOutCubic(progress);
  const x = lerp(from.x, to.x, p);
  const y = from.y - 6 + Math.sin(progress * Math.PI) * -10;
  const fade = progress < 1 ? 1 : 0;
  if (!fade) return;
  // Trail: a fading streak of pixel blocks behind the bubble.
  for (let i = 1; i <= 6; i++) {
    const tx = x - dir * i * 14;
    if ((tx - from.x) * dir < 0) break;
    const a = 0.75 * (1 - i / 7);
    pixelBox(g, tx - 5, y - 2 + (i % 2) * 3, 10, 4, i % 2 ? ZAP_CYAN : ZAP_GREEN, a);
  }
  disc(glow, x, y, 22, ZAP_GREEN, 0.5);
  chatBubble(g, x, y, 30, 18, {
    fill: ZAP_GREEN,
    alpha: 1,
    tail: dir > 0 ? -1 : 1,
    content: 'lines',
  });
  // Packets flying with it.
  for (let i = 0; i < 4; i++) {
    const off = (hash01(i, seed) - 0.5) * 34;
    const lag = 10 + hash01(i, seed + 1) * 26;
    pixelBox(g, x - dir * lag - 2, y + off - 2, 5, 5, i % 2 ? WHITE : ZAP_CYAN, 0.9);
  }
}

/** The small bot hologram: a rounded head with two eyes and an antenna. */
function botHead(
  g: Graphics,
  glow: Graphics,
  x: number,
  y: number,
  size: number,
  alpha: number,
  blink: boolean,
): void {
  if (size < 6 || alpha <= 0) return;
  disc(glow, x, y, size * 1.1, BOT_BLUE, 0.35 * alpha);
  pixelBox(g, x - size / 2 - 2, y - size / 2 - 2, size + 4, size * 0.8 + 4, BOT_PURPLE, alpha);
  pixelBox(g, x - size / 2, y - size / 2, size, size * 0.8, INK, alpha);
  const eye = Math.max(3, size * 0.16);
  const eyeH = blink ? 2 : eye;
  g.fillStyle(ZAP_CYAN, alpha);
  g.fillRect(x - size * 0.25 - eye / 2, y - size * 0.15, eye, eyeH);
  g.fillRect(x + size * 0.25 - eye / 2, y - size * 0.15, eye, eyeH);
  g.fillStyle(BOT_PURPLE, alpha).fillRect(x - 1.5, y - size / 2 - 9, 3, 8);
  disc(g, x, y - size / 2 - 10, 3, WHITE, alpha);
}

/** The AI scan around the finisher's target: reticle, linked nodes, the bot above. */
function botScan(f: MoveFrame, at: Point, lock: number, alpha: number): void {
  const { g, glow, frame } = f;
  const radius = lerp(70, 34, easeOutCubic(lock));
  tickRing(glow, at.x, at.y, radius + 6, 6, frame * 0.18, 6, BOT_BLUE, 0.4 * alpha);
  tickRing(g, at.x, at.y, radius, 6, frame * 0.18, 3, ZAP_CYAN, alpha);
  tickRing(g, at.x, at.y, radius * 0.6, 4, -frame * 0.25, 2, BOT_PURPLE, alpha);
  // Crosshair.
  g.lineStyle(2, WHITE, 0.8 * alpha);
  g.lineBetween(at.x - radius - 10, at.y, at.x - radius * 0.4, at.y);
  g.lineBetween(at.x + radius * 0.4, at.y, at.x + radius + 10, at.y);
  g.lineBetween(at.x, at.y - radius - 10, at.x, at.y - radius * 0.4);
  g.lineBetween(at.x, at.y + radius * 0.4, at.x, at.y + radius + 10);
  // Network: nodes around the target, linked one after another as the scan locks.
  const nodes = Array.from({ length: NETWORK_NODES }, (_, i) => {
    const a = (i / NETWORK_NODES) * Math.PI * 2 + 0.4;
    const d = radius + 20 + hash01(i, 5) * 18;
    return { x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d * 0.8 };
  });
  const linked = lock * NETWORK_NODES;
  nodes.forEach((p, i) => {
    const next = nodes[(i + 1) % NETWORK_NODES]!;
    if (i < linked) {
      glow.lineStyle(4, BOT_PURPLE, 0.35 * alpha).lineBetween(p.x, p.y, next.x, next.y);
      g.lineStyle(1.5, ZAP_CYAN, 0.8 * alpha).lineBetween(p.x, p.y, next.x, next.y);
    }
    disc(glow, p.x, p.y, 8, BOT_BLUE, 0.4 * alpha);
    pixelBox(g, p.x - 4, p.y - 4, 8, 8, i < linked ? WHITE : BOT_PURPLE, alpha);
  });
  // The bot hologram above, scanning down (a sweeping beam line).
  const head = { x: at.x, y: at.y - radius - 46 };
  botHead(g, glow, head.x, head.y, 30 * easeOutBack(clamp01(lock * 2)), alpha, frame % 20 < 2);
  const sweep = at.y - radius + ((frame * 6) % (radius * 2));
  glow.lineStyle(3, ZAP_CYAN, 0.35 * alpha).lineBetween(at.x - radius, sweep, at.x + radius, sweep);
}

function drawMove(f: MoveFrame): void {
  const { g, glow, phase, t, frame, attack, direction: dir, hand } = f;
  const hits = attackHits(attack);
  const starts = stepStarts(attack);
  const finisher = hits.length - 1;
  const finisherSpan = stepSpan(f, hits[finisher]!);
  const target = finisherSpan.to;

  if (phase === 'startup') {
    // POWERZAP charging: a bubble with typing dots at her hand and "send" waves pulsing.
    const grow = easeOutBack(clamp01(t * 1.4));
    disc(glow, hand.x, hand.y, 26 * grow, ZAP_GREEN, 0.45);
    chatBubble(g, hand.x, hand.y - 4, 34 * grow, 20 * grow, {
      fill: ZAP_GREEN,
      alpha: 1,
      tail: dir > 0 ? -1 : 1,
      content: 'dots',
      dots: 1 + (Math.floor(frame / 4) % 3),
    });
    for (let i = 0; i < 2; i++) {
      const w = (t * 2 + i * 0.5) % 1;
      waveArc(glow, hand.x, hand.y, 16 + 40 * w, dir, 0.7, 4, ZAP_CYAN, 0.6 * (1 - w));
    }
    return;
  }

  const into = frame - attack.startupFrames;
  if (phase === 'active') {
    // Messaging hits: each fires a bubble from its own step, flying to its reach.
    for (let i = 0; i < finisher; i++) {
      const progress = (into - starts[i]!) / ZAP_FLIGHT;
      if (progress < 0 || progress >= 1) continue;
      const span = stepSpan(f, hits[i]!);
      zapShot(f, { x: hand.x, y: span.from.y }, span.to, progress, i * 7 + 3);
    }
    // Send waves keep pulsing from the hand while messages go out.
    if (into < starts[finisher]! - 2) {
      const w = (into / 6) % 1;
      waveArc(glow, hand.x, hand.y, 16 + 50 * w, dir, 0.7, 4, ZAP_GREEN, 0.55 * (1 - w));
    }
  }

  // POWERBOT: the scan locks on shortly before the finisher opens, holds through it and fades
  // with the recovery.
  const scanFrom = starts[finisher]! - SCAN_LEAD;
  if (into < scanFrom) return;
  const lock = clamp01((into - scanFrom) / SCAN_LEAD);
  const alpha = phase === 'recovery' ? clamp01(1 - t * 1.8) : 1;
  if (alpha <= 0) return;
  // A data beam from her hand to the target while it locks.
  if (phase === 'active') {
    glow.lineStyle(8, BOT_PURPLE, 0.3 * lock).lineBetween(hand.x, hand.y, target.x, target.y);
    g.lineStyle(2, ZAP_CYAN, 0.8 * lock).lineBetween(hand.x, hand.y, target.x, target.y);
  }
  // Once the finisher has landed, its explosion takes over (it brings its own bot).
  const finisherLanded = into >= starts[finisher]! && f.impacting;
  if (!finisherLanded) botScan(f, target, lock, alpha);
}

function drawImpact(f: ImpactFrame): void {
  const { hit, hits } = f;
  if (hit < hits - 1) zapImpact(f);
  else botImpact(f);
}

/** A messaging hit lands: quick and small (it is over in the first half of the impact time). */
function zapImpact(f: ImpactFrame): void {
  const { g, glow, x, y, blocked, direction: dir } = f;
  const t = clamp01(f.t * 2);
  if (t >= 1) return;
  const fade = 1 - t;
  const size = blocked ? 0.6 : 1;
  const out = easeOutCubic(t);
  if (t < 0.2) disc(glow, x, y, 26 * size, WHITE, 0.8 * (1 - t / 0.2));
  glow.lineStyle(4, ZAP_GREEN, 0.8 * fade).strokeCircle(x, y, (10 + 34 * out) * size);
  for (let i = 0; i < (blocked ? 4 : 7); i++) {
    const a = (i / 7) * Math.PI * 2 + hash01(i, 21);
    const d = (14 + 30 * hash01(i, 22)) * out * size;
    pixelBox(
      g,
      x + Math.cos(a) * d * dir - 3,
      y + Math.sin(a) * d - 3,
      6,
      6,
      i % 2 ? ZAP_CYAN : ZAP_GREEN,
      fade,
    );
  }
  if (!blocked && t < 0.6)
    chatBubble(g, x, y - 26 - 10 * out, 26, 16, {
      fill: WHITE,
      alpha: fade,
      tail: dir > 0 ? -1 : 1,
      content: 'lines',
      contentColor: ZAP_GREEN,
    });
}

/** The finisher lands: a digital explosion (flash, rings, glitch bars, shards, the bot). */
function botImpact(f: ImpactFrame): void {
  const { g, glow, x, y, t, blocked, direction: dir } = f;
  const fade = 1 - t;
  const size = blocked ? 0.55 : 1;
  const out = easeOutCubic(t);
  if (t < 0.15) disc(glow, x, y, 70 * size, WHITE, 0.95 * (1 - t / 0.15));
  disc(glow, x, y, 50 * size * (1 - t), BOT_PURPLE, 0.45 * fade);
  glow.lineStyle(7, BOT_BLUE, 0.9 * fade).strokeCircle(x, y, (18 + 90 * out) * size);
  glow.lineStyle(3, BOT_PURPLE, 0.85 * fade).strokeCircle(x, y, (10 + 60 * out) * size);
  g.lineStyle(2, WHITE, 0.8 * fade).strokeCircle(x, y, (6 + 40 * out) * size);
  // Glitch bars: offset horizontal slices flickering over the target.
  if (t < 0.5) {
    for (let i = 0; i < (blocked ? 3 : 6); i++) {
      const by = y - 50 * size + hash01(i, Math.floor(t * 20)) * 100 * size;
      const bw = (30 + hash01(i, 31) * 70) * size;
      const bx = x - bw / 2 + (hash01(i, 32) - 0.5) * 30;
      g.fillStyle(i % 2 ? ZAP_CYAN : BOT_PURPLE, 0.7 * (1 - t * 2)).fillRect(bx, by, bw, 4);
    }
  }
  // Pixel shards flying out.
  const count = blocked ? 8 : 16;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + hash01(i, 41) * 0.4;
    const d = (24 + 90 * hash01(i, 42)) * out * size;
    const s = 4 + (i % 3) * 2;
    pixelBox(
      g,
      x + Math.cos(a) * d * dir - s / 2,
      y + Math.sin(a) * d - s / 2,
      s,
      s,
      i % 3 === 0 ? WHITE : i % 3 === 1 ? BOT_BLUE : BOT_PURPLE,
      fade,
    );
  }
  if (blocked) return;
  // The bot face flashes over the explosion, "analysis complete".
  const pop = t < 0.25 ? easeOutBack(t / 0.25) : 1;
  botHead(g, glow, x, y - 70, 34 * pop, clamp01(fade * 1.8), false);
}

export const POWER_THEME: SpecialTheme = {
  impactMs: 680,
  drawMove,
  drawImpact,
};
