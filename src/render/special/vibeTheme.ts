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
 * ALAIO VIBECODE!: coding on vibes. Charge: a little code editor pops up behind the hand and
 * fills line by line in syntax colors, a cursor blinks, synthwave "vibe" waves ripple around
 * the hand and the </> emblem forms in it. Execution: two neon sine waves (magenta and cyan)
 * braid from the hand to the end of the reach, carrying </> and { } tokens, with the emblem
 * riding at the head. Hit: a glitch burst: RGB-split slices, a pixel ring, tokens flying out
 * and the </> emblem. Dissipation: the code lines float up and break into pixels.
 */

const MAGENTA = 0xff2fb4;
const PURPLE = 0x7b2cbf;
const CYAN = 0x2fe0ff;
const WHITE = 0xffffff;
const EDITOR_BG = 0x140a2e;
/** Syntax-highlight colors of the code lines (keyword, string, function, comment...). */
const SYNTAX = [MAGENTA, 0xffd23f, CYAN, 0x7dffb0, 0xb48cff] as const;
const CODE_LINES = 5;
const TOKENS = 6;
const WAVE_SEGMENTS = 18;

/** "</>" drawn with strokes, centered on x, y. */
function tagGlyph(g: Graphics, x: number, y: number, size: number, color: number, alpha: number) {
  if (size < 3 || alpha <= 0) return;
  const h = size / 2;
  g.lineStyle(Math.max(2, size / 6), color, alpha);
  g.lineBetween(x - h * 0.3, y - h, x - h, y);
  g.lineBetween(x - h, y, x - h * 0.3, y + h);
  g.lineBetween(x + h * 0.3, y - h, x + h, y);
  g.lineBetween(x + h, y, x + h * 0.3, y + h);
  g.lineBetween(x + h * 0.15, y - h, x - h * 0.15, y + h);
}

/** "{ }" drawn with strokes, centered on x, y. */
function braceGlyph(g: Graphics, x: number, y: number, size: number, color: number, alpha: number) {
  if (size < 3 || alpha <= 0) return;
  const h = size / 2;
  g.lineStyle(Math.max(2, size / 7), color, alpha);
  for (const side of [-1, 1]) {
    const outer = x + side * h;
    const inner = x + side * h * 0.55;
    g.lineBetween(outer, y - h, inner, y - h);
    g.lineBetween(inner, y - h, inner, y + h);
    g.lineBetween(inner, y + h, outer, y + h);
    g.lineBetween(inner, y, inner - side * h * 0.3, y);
  }
}

/** A neon sine wave from `from` to `to` along x; `progress` cuts it short while it is cast. */
function vibeWave(
  g: Graphics,
  from: { x: number; y: number },
  toX: number,
  amplitude: number,
  phase: number,
  progress: number,
  width: number,
  color: number,
  alpha: number,
): void {
  const segments = Math.max(1, Math.round(WAVE_SEGMENTS * clamp01(progress)));
  g.lineStyle(width, color, alpha);
  let px = from.x;
  let py = from.y + Math.sin(phase) * amplitude;
  for (let i = 1; i <= segments; i++) {
    const k = i / WAVE_SEGMENTS;
    const x = lerp(from.x, toX, k);
    const y = from.y + Math.sin(phase + k * Math.PI * 3) * amplitude;
    g.lineBetween(px, py, x, y);
    px = x;
    py = y;
  }
}

