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
  waveArc,
  type Graphics,
} from './vfxShapes';

/*
 * FOORCE ZAP: a charged dash punch that fires a burst of messages. Charge (startup): the raised
 * fist fills with green and gold energy, small bolts crackle around it and a gold ring tightens
 * on it. Dash (active): speed lines trail behind him, and from the fist a cone of "send" waves,
 * zig-zag bolts and chat bubbles blasts forward over the reach. Hit: a green and gold burst with
 * bubbles popping out and sparks; on block, a smaller, duller version.
 *
 * Colors: message green with the gold and deep navy of the Brasil Leads look. Original drawing
 * (no app logo): bubbles, bolts and rings only. Everything procedural: nothing to load.
 */

const GREEN = 0x25d366;
const LIME = 0x8dff6a;
const GOLD = 0xe0b03a;
const GOLD_LIGHT = 0xffe08a;
const NAVY = 0x1b1f4a;
const WHITE = 0xffffff;
/** The raised fist of the charge pose, from the feet (facing right). */
const FIST = { x: 40, y: -170 };

type Point = { x: number; y: number };

/** A short zig-zag bolt from a to b (deterministic jitter per seed). */
function bolt(
  g: Graphics,
  a: Point,
  b: Point,
  seed: number,
  width: number,
  color: number,
  alpha: number,
): void {
  const steps = 5;
  let prev = a;
  g.lineStyle(width, color, alpha);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const jitter = i === steps ? 0 : (hash01(seed, i) - 0.5) * 18;
    const next = { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) + jitter };
    g.lineBetween(prev.x, prev.y, next.x, next.y);
    prev = next;
  }
}

function drawMove(f: MoveFrame): void {
  const { g, glow, phase, t, frame, fighter, direction: dir, hand, front } = f;

  if (phase === 'startup') {
    // Energy filling the raised fist; a gold ring tightening on it; bolts crackling.
    const fist = { x: fighter.position.x + dir * FIST.x, y: fighter.position.y + FIST.y };
    const grow = easeOutCubic(t);
    disc(glow, fist.x, fist.y, 12 + 18 * grow, GREEN, 0.35 + 0.3 * grow);
    disc(glow, fist.x, fist.y, 6 + 6 * grow, GOLD_LIGHT, 0.6);
    glow.lineStyle(3, GOLD, 0.8).strokeCircle(fist.x, fist.y, lerp(46, 16, grow));
    for (let i = 0; i < 3; i++) {
      if (hash01(frame, i) > 0.3 + 0.5 * t) continue;
      const a = hash01(frame, i + 7) * Math.PI * 2;
      const len = 16 + 18 * t;
      bolt(
        g,
        fist,
        { x: fist.x + Math.cos(a) * len, y: fist.y + Math.sin(a) * len },
        frame * 3 + i,
        2,
        i % 2 ? LIME : GOLD_LIGHT,
        0.9,
      );
    }
    // Particles drawn into the fist.
    for (let i = 0; i < 8; i++) {
      const p = (t * 1.8 + hash01(i, 11)) % 1;
      const a = hash01(i, 12) * Math.PI * 2;
      const d = (1 - p) * 40;
      pixelBox(
        g,
        fist.x + Math.cos(a) * d - 2,
        fist.y + Math.sin(a) * d - 2,
        4,
        4,
        i % 2 ? GREEN : GOLD,
        clamp01(p * 2),
      );
    }
    return;
  }

  if (phase === 'active') {
    // Speed lines trailing behind the dash.
    for (let i = 0; i < 6; i++) {
      const y = fighter.position.y - 40 - i * 24 - hash01(i, 21) * 8;
      const x0 = fighter.position.x - dir * (20 + hash01(i, 22) * 14);
      const len = 50 + hash01(i, 23) * 60;
      g.lineStyle(2, i % 2 ? WHITE : GREEN, 0.6).lineBetween(x0, y, x0 - dir * len, y);
    }
    const reach = Math.abs(front.x - hand.x);
    // Glowing fist at the front of the punch.
    disc(glow, hand.x, hand.y, 22, GREEN, 0.55);
    disc(glow, hand.x, hand.y, 10, GOLD_LIGHT, 0.8);
    // The cone of "send" waves blasting forward.
    for (let i = 0; i < 3; i++) {
      const w = (t * 2 + i / 3) % 1;
      const x = hand.x + dir * reach * w;
      waveArc(glow, x, hand.y, 16 + 30 * w, dir, 0.75, 7, GREEN, 0.5 * (1 - w));
      waveArc(g, x, hand.y, 16 + 30 * w, dir, 0.75, 3, i % 2 ? GOLD : LIME, 0.9 * (1 - w));
    }
    // Zig-zag bolts along the reach.
    for (let i = 0; i < 2; i++) {
      bolt(glow, hand, { x: front.x, y: hand.y + (i ? -14 : 12) }, frame * 5 + i, 6, GREEN, 0.4);
      bolt(
        g,
        hand,
        { x: front.x, y: hand.y + (i ? -14 : 12) },
        frame * 5 + i,
        2,
        i ? GOLD_LIGHT : WHITE,
        0.95,
      );
    }
    // Chat bubbles riding the blast.
    for (let i = 0; i < 3; i++) {
      const p = (t * 1.6 + i / 3) % 1;
      const x = hand.x + dir * reach * easeOutCubic(p);
      const y = hand.y - 26 + (i - 1) * 22;
      chatBubble(g, x, y, 22 + 6 * (1 - p), 13, {
        fill: i === 1 ? GOLD : GREEN,
        alpha: 1 - p * 0.5,
        tail: dir > 0 ? -1 : 1,
        content: 'lines',
        contentColor: NAVY,
      });
    }
    return;
  }

  // Recovery: the last waves fade out at the end of the reach.
  const fade = 1 - t;
  if (fade <= 0 || f.impacting) return;
  waveArc(glow, front.x, front.y, 30 + 20 * t, dir, 0.75, 6, GREEN, 0.4 * fade);
  disc(glow, hand.x, hand.y, 12 * fade, GREEN, 0.4 * fade);
}

