import type { ImpactFrame, MoveFrame, SpecialTheme } from './specialTheme';
import {
  clamp01,
  disc,
  easeOutBack,
  easeOutCubic,
  hash01,
  lerp,
  partialPath,
  pixelBox,
  pointOnPath,
  type Graphics,
} from './vfxShapes';

/*
 * N8N!: an automation workflow fired at the rival. Charge: a trigger node (a lightning bolt)
 * pops up at the hand and the workflow's nodes appear one by one ahead of it, on a staggered
 * line, each with its own pictogram (gear, code brackets, a branch), while their input/output
 * dots blink. Execution: the curved connections are drawn node to node toward the rival and
 * glowing data packets race along them to the last node, at the reach's end, which flashes with
 * a check mark. Hit: an "executed" burst: a coral ring, a big check node, packets scattering and
 * small nodes popping. Dissipation: the connections fade and the nodes shrink away.
 *
 * Colors: the coral pink of the workflow tool's look, deep plum node bodies and white glyphs.
 * Original drawing (no product logo): nodes, links and packets only.
 */

const CORAL = 0xff6d5a;
const PINK = 0xea4b71;
const PLUM = 0x2a1630;
const PLUM_LIGHT = 0x4a2a52;
const WHITE = 0xffffff;
const MINT = 0x3ff2a2;
const NODES = 4;
const NODE = 26;
const PACKETS = 5;

type Point = { x: number; y: number };

/** Workflow node centers from the hand to the far end of the reach, staggered up and down. */
function nodePoints(f: MoveFrame): Point[] {
  const { hand, front } = f;
  return Array.from({ length: NODES }, (_, i) => {
    const t = i / (NODES - 1);
    return { x: lerp(hand.x, front.x, t), y: hand.y + (i === 0 ? 0 : i % 2 ? -26 : 10) };
  });
}

/** Curved connection between two nodes (as a short polyline: an S from output to input). */
function link(a: Point, b: Point): Point[] {
  const steps = 8;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const ease = t * t * (3 - 2 * t);
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, ease) };
  });
}

/** A node: rounded plum body, coral rim, a pictogram, and its input/output dots. */
function node(
  g: Graphics,
  glow: Graphics,
  p: Point,
  size: number,
  kind: number,
  alpha: number,
  lit: number,
): void {
  if (size < 4 || alpha <= 0) return;
  const half = size / 2;
  disc(glow, p.x, p.y, size * 0.9, CORAL, 0.25 * alpha + 0.35 * lit * alpha);
  pixelBox(g, p.x - half - 2, p.y - half - 2, size + 4, size + 4, lit > 0.5 ? MINT : CORAL, alpha);
  pixelBox(g, p.x - half, p.y - half, size, size, PLUM, alpha);
  pixelBox(g, p.x - half + 2, p.y - half + 2, size - 4, size * 0.3, PLUM_LIGHT, alpha * 0.8);
  // Input and output connectors.
  g.fillStyle(WHITE, alpha).fillRect(p.x - half - 5, p.y - 2, 4, 4);
  g.fillStyle(WHITE, alpha).fillRect(p.x + half + 1, p.y - 2, 4, 4);
  const s = size / 26;
  g.fillStyle(WHITE, alpha);
  switch (kind % 4) {
    case 0: {
      // Trigger: a lightning bolt.
      g.lineStyle(3 * s, WHITE, alpha);
      g.lineBetween(p.x + 3 * s, p.y - 8 * s, p.x - 3 * s, p.y + 1 * s);
      g.lineBetween(p.x - 3 * s, p.y + 1 * s, p.x + 3 * s, p.y - 1 * s);
      g.lineBetween(p.x + 3 * s, p.y - 1 * s, p.x - 3 * s, p.y + 8 * s);
      break;
    }
    case 1: {
      // A gear (square teeth around a ring).
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        g.fillRect(
          p.x + Math.cos(a) * 6 * s - 2 * s,
          p.y + Math.sin(a) * 6 * s - 2 * s,
          4 * s,
          4 * s,
        );
      }
      g.lineStyle(3 * s, WHITE, alpha).strokeRect(p.x - 4 * s, p.y - 4 * s, 8 * s, 8 * s);
      break;
    }
    case 2: {
      // Code: < / >.
      g.lineStyle(2.5 * s, WHITE, alpha);
      g.lineBetween(p.x - 4 * s, p.y - 5 * s, p.x - 8 * s, p.y);
      g.lineBetween(p.x - 8 * s, p.y, p.x - 4 * s, p.y + 5 * s);
      g.lineBetween(p.x + 4 * s, p.y - 5 * s, p.x + 8 * s, p.y);
      g.lineBetween(p.x + 8 * s, p.y, p.x + 4 * s, p.y + 5 * s);
      g.lineBetween(p.x + 2 * s, p.y - 6 * s, p.x - 2 * s, p.y + 6 * s);
      break;
    }
    default: {
      // Done: a check mark.
      g.lineStyle(3.5 * s, lit > 0.5 ? MINT : WHITE, alpha);
      g.lineBetween(p.x - 7 * s, p.y, p.x - 2 * s, p.y + 5 * s);
      g.lineBetween(p.x - 2 * s, p.y + 5 * s, p.x + 8 * s, p.y - 6 * s);
    }
  }
}

