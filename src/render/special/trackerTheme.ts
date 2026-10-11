import { attackHits } from '../../core/fighter/attackFrames';
import type { ImpactFrame, MoveFrame, SpecialTheme } from './specialTheme';
import {
  chatBubble,
  clamp01,
  disc,
  easeOutBack,
  easeOutCubic,
  hash01,
  lerp,
  partialPath,
  pixelBox,
  pointOnPath,
  readReceipt,
  tickRing,
  waveArc,
  type Graphics,
} from './vfxShapes';

/*
 * TRACKEADO!: a WhatsApp campaign tracker (Jonas, Sapiens). Original drawing, no app logo:
 * a phone, radar sweeps, a lock-on reticle, map pins, a funnel and a sales chart.
 *
 * Arming (startup): a phone glows in front of him, radar arcs sweep forward from it, a dashed
 * scan line reaches out over the zone and small pins drop along it. Tracking (active): a reticle
 * locks onto the zone (the target), and the funnel plays step by step, synced to `hits`:
 * CLIQUE (a link bubble pops and a cursor clicks), LEAD (pins drop around the target and data
 * packets fly back to the phone along a dotted arc), VENDA! (a bar chart rises behind the
 * target with an arrow spiking up). Impacts: a click ripple, a pin burst, and the sale: a green
 * burst with chart bars, coins and confetti; on block, a smaller version.
 *
 * Everything is rectangles, discs, strokes and the shared bubble shapes (vfxShapes): nothing to
 * load, nothing created at the button press. Timing comes only from the frame data and `hits`.
 */

const GREEN = 0x3dff8a;
const TEAL = 0x18c48f;
const CYAN = 0x21e6ff;
const PINK = 0xff3da8;
const GOLD = 0xffd84a;
const WHITE = 0xffffff;
const SLATE = 0x0d1b2a;
const LINK = 0x2d6bff;
/** The phone, from the feet (facing right): at the chest while arming, then in the thrown hand. */
const PHONE_ARMING = { x: 26, y: -118 };
const PHONE_AIMED = { x: 80, y: -150 };
const PHONE_SIZE = { w: 24, h: 38 };
/** The dashboard panel behind the target, from the target (facing right). */
const PANEL = { dx: 30, dy: -168, w: 170, h: 132 };

type Point = { x: number; y: number };

/** Where the tracker locks on: the middle of the zone, at body height. */
function targetOf(f: MoveFrame): Point {
  const box = attackHits(f.attack)[0]!.hitbox;
  return {
    x: f.fighter.position.x + f.direction * (box.x + box.width * 0.5),
    y: f.fighter.position.y + box.y + box.height * 0.4,
  };
}

/** A line with a dark edge under it, so it reads over bright and dark stages alike. */
function inkLine(
  g: Graphics,
  a: Point,
  b: Point,
  width: number,
  color: number,
  alpha: number,
): void {
  g.lineStyle(width + 4, SLATE, alpha * 0.8).lineBetween(a.x, a.y, b.x, b.y);
  g.lineStyle(width, color, alpha).lineBetween(a.x, a.y, b.x, b.y);
}

function phone(g: Graphics, glow: Graphics, p: Point, alpha: number, frame: number): void {
  const { w, h } = PHONE_SIZE;
  disc(glow, p.x, p.y, 30, GREEN, 0.35 * alpha);
  pixelBox(g, p.x - w / 2 - 3, p.y - h / 2 - 3, w + 6, h + 6, SLATE, alpha);
  pixelBox(g, p.x - w / 2, p.y - h / 2, w, h, TEAL, alpha);
  // A tiny dashboard on the screen: bars ticking up and down.
  for (let i = 0; i < 3; i++) {
    const bar = 7 + ((frame + i * 3) % 9);
    g.fillStyle(WHITE, alpha).fillRect(p.x - 9 + i * 7, p.y + 13 - bar, 4, bar);
  }
}

/** A map pin (drop shape from rectangles, dark outline) standing on `p`. */
function pin(g: Graphics, p: Point, size: number, color: number, alpha: number): void {
  if (size < 3 || alpha <= 0) return;
  pixelBox(g, p.x - size / 2 - 2, p.y - size * 1.6 - 2, size + 4, size + 4, SLATE, alpha);
  pixelBox(g, p.x - size / 2, p.y - size * 1.6, size, size, color, alpha);
  g.fillStyle(SLATE, alpha).fillRect(
    p.x - size * 0.2 - 1,
    p.y - size * 0.7,
    size * 0.4 + 2,
    size * 0.7,
  );
  g.fillStyle(color, alpha).fillRect(p.x - size * 0.2, p.y - size * 0.7, size * 0.4, size * 0.65);
  g.fillStyle(WHITE, alpha).fillRect(
    p.x - size * 0.18,
    p.y - size * 1.35,
    size * 0.36,
    size * 0.36,
  );
}