function drawImpact(fr: ImpactFrame): void {
  const { g, glow, x, y, t, blocked, direction: dir } = fr;
  const fade = 1 - t;
  const size = blocked ? 0.55 : 1;
  const out = easeOutCubic(t);
  if (t < 0.16) {
    const k = 1 - t / 0.16;
    for (let i = 0; i < 3; i++) {
      glow
        .lineStyle(22 * size, i === 0 ? WHITE : i === 1 ? LIME : GREEN, (i === 0 ? 0.95 : 0.6) * k)
        .strokeCircle(x, y, (10 + i * 22) * size);
    }
  }
  glow.lineStyle(10, GREEN, 0.8 * fade).strokeCircle(x, y, (18 + 100 * out) * size);
  glow.lineStyle(4, GOLD, 0.85 * fade).strokeCircle(x, y, (12 + 70 * out) * size);
  // Sparks: short bolts flying out.
  const sparks = blocked ? 4 : 9;
  for (let i = 0; i < sparks; i++) {
    const a = (i / sparks) * Math.PI * 2 + hash01(i, 31);
    const d0 = (10 + 30 * out) * size;
    const d1 = (30 + 80 * out) * size;
    bolt(
      g,
      { x: x + Math.cos(a) * d0, y: y + Math.sin(a) * d0 },
      { x: x + Math.cos(a) * d1 * dir, y: y + Math.sin(a) * d1 },
      i * 7 + 3,
      2,
      i % 2 ? GOLD_LIGHT : LIME,
      fade,
    );
  }
  if (blocked) return;
  // Message bubbles popping out of the burst.
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.55;
    const d = 30 + 70 * out;
    const pop = t < 0.3 ? easeOutBack(t / 0.3) : 1;
    chatBubble(g, x + Math.cos(a) * d * dir, y + Math.sin(a) * d, 26 * pop, 15 * pop, {
      fill: i % 2 ? GOLD : GREEN,
      alpha: clamp01(fade * 1.6),
      tail: dir > 0 ? -1 : 1,
      content: 'lines',
      contentColor: NAVY,
    });
  }
}

export const FORCE_THEME: SpecialTheme = {
  impactMs: 620,
  drawMove,
  drawImpact,
};
