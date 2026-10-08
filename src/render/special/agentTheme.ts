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
 * GPTMAKER!: building an AI agent on the spot. Charge: a blueprint grid is projected in front,
 * gears spin around the hand and the agent's building blocks fly in and snap together into a
 * little robot over the hand, eyes lighting up, while sparkles twinkle. Execution: the robot
 * fires an amber energy beam with tokens racing along it, over a workflow of linked nodes (the
 * agent's flow) that lights up toward the target, with the GPTMAKER emblem at the far end. Hit:
 * an amber starburst, a gear ring, blocks scattering and four-point sparkles. Dissipation: the
 * robot comes apart block by block and the blueprint fades.
 */

const AMBER = 0xffb21f;
const ORANGE = 0xff6e1e;
const NAVY = 0x10183c;
const STEEL = 0x24346e;
const CYAN = 0x2fe0ff;
const WHITE = 0xffffff;
const BLUEPRINT = 0x258bff;
const FLOW_NODES = 4;
const SPARKLES = 5;

/** The robot's parts: offset from its center and size, in the order they snap in. */
const PARTS: readonly { dx: number; dy: number; w: number; h: number; color: number }[] = [
  { dx: 0, dy: 10, w: 26, h: 14, color: NAVY }, // body
  { dx: 0, dy: -8, w: 32, h: 22, color: NAVY }, // head
  { dx: -19, dy: -8, w: 6, h: 12, color: NAVY }, // ears
  { dx: 19, dy: -8, w: 6, h: 12, color: NAVY },
  { dx: 0, dy: -24, w: 4, h: 8, color: NAVY }, // antenna
];

/** Four-point sparkle from two thin crossed rectangles and a core. */
function sparkle(g: Graphics, x: number, y: number, size: number, color: number, alpha: number) {
  if (size < 2 || alpha <= 0) return;
  g.fillStyle(color, alpha);
  g.fillRect(x - size, y - 1, size * 2, 2);
  g.fillRect(x - 1, y - size, 2, size * 2);
  g.fillRect(x - size / 3, y - size / 3, (size * 2) / 3, (size * 2) / 3);
}

/** The agent robot, assembled up to `built` (0..1 over its parts), centered on x, y. */
function robot(
  g: Graphics,
  glow: Graphics,
  x: number,
  y: number,
  built: number,
  alpha: number,
  frame: number,
  scatter = 0,
): void {
  PARTS.forEach((part, i) => {
    const snap = clamp01(built * PARTS.length - i);
    if (snap <= 0) return;
    // Parts fly in from scattered spots and snap; when dismantling they fall away.
    const fromX = (hash01(i, 51) - 0.5) * 90;
    const fromY = -40 - hash01(i, 52) * 40;
    const k = easeOutCubic(snap);
    const px = x + part.dx + fromX * (1 - k) + (hash01(i, 53) - 0.5) * 60 * scatter;
    const py = y + part.dy + fromY * (1 - k) + 50 * scatter * scatter;
    pixelBox(g, px - part.w / 2, py - part.h / 2, part.w, part.h, part.color, alpha * k);
  });
  if (built < 1) return;
  // Face plate, eyes and antenna light once the head is in.
  const ox = (hash01(1, 53) - 0.5) * 60 * scatter;
  const oy = 50 * scatter * scatter;
  pixelBox(g, x - 13 + ox, y - 16 + oy, 26, 16, STEEL, alpha);
  const blink = Math.floor(frame / 9) % 6 === 0 ? 0.3 : 1;
  for (const side of [-1, 1]) {
    disc(glow, x + side * 6 + ox, y - 9 + oy, 6, CYAN, 0.5 * alpha * blink);
    g.fillStyle(CYAN, alpha).fillRect(x + side * 6 - 3 + ox, y - 12 + oy, 6, 6 * blink + 0.5);
  }
  g.fillStyle(WHITE, alpha).fillRect(x - 6 + ox, y - 3 + oy, 12, 2);
  disc(glow, x + ox, y - 28 + oy, 5, AMBER, 0.8 * alpha);
}

/** Blueprint grid projected over the reach of the move. */
function blueprint(f: MoveFrame, alpha: number): void {
  const { glow, box } = f;
  if (alpha <= 0) return;
  const cell = 16;
  glow.lineStyle(1, BLUEPRINT, 0.35 * alpha);
  for (let x = box.left; x <= box.right + 0.5; x += cell)
    glow.lineBetween(x, box.top, x, box.bottom);
  for (let y = box.top; y <= box.bottom + 0.5; y += cell)
    glow.lineBetween(box.left, y, box.right, y);
  glow
    .lineStyle(2, CYAN, 0.6 * alpha)
    .strokeRect(box.left, box.top, box.right - box.left, box.bottom - box.top);
}

/** The agent's flow: linked nodes across the reach, lit up to `lit` (0..1). */
function flow(f: MoveFrame, lit: number, alpha: number): void {
  const { g, glow, hand, front, box } = f;
  const height = box.bottom - box.top;
  let prev: { x: number; y: number } | null = null;
  for (let i = 0; i < FLOW_NODES; i++) {
    const node = {
      x: lerp(hand.x, front.x, (i + 0.6) / FLOW_NODES),
      y: box.top + 10 + (i % 2 ? 0.75 : 0.2) * (height - 20),
    };
    const on = lit * FLOW_NODES > i;
    if (prev) {
      glow.lineStyle(2, on ? AMBER : BLUEPRINT, (on ? 0.9 : 0.4) * alpha);
      glow.lineBetween(prev.x, prev.y, node.x, prev.y);
      glow.lineBetween(node.x, prev.y, node.x, node.y);
    }
    pixelBox(g, node.x - 8, node.y - 6, 16, 12, on ? AMBER : STEEL, alpha);
    g.fillStyle(on ? NAVY : CYAN, alpha).fillRect(node.x - 4, node.y - 1, 8, 2);
    prev = node;
  }
}

function drawMove(f: MoveFrame): void {
  const { g, glow, phase, t, frame, hand, front, box, direction: dir } = f;
  // The robot floats behind his shoulder, never over his face.
  const bot = { x: f.fighter.position.x - dir * 66, y: f.fighter.position.y - 160 };

  if (phase === 'startup') {
    blueprint(f, clamp01(t * 2));
    tickRing(glow, hand.x, hand.y, 22, 8, frame * 0.2, 4, AMBER, 0.9 * t);
    tickRing(glow, hand.x, hand.y, 32, 12, -frame * 0.12, 2, ORANGE, 0.6 * t);
    disc(glow, hand.x, hand.y, 8 + 10 * t, AMBER, 0.3 + 0.3 * t);
    robot(g, glow, bot.x, bot.y, clamp01(t * 1.15), 1, frame);
    for (let i = 0; i < SPARKLES; i++) {
      const twinkle = 0.5 + 0.5 * Math.sin(frame * 0.5 + i * 1.7);
      sparkle(
        glow,
        lerp(box.left, box.right, hash01(i, 61)),
        box.top - 8 + hash01(i, 62) * 30,
        5 + 4 * twinkle,
        i % 2 ? WHITE : AMBER,
        t * twinkle,
      );
    }
    f.emblem.show({ x: hand.x, y: hand.y, scale: 0.8 * easeOutBack(t), alpha: clamp01(t * 1.4) });
    return;
  }

  if (phase === 'active') {
    const cast = easeOutCubic(clamp01(t * 1.8));
    const end = lerp(hand.x, front.x, cast);
    blueprint(f, 0.6);
    flow(f, cast, 1);
    // The beam from the robot's hand: wide amber glow, orange body, white core.
    const pulse = 1 + 0.2 * Math.sin(frame * 1.7);
    glow.lineStyle(38 * pulse, ORANGE, 0.35).lineBetween(hand.x, hand.y, end, hand.y);
    glow.lineStyle(18 * pulse, AMBER, 0.9).lineBetween(hand.x, hand.y, end, hand.y);
    g.lineStyle(5, WHITE, 1).lineBetween(hand.x, hand.y, end, hand.y);
    // Tokens racing along it.
    for (let i = 0; i < 6; i++) {
      const p = (t * 2 + i / 6) % 1;
      if (p > cast) continue;
      g.fillStyle(i % 2 ? WHITE : NAVY, 1).fillRect(lerp(hand.x, front.x, p) - 4, hand.y - 4, 8, 8);
    }
    tickRing(glow, hand.x, hand.y, 24, 8, frame * 0.35, 4, AMBER, 0.9);
    robot(g, glow, bot.x, bot.y, 1, 1, frame);
    sparkle(glow, end, hand.y, 12 + 4 * Math.sin(frame), WHITE, 0.9);
    if (!f.impacting)
      f.emblem.show({ x: front.x, y: front.y, scale: 0.6 + 0.45 * easeOutBack(t), alpha: 1 });
    return;
  }

  // Recovery: the robot comes apart and the blueprint switches off.
  const fade = 1 - t;
  blueprint(f, 0.6 * fade);
  flow(f, 1 - t, fade);
  robot(g, glow, bot.x, bot.y, 1, fade, frame, t);
  tickRing(glow, hand.x, hand.y, 24 + 20 * t, 8, frame * 0.1, 3, AMBER, 0.6 * fade);
  if (!f.impacting)
    f.emblem.show({ x: front.x, y: front.y - t * 18, scale: 1.05 + 0.3 * t, alpha: fade });
}

function drawImpact(f: ImpactFrame): void {
  const { g, glow, x, y, t, blocked } = f;
  const out = easeOutCubic(t);
  const fade = 1 - t;
  const size = blocked ? 0.6 : 1;
  if (t < 0.16) disc(glow, x, y, 46 * size, WHITE, 0.95 * (1 - t / 0.16));
  disc(glow, x, y, (28 + 34 * out) * size, AMBER, 0.4 * fade);
  // Starburst rays.
  const rays = blocked ? 6 : 12;
  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2;
    const inner = (12 + 40 * out) * size;
    const outer = inner + (34 + 40 * (i % 2)) * size * (1 - 0.5 * t);
    glow.lineStyle(i % 2 ? 2 : 4, i % 2 ? WHITE : AMBER, 0.9 * fade);
    glow.lineBetween(
      x + Math.cos(angle) * inner,
      y + Math.sin(angle) * inner,
      x + Math.cos(angle) * outer,
      y + Math.sin(angle) * outer,
    );
  }
  // A gear ring growing out.
  tickRing(glow, x, y, (14 + 70 * out) * size, 10, t * 3, 5, ORANGE, 0.85 * fade);
  // Building blocks scattering.
  const blocks = blocked ? 3 : 7;
  for (let i = 0; i < blocks; i++) {
    const angle = hash01(i, 71) * Math.PI * 2;
    const distance = (16 + 74 * hash01(i, 72) * out) * size;
    const s = 10 * size * (1 - 0.4 * t);
    pixelBox(
      g,
      x + Math.cos(angle) * distance - s / 2,
      y + Math.sin(angle) * distance - s / 2 + 30 * t * t,
      s,
      s,
      i % 2 ? NAVY : AMBER,
      fade,
    );
  }
  for (let i = 0; i < (blocked ? 2 : 4); i++) {
    const angle = (i / 4) * Math.PI * 2 + 0.8;
    sparkle(
      glow,
      x + Math.cos(angle) * (30 + 40 * out) * size,
      y + Math.sin(angle) * (30 + 40 * out) * size,
      (8 + 6 * Math.sin(t * 9 + i)) * size,
      WHITE,
      fade,
    );
  }
  if (blocked) return;
  const pop = t < 0.3 ? lerp(0.4, 1.35, easeOutBack(t / 0.3)) : 1.25;
  f.emblem.show({ x, y: y - 6, scale: pop, alpha: clamp01(fade * 2.2) });
}

export const AGENT_THEME: SpecialTheme = {
  impactMs: 640,
  drawMove,
  drawImpact,
};
