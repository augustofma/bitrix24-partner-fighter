import type { ImpactFrame, MoveFrame, SpecialTheme } from './specialTheme';
import {
  clamp01,
  easeOutBack,
  easeOutCubic,
  hash01,
  lerp,
  partialPath,
  pointOnPath,
  tickRing,
} from './vfxShapes';

/*
 * Mindhub: an AI special, more "intelligent" than flashy. Charge: the brain-circuit sigil
 * lights up in the hand inside a rotating reticle, data bits converge and circuit traces are
 * drawn forward. Execution: a clean digital discharge along the traces, a neural mesh across
 * the reach with pulses running through it and the Mindhub emblem landing at the far end. Hit:
 * a square digital shockwave, branching neural lines with nodes and the emblem. Dissipation:
 * the mesh switches off node by node while the sigil expands and fades.
 */

const CYAN = 0x2fe0ff;
const BLUE = 0x258bff;
const WHITE = 0xffffff;
const NAVY = 0x07082c;
const MESH_NODES = 8;
const BITS = 10;
/** Circuit traces: vertical offsets (fraction of the hitbox height) of their two "steps". */
const TRACES: readonly (readonly [number, number])[] = [
  [-0.32, -0.18],
  [0, 0.08],
  [0.3, 0.2],
];

function trace(f: MoveFrame, index: number): { x: number; y: number }[] {
  const [a, b] = TRACES[index] ?? [0, 0];
  const { hand, front, box, direction: dir } = f;
  const height = box.bottom - box.top;
  const span = front.x - hand.x;
  // PCB-like: straight runs joined by right-angle steps, like the logo's circuit side.
  return [
    { x: hand.x, y: hand.y },
    { x: hand.x + span * 0.18, y: hand.y },
    { x: hand.x + span * 0.18, y: hand.y + a * height },
    { x: hand.x + span * 0.58, y: hand.y + a * height },
    { x: hand.x + span * 0.58, y: hand.y + b * height },
    { x: front.x - dir * 4, y: hand.y + b * height },
  ];
}

function meshNodes(f: MoveFrame): { x: number; y: number }[] {
  const { box, hand, front } = f;
  return Array.from({ length: MESH_NODES }, (_, i) => ({
    x: lerp(hand.x, front.x, (i + 0.5) / MESH_NODES),
    y: box.top + 6 + hash01(i, 21) * (box.bottom - box.top - 12),
  }));
}

function drawMove(f: MoveFrame): void {
  const { g, glow, phase, t, frame, hand, front } = f;

  if (phase === 'startup') {
    const grow = easeOutBack(clamp01(t / 0.7));
    g.fillStyle(NAVY, 0.75 * t).fillCircle(hand.x, hand.y, 24 * grow);
    tickRing(glow, hand.x, hand.y, 28 * grow, 8, frame * 0.14, 3, CYAN, 0.9 * t);
    tickRing(glow, hand.x, hand.y, 36 * grow, 12, -frame * 0.09, 2, BLUE, 0.6 * t);
    // Data bits converging into the sigil.
    for (let i = 0; i < BITS; i++) {
      const angle = hash01(i, 4) * Math.PI * 2;
      const distance = 64 * (1 - t) + 10;
      glow
        .fillStyle(i % 3 ? CYAN : WHITE, t)
        .fillRect(
          hand.x + Math.cos(angle) * distance - 2,
          hand.y + Math.sin(angle) * distance - 2,
          4,
          4,
        );
    }
    // Circuit traces being drawn toward the target.
    TRACES.forEach((_, i) => {
      const tip = partialPath(glow, trace(f, i), t, 2, CYAN, 0.75);
      if (tip) glow.fillStyle(WHITE, 0.9).fillCircle(tip.x, tip.y, 3);
    });
    f.glyph.show({ x: hand.x, y: hand.y, scale: 0.9 * grow, alpha: t, tint: CYAN, glow: true });
    f.glyph.show({ x: hand.x, y: hand.y, scale: 0.9 * grow, alpha: t });
    return;
  }

  const nodes = meshNodes(f);
  if (phase === 'active') {
    // The discharge: a beam along the middle trace, flickering a little, digital not organic.
    const flicker = 1 + 0.25 * Math.sin(frame * 2.3);
    glow.lineStyle(22 * flicker, BLUE, 0.3).lineBetween(hand.x, hand.y, front.x, hand.y);
    glow.lineStyle(10 * flicker, CYAN, 0.85).lineBetween(hand.x, hand.y, front.x, hand.y);
    glow.lineStyle(2, WHITE, 1).lineBetween(hand.x, hand.y, front.x, hand.y);
    // Circuits fully lit, with data packets racing along them.
    TRACES.forEach((_, i) => {
      const path = trace(f, i);
      partialPath(glow, path, 1, 2, CYAN, 0.9);
      const packet = pointOnPath(path, (t * 1.8 + i * 0.33) % 1);
      g.fillStyle(WHITE, 1).fillRect(packet.x - 3, packet.y - 3, 6, 6);
    });
    drawMesh(f, nodes, 1, frame);
    f.glyph.show({
      x: hand.x,
      y: hand.y,
      scale: 1.1 + 0.08 * Math.sin(frame),
      alpha: 1,
      tint: CYAN,
      glow: true,
    });
    f.glyph.show({ x: hand.x, y: hand.y, scale: 1.05, alpha: 1 });
    if (!f.impacting)
      f.emblem.show({ x: front.x, y: front.y, scale: 0.6 + 0.4 * easeOutBack(t), alpha: 1 });
    return;
  }

  // Recovery: the network switches off from the caster outward; the sigil expands and fades.
  const fade = 1 - t;
  TRACES.forEach((_, i) => partialPath(glow, trace(f, i), 1, 2, CYAN, 0.6 * fade));
  drawMesh(f, nodes, fade, frame, t);
  f.glyph.show({
    x: hand.x,
    y: hand.y,
    scale: 1.1 + 0.6 * t,
    alpha: fade * 0.9,
    tint: CYAN,
    glow: true,
  });
  if (!f.impacting) f.emblem.show({ x: front.x, y: front.y, scale: 1 + 0.2 * t, alpha: fade });
}