/** The lock-on reticle: corner brackets closing in, a ring of ticks and a center dot. */
function reticle(
  g: Graphics,
  glow: Graphics,
  c: Point,
  lock: number,
  frame: number,
  a: number,
): void {
  const locked = lock >= 1;
  const r = lerp(120, 62, easeOutCubic(lock));
  const arm = 22;
  const color = locked ? GREEN : CYAN;
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    const corner = { x: c.x + sx * r, y: c.y + sy * r };
    inkLine(g, corner, { x: corner.x - sx * arm, y: corner.y }, 6, color, a);
    inkLine(g, corner, { x: corner.x, y: corner.y - sy * arm }, 6, color, a);
  }
  tickRing(glow, c.x, c.y, r * 0.7, 8, frame * 0.08, 5, GREEN, 0.7 * a);
  // Crosshair through the center.
  inkLine(g, { x: c.x - 14, y: c.y }, { x: c.x + 14, y: c.y }, 3, WHITE, a);
  inkLine(g, { x: c.x, y: c.y - 14 }, { x: c.x, y: c.y + 14 }, 3, WHITE, a);
  if (locked && frame % 8 < 5) pixelBox(g, c.x - 5, c.y - 5, 10, 10, PINK, a);
}

/** The dashboard panel: dark glass, green frame, a header strip. */
function panel(g: Graphics, glow: Graphics, c: Point, dir: 1 | -1, open: number, a: number): Point {
  const w = PANEL.w * open;
  const h = PANEL.h * open;
  const left = dir > 0 ? c.x + PANEL.dx : c.x - PANEL.dx - PANEL.w;
  const top = c.y + PANEL.dy;
  const cx = left + PANEL.w / 2;
  const cy = top + PANEL.h / 2;
  if (w > 6 && h > 6) {
    glow.fillStyle(GREEN, 0.18 * a).fillRect(cx - w / 2 - 6, cy - h / 2 - 6, w + 12, h + 12);
    pixelBox(g, cx - w / 2 - 3, cy - h / 2 - 3, w + 6, h + 6, GREEN, a);
    pixelBox(g, cx - w / 2, cy - h / 2, w, h, SLATE, a * 0.88);
    g.fillStyle(TEAL, a).fillRect(cx - w / 2, cy - h / 2, w, Math.min(14, h));
    for (let i = 0; i < 3; i++) {
      g.fillStyle(WHITE, a * 0.8).fillRect(cx - w / 2 + 6 + i * 9, cy - h / 2 + 4, 5, 5);
    }
  }
  return { x: left, y: top };
}

/** The sales chart in the panel: bars rising and an arrow spiking up. */
function chart(g: Graphics, glow: Graphics, corner: Point, grow: number, a: number): void {
  const base = corner.y + PANEL.h - 12;
  const bars = [0.3, 0.45, 0.38, 0.65, 1];
  bars.forEach((h, i) => {
    const height = 92 * h * easeOutBack(clamp01(grow * 1.5 - i * 0.12));
    const x = corner.x + 16 + i * 30;
    pixelBox(g, x, base - height, 20, height, i === bars.length - 1 ? GREEN : TEAL, a);
  });
  const pts = bars.map((h, i) => ({ x: corner.x + 26 + i * 30, y: base - 92 * h - 14 }));
  partialPath(glow, pts, grow, 10, GOLD, 0.5 * a);
  const tip = partialPath(g, pts, grow, 4, GOLD, a);
  if (tip && grow > 0.95) {
    g.fillStyle(GOLD, a).fillTriangle(
      tip.x,
      tip.y - 14,
      tip.x - 10,
      tip.y + 4,
      tip.x + 10,
      tip.y + 4,
    );
  }
}

/** A funnel (three narrowing bars) with a drop falling out of it: the lead captured. */
function funnel(g: Graphics, c: Point, k: number, a: number): void {
  const widths = [64, 44, 24];
  widths.forEach((w, i) => {
    const y = c.y + i * 14;
    pixelBox(g, c.x - w / 2 - 2, y - 2, w + 4, 14, SLATE, a);
    pixelBox(g, c.x - w / 2, y, w, 10, i === 2 ? GREEN : CYAN, a);
  });
  const drop = (k * 2) % 1;
  pixelBox(g, c.x - 5, c.y + 42 + drop * 24, 10, 10, PINK, a * (1 - drop));
}