function drawMove(f: MoveFrame): void {
  const { g, glow, phase, t, frame } = f;
  const points = nodePoints(f);

  if (phase === 'startup') {
    // The nodes pop in one by one, from the trigger at the hand.
    points.forEach((p, i) => {
      const local = clamp01(t * NODES - i * 0.8);
      node(g, glow, p, NODE * easeOutBack(local), i, clamp01(local * 2), 0);
    });
    // Blinking connector dots while the flow is being built.
    if (frame % 6 < 3) disc(glow, points[0]!.x, points[0]!.y, 18, PINK, 0.5);
    return;
  }

  if (phase === 'active') {
    const draw = easeOutCubic(clamp01(t * 1.6));
    // Connections drawn node to node, then packets racing along the whole flow.
    for (let i = 0; i < NODES - 1; i++) {
      const segment = clamp01(draw * (NODES - 1) - i);
      const path = link(points[i]!, points[i + 1]!);
      partialPath(glow, path, segment, 12, PINK, 0.45);
      partialPath(g, path, segment, 5, CORAL, 1);
      partialPath(g, path, segment, 2, WHITE, 0.7);
    }
    const flow = points.flatMap((p, i) => (i ? link(points[i - 1]!, p).slice(1) : [p]));
    for (let i = 0; i < PACKETS; i++) {
      const at = pointOnPath(flow, (t * 1.8 + i / PACKETS) % 1);
      disc(glow, at.x, at.y, 12, CORAL, 0.7);
      pixelBox(g, at.x - 5, at.y - 5, 10, 10, i % 2 ? WHITE : MINT, 1);
    }
    points.forEach((p, i) => {
      const lit = clamp01(draw * (NODES - 1) - i + 1);
      node(g, glow, p, NODE, i, 1, lit);
    });
    return;
  }

  // Recovery: links fade, nodes shrink away from the hand outward.
  const fade = 1 - t;
  for (let i = 0; i < NODES - 1; i++) {
    partialPath(g, link(points[i]!, points[i + 1]!), 1, 2, CORAL, fade * 0.8);
  }
  points.forEach((p, i) => {
    const local = clamp01(1 - t * 1.6 + i * 0.15);
    node(g, glow, p, NODE * local, i, local, i === NODES - 1 ? 1 : 0);
  });
}

function drawImpact(f: ImpactFrame): void {
  const { g, glow, x, y, t, blocked, direction: dir } = f;
  const fade = 1 - t;
  const size = blocked ? 0.6 : 1;
  const out = easeOutCubic(t);
  if (t < 0.12) disc(glow, x, y, 46 * size, WHITE, 0.9 * (1 - t / 0.12));
  glow.lineStyle(5, CORAL, 0.85 * fade).strokeCircle(x, y, (14 + 70 * out) * size);
  glow.lineStyle(2, MINT, 0.8 * fade).strokeCircle(x, y, (8 + 44 * out) * size);
  // Packets scattering.
  const count = blocked ? 6 : 12;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + hash01(i, 71) * 0.5;
    const d = (20 + 70 * hash01(i, 72)) * out * size;
    pixelBox(
      g,
      x + Math.cos(a) * d * dir - 3,
      y + Math.sin(a) * d - 3,
      6,
      6,
      i % 3 ? CORAL : MINT,
      fade,
    );
  }
  if (blocked) return;
  // The executed check node pops over the rival, with two small nodes around it.
  const pop = t < 0.3 ? easeOutBack(t / 0.3) : 1;
  node(g, glow, { x, y: y - 6 }, 34 * pop, 3, clamp01(fade * 2), 1);
  node(g, glow, { x: x - 34 * dir, y: y - 34 }, 18 * pop, 1, clamp01(fade * 1.6), 0);
  node(g, glow, { x: x + 30 * dir, y: y + 26 }, 18 * pop, 2, clamp01(fade * 1.6), 0);
}

export const WORKFLOW_THEME: SpecialTheme = {
  impactMs: 640,
  drawMove,
  drawImpact,
};