/** Neural mesh: nodes linked to their next two neighbours; `off` switches them off in order. */
function drawMesh(
  f: MoveFrame,
  nodes: readonly { x: number; y: number }[],
  alpha: number,
  frame: number,
  off = 0,
): void {
  const { g, glow } = f;
  nodes.forEach((node, i) => {
    if (i / nodes.length < off) return;
    for (const link of [nodes[i + 1], nodes[i + 2]]) {
      if (link)
        glow
          .lineStyle(1.5, i % 2 ? BLUE : CYAN, 0.7 * alpha)
          .lineBetween(node.x, node.y, link.x, link.y);
    }
    const pulse = 0.5 + 0.5 * Math.sin(frame * 0.6 + i);
    glow.fillStyle(CYAN, 0.35 * alpha).fillCircle(node.x, node.y, 7 + 3 * pulse);
    g.fillStyle(WHITE, alpha).fillCircle(node.x, node.y, 3);
  });
}

function drawImpact(f: ImpactFrame): void {
  const { g, glow, x, y, t, blocked } = f;
  const out = easeOutCubic(t);
  const fade = 1 - t;
  const size = blocked ? 0.6 : 1;
  if (t < 0.12) glow.fillStyle(WHITE, 0.9 * (1 - t / 0.12)).fillCircle(x, y, 28 * size);
  // Square digital shockwave: a diamond and a square, growing apart.
  const diamond = (12 + 84 * out) * size;
  glow.lineStyle(4, CYAN, 0.9 * fade);
  glow.strokePoints(
    [
      { x, y: y - diamond },
      { x: x + diamond, y },
      { x, y: y + diamond },
      { x: x - diamond, y },
    ],
    true,
  );
  const square = (10 + 56 * out) * size;
  glow.lineStyle(2, WHITE, 0.8 * fade).strokeRect(x - square, y - square, square * 2, square * 2);
  // Neural burst: lines out from the point that turn at a right angle and end on a node.
  const branches = blocked ? 4 : 8;
  for (let i = 0; i < branches; i++) {
    const angle = (i / branches) * Math.PI * 2;
    const reach = (22 + 52 * out) * size;
    const elbow = { x: x + Math.cos(angle) * reach, y: y + Math.sin(angle) * reach };
    const turn = (i % 2 ? 1 : -1) * 14 * out * size;
    const end = { x: elbow.x - Math.sin(angle) * turn, y: elbow.y + Math.cos(angle) * turn };
    glow.lineStyle(2, i % 2 ? BLUE : CYAN, fade).lineBetween(x, y, elbow.x, elbow.y);
    glow.lineBetween(elbow.x, elbow.y, end.x, end.y);
    g.fillStyle(WHITE, fade).fillCircle(end.x, end.y, 3);
  }
  // Binary bits flying off.
  for (let i = 0; i < (blocked ? 6 : 14); i++) {
    const angle = hash01(i, 7) * Math.PI * 2;
    const distance = (14 + 80 * hash01(i, 8) * out) * size;
    g.fillStyle(i % 3 ? CYAN : WHITE, fade).fillRect(
      x + Math.cos(angle) * distance - 2,
      y + Math.sin(angle) * distance - 2,
      4,
      4,
    );
  }
  if (blocked) return;
  const pop = t < 0.3 ? lerp(0.4, 1.3, easeOutBack(t / 0.3)) : 1.2;
  f.emblem.show({ x, y: y - 6, scale: pop, alpha: clamp01((1 - t) * 2.2) });
}

export const MIND_THEME: SpecialTheme = {
  impactMs: 620,
  drawMove,
  drawImpact,
};