function drawMove(f: MoveFrame): void {
  const { g, glow, phase, t, frame, fighter, direction: dir, attack } = f;
  const at = (o: Point): Point => ({
    x: fighter.position.x + dir * o.x,
    y: fighter.position.y + o.y,
  });
  const c = targetOf(f);
  const steps = attack.hits ?? [];
  const leadAt = steps[1]?.activeFrame ?? 0;
  const saleAt = steps[steps.length - 1]?.activeFrame ?? 0;

  if (phase === 'startup') {
    const p = at(PHONE_ARMING);
    phone(g, glow, p, clamp01(t * 3), frame);
    // Radar arcs sweeping forward from the phone.
    for (let i = 0; i < 3; i++) {
      const w = (t * 1.5 + i / 3) % 1;
      waveArc(glow, p.x, p.y, 30 + 220 * w, dir, 0.5, 12, GREEN, 0.4 * (1 - w));
      waveArc(g, p.x, p.y, 30 + 220 * w, dir, 0.5, 4, CYAN, 0.9 * (1 - w));
    }
    // A dashed scan line reaching over the zone, pins dropping along the floor.
    const reach = easeOutCubic(t);
    for (let i = 0; i < 16; i += 2) {
      const k = i / 16;
      if (k > reach) break;
      const x = lerp(p.x, c.x + dir * 90, k);
      const y = lerp(p.y, c.y, k);
      g.fillStyle(SLATE, 0.8).fillRect(x - 7, y - 3, 14, 6);
      g.fillStyle(CYAN, 1).fillRect(x - 6, y - 2, 12, 4);
    }
    for (let i = 0; i < 4; i++) {
      const drop = clamp01(t * 2.2 - i * 0.3);
      const x = lerp(p.x, c.x + dir * 70, (i + 1) / 5);
      pin(g, { x, y: fighter.position.y - 6 - (1 - easeOutCubic(drop)) * 50 }, 14, PINK, drop);
    }
    return;
  }

  const into = frame - attack.startupFrames;
  const fade = phase === 'recovery' ? 1 - easeOutCubic(clamp01(t * 2.4)) : 1;
  if (fade <= 0) return;
  const p = at(PHONE_AIMED);
  // The tracking beam from the phone to the target, then the phone over it.
  glow.lineStyle(12, GREEN, 0.3 * fade).lineBetween(p.x, p.y, c.x, c.y);
  inkLine(g, p, c, 3, CYAN, 0.85 * fade);
  phone(g, glow, p, fade, frame);
  reticle(g, glow, c, clamp01((into + 1) / 4), frame, fade);

  // CLIQUE: a link bubble pops over the target, a cursor clicking it.
  if (into < leadAt + 2) {
    const pop = easeOutBack(clamp01((into + 1) / 3));
    const b = { x: c.x - dir * 6, y: c.y - 104 };
    chatBubble(g, b.x, b.y, 96 * pop, 40 * pop, {
      fill: WHITE,
      alpha: fade,
      tail: dir > 0 ? -1 : 1,
      content: 'none',
    });
    if (pop > 0.6) {
      // The link: an underlined blue line with a chain icon.
      pixelBox(g, b.x - 38, b.y - 7, 12, 8, LINK, fade);
      pixelBox(g, b.x - 30, b.y - 3, 12, 8, LINK, fade);
      g.fillStyle(LINK, fade).fillRect(b.x - 12, b.y - 4, 48, 5);
      g.fillStyle(LINK, fade).fillRect(b.x - 12, b.y + 4, 48, 2);
      // The cursor (an arrow of rectangles) pressing it.
      const press = into % 4 < 2 ? 3 : 0;
      for (let i = 0; i < 9; i++) {
        const row = { x: b.x + 10 + press, y: b.y + 4 + i * 3 + press };
        g.fillStyle(SLATE, fade).fillRect(row.x - 1, row.y - 1, 11 - i + 2, 5);
        g.fillStyle(WHITE, fade).fillRect(row.x, row.y, 10 - i, 3);
      }
    }
  }

  // LEAD: pins drop around the target, a funnel captures it, data flies back to the phone.
  if (into >= leadAt) {
    const k = clamp01((into - leadAt + 1) / 4);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.6;
      const spot = { x: c.x + Math.cos(a) * 92, y: c.y + Math.sin(a) * 48 + 70 };
      const drop = clamp01(k * 1.6 - i * 0.15);
      pin(
        g,
        { x: spot.x, y: spot.y - (1 - easeOutCubic(drop)) * 40 },
        18,
        i % 2 ? PINK : GREEN,
        drop * fade,
      );
    }
    if (into < saleAt) funnel(g, { x: c.x - dir * 6, y: c.y - 128 }, (into - leadAt) * 0.12, fade);
    const arc = [c, { x: lerp(c.x, p.x, 0.5), y: Math.min(c.y, p.y) - 110 }, p];
    partialPath(glow, arc, 1, 4, GREEN, 0.35 * fade);
    for (let i = 0; i < 5; i++) {
      const q = ((into - leadAt) * 0.12 + i / 5) % 1;
      const spot = pointOnPath(arc, q);
      chatBubble(g, spot.x, spot.y, 30, 18, {
        fill: i % 2 ? GREEN : WHITE,
        alpha: 0.95 * fade,
        tail: dir > 0 ? 1 : -1,
        content: 'none',
      });
      readReceipt(g, spot.x, spot.y - 1, 9, i % 2 ? SLATE : CYAN, fade);
    }
  }

  // VENDA!: the dashboard opens behind the target and the chart spikes on the sale.
  if (into >= saleAt - 5) {
    const open = easeOutBack(clamp01((into - (saleAt - 5)) / 3));
    const corner = panel(g, glow, c, dir, open, fade);
    if (open >= 0.95) chart(g, glow, corner, clamp01((into - (saleAt - 3)) / 5), fade);
  }
}