/** Code editor floating behind the fighter's shoulder (never over the face), `lines` typed in. */
function editor(f: MoveFrame, lines: number, alpha: number, lift = 0): void {
  const { g, glow, fighter, direction: dir, frame } = f;
  const width = 66;
  const height = 52;
  const left = fighter.position.x - dir * 44 - (dir > 0 ? width : 0);
  const top = fighter.position.y - 186 - lift;
  pixelBox(glow, left - 3, top - 3, width + 6, height + 6, PURPLE, 0.35 * alpha);
  pixelBox(g, left, top, width, height, EDITOR_BG, 0.88 * alpha);
  // Title bar with the three window dots.
  g.fillStyle(PURPLE, alpha).fillRect(left, top, width, 7);
  [MAGENTA, 0xffd23f, 0x7dffb0].forEach((color, i) => {
    g.fillStyle(color, alpha).fillRect(left + 4 + i * 6, top + 2, 3, 3);
  });
  for (let i = 0; i < CODE_LINES; i++) {
    const typed = clamp01(lines - i);
    if (typed <= 0) break;
    const indent = (i % 3) * 6;
    const full = 18 + hash01(i, 13) * 30 - indent;
    const y = top + 11 + i * 8;
    g.fillStyle(SYNTAX[i % SYNTAX.length] ?? CYAN, alpha).fillRect(
      left + 5 + indent,
      y,
      Math.max(1, full * typed * 0.45),
      3,
    );
    g.fillStyle(WHITE, 0.75 * alpha).fillRect(
      left + 7 + indent + full * 0.45,
      y,
      Math.max(1, full * typed * 0.5),
      3,
    );
  }
  // Blinking cursor on the line being typed.
  if (Math.floor(frame / 4) % 2 === 0) {
    const line = Math.min(CODE_LINES - 1, Math.floor(lines));
    g.fillStyle(CYAN, alpha).fillRect(
      left + 5 + 50 * clamp01(lines - line),
      top + 10 + line * 8,
      2,
      5,
    );
  }
}

function drawMove(f: MoveFrame): void {
  const { g, glow, phase, t, frame, direction: dir, hand, front, box } = f;
  const height = box.bottom - box.top;

  if (phase === 'startup') {
    const grow = easeOutBack(clamp01(t / 0.6));
    editor(f, t * (CODE_LINES + 0.5), clamp01(t * 2.5));
    // Vibe ripples: rings pulsing out of the hand in the synthwave colors.
    for (let k = 0; k < 3; k++) {
      const p = (t * 1.6 + k / 3) % 1;
      glow
        .lineStyle(3, k % 2 ? CYAN : MAGENTA, 0.7 * (1 - p) * t)
        .strokeCircle(hand.x, hand.y, 8 + 56 * p);
    }
    disc(glow, hand.x, hand.y, 8 + 12 * t, MAGENTA, 0.3 + 0.35 * t);
    // A few tokens orbiting in.
    for (let i = 0; i < 3; i++) {
      const angle = frame * 0.18 + (i * Math.PI * 2) / 3;
      const r = 46 * (1 - t) + 14;
      const draw = i % 2 ? braceGlyph : tagGlyph;
      draw(
        g,
        hand.x + Math.cos(angle) * r,
        hand.y + Math.sin(angle) * r * 0.7,
        12,
        i ? CYAN : WHITE,
        t,
      );
    }
    f.emblem.show({ x: hand.x, y: hand.y, scale: 0.85 * grow, alpha: clamp01(t * 1.5) });
    return;
  }

  if (phase === 'active') {
    const cast = easeOutCubic(clamp01(t * 1.6));
    const amplitude = height * 0.4;
    const spin = frame * 0.5;
    // The braid: two glowing waves out of phase, white cores on top.
    vibeWave(glow, hand, front.x, amplitude, spin, cast, 16, MAGENTA, 0.5);
    vibeWave(glow, hand, front.x, amplitude, spin + Math.PI, cast, 16, CYAN, 0.5);
    vibeWave(g, hand, front.x, amplitude, spin, cast, 5, 0xffb3e6, 1);
    vibeWave(g, hand, front.x, amplitude, spin + Math.PI, cast, 5, 0xc8f7ff, 1);
    glow
      .lineStyle(14, PURPLE, 0.25)
      .lineBetween(hand.x, hand.y, lerp(hand.x, front.x, cast), hand.y);
    // Tokens riding the waves toward the target.
    for (let i = 0; i < TOKENS; i++) {
      const p = (t * 1.4 + i / TOKENS) % 1;
      if (p > cast) continue;
      const x = lerp(hand.x, front.x, p);
      const y = hand.y + Math.sin(spin + (i % 2) * Math.PI + p * Math.PI * 3) * amplitude;
      (i % 2 ? braceGlyph : tagGlyph)(g, x, y, 20, i % 3 ? WHITE : 0xffd23f, 1);
    }
    editor(f, CODE_LINES, 0.8);
    disc(glow, hand.x, hand.y, 26 + 6 * Math.sin(frame), MAGENTA, 0.45);
    disc(glow, hand.x, hand.y, 20 * (1 - t) + 10, WHITE, 0.6 * (1 - t));
    if (!f.impacting) {
      const head = lerp(hand.x, front.x, cast);
      f.emblem.show({ x: head, y: hand.y, scale: 1 + 0.08 * Math.sin(frame), alpha: 1 });
    }
    return;
  }

  // Recovery: the code drifts up and breaks into pixels; the waves die down.
  const fade = 1 - t;
  editor(f, CODE_LINES, fade, t * 24);
  vibeWave(glow, hand, front.x, height * 0.28 * fade, frame * 0.5, 1, 3, MAGENTA, 0.5 * fade);
  for (let i = 0; i < 10; i++) {
    const x = lerp(hand.x, front.x, hash01(i, 31)) + dir * hash01(i, 32) * 8;
    const y = box.top + hash01(i, 33) * height - t * (30 + 30 * hash01(i, 34));
    g.fillStyle(SYNTAX[i % SYNTAX.length] ?? CYAN, fade).fillRect(x - 2, y - 2, 4, 4);
  }
  if (!f.impacting)
    f.emblem.show({ x: front.x, y: front.y - t * 20, scale: 1.05 + 0.3 * t, alpha: fade });
}