/** Click: a ripple of rings and a short spark burst. */
function clickImpact(fr: ImpactFrame): void {
  const { g, glow, x, y, blocked } = fr;
  const t = clamp01(fr.t * 2);
  if (t >= 1) return;
  const fade = 1 - t;
  const size = blocked ? 0.55 : 1;
  for (let i = 0; i < 3; i++) {
    const r = (8 + 40 * easeOutCubic(clamp01(t * 1.3 - i * 0.15))) * size;
    glow.lineStyle(4, i === 1 ? CYAN : GREEN, 0.8 * fade).strokeCircle(x, y, r);
  }
  for (let i = 0; i < (blocked ? 4 : 8); i++) {
    const a = (i / 8) * Math.PI * 2 + hash01(i, 5);
    const d = (12 + 36 * easeOutCubic(t)) * size;
    pixelBox(
      g,
      x + Math.cos(a) * d - 2,
      y + Math.sin(a) * d - 2,
      4,
      4,
      i % 2 ? WHITE : GREEN,
      fade,
    );
  }
}

/** The sale: a green burst, chart bars flying, coins and confetti. */
function saleImpact(fr: ImpactFrame): void {
  const { g, glow, x, y, t, blocked, direction: dir } = fr;
  const fade = 1 - t;
  const size = blocked ? 0.5 : 1;
  const out = easeOutCubic(t);
  if (t < 0.18) {
    const k = 1 - t / 0.18;
    for (let i = 0; i < 3; i++) {
      glow
        .lineStyle(24 * size, i === 0 ? WHITE : i === 1 ? GREEN : GOLD, (i === 0 ? 0.9 : 0.6) * k)
        .strokeCircle(x, y, (12 + i * 24) * size);
    }
  }
  glow.lineStyle(10, GREEN, 0.8 * fade).strokeCircle(x, y, (20 + 120 * out) * size);
  glow.lineStyle(4, GOLD, 0.85 * fade).strokeCircle(x, y, (14 + 80 * out) * size);
  if (blocked) return;
  // Coins: gold squares with a white glint, arcing up and out.
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i - 3.5) * 0.32;
    const d = 30 + 110 * out;
    const cx = x + Math.cos(a) * d * dir;
    const cy = y + Math.sin(a) * d + 160 * t * t;
    pixelBox(g, cx - 6, cy - 6, 12, 12, GOLD, fade);
    g.fillStyle(WHITE, fade).fillRect(cx - 3, cy - 4, 3, 3);
  }
  // Confetti in the tracker's colors.
  for (let i = 0; i < 18; i++) {
    const a = hash01(i, 21) * Math.PI * 2;
    const d = (20 + 140 * hash01(i, 22)) * out;
    const color = i % 3 === 0 ? PINK : i % 3 === 1 ? CYAN : GREEN;
    pixelBox(g, x + Math.cos(a) * d - 3, y + Math.sin(a) * d - 2 + 60 * t * t, 6, 4, color, fade);
  }
}

function drawImpact(fr: ImpactFrame): void {
  if (fr.hit < fr.hits - 1) clickImpact(fr);
  else saleImpact(fr);
}

export const TRACKER_THEME: SpecialTheme = {
  impactMs: 680,
  drawMove,
  drawImpact,
};