function drawImpact(f: ImpactFrame): void {
  const { g, glow, x, y, t, blocked, direction: dir } = f;
  const out = easeOutCubic(t);
  const fade = 1 - t;
  const size = blocked ? 0.6 : 1;
  if (t < 0.14) disc(glow, x, y, 44 * size, WHITE, 0.95 * (1 - t / 0.14));
  disc(glow, x, y, (30 + 30 * out) * size, PURPLE, 0.45 * fade);
  // Glitch: horizontal slices shifted apart in magenta and cyan (an RGB split).
  const slices = blocked ? 3 : 6;
  for (let i = 0; i < slices; i++) {
    const sy = y - 40 * size + i * 14 * size + hash01(i, 41) * 6;
    const w = (50 + 90 * hash01(i, 42)) * size * (1 - 0.4 * t);
    const shift = (6 + 18 * out) * size;
    glow.fillStyle(MAGENTA, 0.7 * fade).fillRect(x - w / 2 - shift, sy, w, 6 * size);
    glow.fillStyle(CYAN, 0.7 * fade).fillRect(x - w / 2 + shift, sy + 3, w, 6 * size);
  }
  // Pixel ring: a growing square outline and a purple shockwave.
  const square = (10 + 60 * out) * size;
  glow.lineStyle(3, WHITE, 0.85 * fade).strokeRect(x - square, y - square, square * 2, square * 2);
  glow.lineStyle(5, MAGENTA, 0.8 * fade).strokeCircle(x, y, (16 + 110 * out) * size);
  // Tokens flying out.
  const tokens = blocked ? 3 : 7;
  for (let i = 0; i < tokens; i++) {
    const angle = (i / tokens) * Math.PI * 2 + 0.4;
    const distance = (20 + 70 * out) * size;
    (i % 2 ? braceGlyph : tagGlyph)(
      g,
      x + Math.cos(angle) * distance,
      y + Math.sin(angle) * distance * 0.8,
      14 * size,
      i % 3 ? CYAN : WHITE,
      fade,
    );
  }
  // A green "build passed" check rising (blocked: nothing compiles, no check).
  if (!blocked) {
    const cy = y - 34 - 30 * out;
    g.lineStyle(4, 0x7dffb0, clamp01(fade * 1.6));
    g.lineBetween(x + dir * 12 - 7, cy, x + dir * 12 - 2, cy + 6);
    g.lineBetween(x + dir * 12 - 2, cy + 6, x + dir * 12 + 9, cy - 7);
    const pop = t < 0.3 ? lerp(0.4, 1.35, easeOutBack(t / 0.3)) : 1.25;
    f.emblem.show({ x, y: y - 6, scale: pop, alpha: clamp01(fade * 2.2) });
  }
}

export const VIBE_THEME: SpecialTheme = {
  impactMs: 580,
  drawMove,
  drawImpact,
};
