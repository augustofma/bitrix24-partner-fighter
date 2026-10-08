import type { ImpactFrame, MoveFrame, SpecialTheme } from './specialTheme';
import { clamp01, disc, easeOutBack, easeOutCubic, hash01, lerp, type Graphics } from './vfxShapes';

/*
 * ALAIO STRIKE!: a final boss's over-the-top storm. Charge: the fist goes up, sparks crackle on
 * it and a fat storm cloud with angry cartoon eyes rolls over the whole screen while the stage
 * darkens. Execution: a white flash, then lightning everywhere: bolts from the cloud to the
 * floor across the whole visible stage (the move hits anywhere), with a thick bolt into the
 * fist and sparks where they land. Hit: a bolt right onto the victim, an electric burst and
 * sparks (a block: a smaller crackle on the guard). Dissipation: the cloud drifts off, smoke.
 *
 * The move's hitbox covers the whole arena, so `hand`/`front`/`box` are far off-stage: this
 * theme draws around the fighter and over the camera's view instead.
 */

const CLOUD = 0x2b2440;
const CLOUD_LIGHT = 0x4b4170;
const CLOUD_RIM = 0x8a7fc0;
const BOLT = 0x7df9ff;
const BOLT_HOT = 0xfff27a;
const WHITE = 0xffffff;
const DARK = 0x07051a;
/** The raised fist of the ALAIO STRIKE! pose, from the fighter's feet (facing right). */
const FIST = { x: 52, y: -168 };
/** Visible stage when the camera is unknown (tests): one screen around the fighter. */
const FALLBACK_HALF_VIEW = 480;
const VIEW_HEIGHT = 540;
/**
 * The cloud bank hangs from the top of the view (behind the HUD bars) down to here: its puffy
 * underside and the angry face sit just below the HUD (health bars and ROUND end ~100 px).
 */
const CLOUD_BOTTOM = 160;
/** How dark the stage gets under the storm. */
const STORM_DARK = 0.45;
const BOLTS = 9;
const SEGMENTS = 9;

interface View {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** The camera's visible world rectangle (or a screen around the fighter without a camera). */
function viewOf(g: Graphics, aroundX: number): View {
  const scene = (g as { scene?: { cameras?: { main?: { worldView?: View & object } } } }).scene;
  const view = scene?.cameras?.main?.worldView as
    { x: number; y: number; width: number; height: number } | undefined;
  if (view && typeof view.x === 'number' && view.width > 0) {
    return { left: view.x, right: view.x + view.width, top: view.y, bottom: view.y + view.height };
  }
  return {
    left: aroundX - FALLBACK_HALF_VIEW,
    right: aroundX + FALLBACK_HALF_VIEW,
    top: 0,
    bottom: VIEW_HEIGHT,
  };
}

/** A jagged bolt from (x0, y0) to (x1, y1): glow, body and a hot core. */
function bolt(
  g: Graphics,
  glow: Graphics,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  seed: number,
  width: number,
  alpha: number,
): void {
  if (alpha <= 0) return;
  const jag = Math.max(10, Math.abs(y1 - y0) * 0.09);
  let px = x0;
  let py = y0;
  for (let i = 1; i <= SEGMENTS; i++) {
    const s = i / SEGMENTS;
    const x = i === SEGMENTS ? x1 : lerp(x0, x1, s) + (hash01(seed, i) - 0.5) * 2 * jag;
    const y = lerp(y0, y1, s);
    glow.lineStyle(width * 3.2, BOLT, 0.35 * alpha).lineBetween(px, py, x, y);
    g.lineStyle(width, BOLT, alpha).lineBetween(px, py, x, y);
    g.lineStyle(Math.max(1, width * 0.4), WHITE, alpha).lineBetween(px, py, x, y);
    // A short fork now and then.
    if (i > 1 && i < SEGMENTS - 1 && hash01(seed, i + 40) > 0.62) {
      const fx = x + (hash01(seed, i + 80) - 0.5) * jag * 4;
      const fy = y + jag * (1 + hash01(seed, i + 90));
      g.lineStyle(Math.max(1, width * 0.45), BOLT, 0.8 * alpha).lineBetween(x, y, fx, fy);
    }
    px = x;
    py = y;
  }
}

/** Sparks flying off a point (pixel squares on short arcs). */
function sparks(
  g: Graphics,
  x: number,
  y: number,
  seed: number,
  count: number,
  spread: number,
  t: number,
  alpha: number,
): void {
  for (let i = 0; i < count; i++) {
    const angle = hash01(seed, i) * Math.PI * 2;
    const d = spread * (0.3 + 0.7 * hash01(seed, i + 20)) * easeOutCubic(t);
    const size = 2 + 2 * hash01(seed, i + 30);
    g.fillStyle(i % 3 ? BOLT : BOLT_HOT, alpha);
    g.fillRect(
      x + Math.cos(angle) * d - size / 2,
      y + Math.sin(angle) * d * 0.7 - size / 2,
      size,
      size,
    );
  }
}

/**
 * The storm cloud bank over the view: a dark mass from the top of the screen with a puffy,
 * bumpy underside (overlapping pixel puffs, lighter tops for volume), lit from below by the
 * lightning, and a big angry cartoon face in the middle (the "avacalhado" touch). `cover` 0..1
 * is how much of the width it has rolled over (it comes in from both sides of the centre).
 */
function stormCloud(
  g: Graphics,
  glow: Graphics,
  view: View,
  centerX: number,
  cover: number,
  alpha: number,
  frame: number,
  lit: number,
): void {
  if (cover <= 0 || alpha <= 0) return;
  const top = view.top;
  const bottom = view.top + CLOUD_BOTTOM;
  const reach = ((view.right - view.left) / 2 + 60) * cover;
  const left = Math.max(view.left, centerX - reach);
  const right = Math.min(view.right, centerX + reach);
  if (right <= left) return;
  // The mass above the puffs.
  g.fillStyle(CLOUD, alpha).fillRect(left, top, right - left, bottom - top - 34);
  // Puffs along the underside: big dark ones, a lighter cap on each for volume.
  const step = 52;
  const first = Math.floor(left / step) * step;
  for (let x = first; x <= right + step; x += step) {
    const i = Math.round(x / step);
    const r = 30 + 14 * hash01(i, 5) + 2 * Math.sin(frame * 0.15 + i);
    const cx = Math.min(right - r * 0.6, Math.max(left + r * 0.6, x + (hash01(i, 6) - 0.5) * 18));
    const cy = bottom - r * 0.9 + 8 * hash01(i, 7);
    disc(g, cx, cy, r, CLOUD, alpha);
    // Volume: a soft lighter swell on the upper side of each puff, and a thin rim of light.
    disc(g, cx - r * 0.15, cy - r * 0.3, r * 0.8, CLOUD_LIGHT, alpha * 0.35);
    g.fillStyle(CLOUD_RIM, alpha * 0.35).fillRect(cx - r * 0.5, cy - r * 0.95, r * 0.7, 2);
    // Lit from below by the bolts.
    if (lit > 0)
      glow.fillStyle(BOLT, 0.4 * lit * alpha).fillRect(cx - r * 0.7, cy + r * 0.62, r * 1.4, 5);
  }

  // Angry face, once the middle has rolled in: brows down, eyes glaring at the stage.
  if (cover < 0.35) return;
  const face = clamp01((cover - 0.35) / 0.4) * alpha;
  const fy = bottom - 32;
  for (const side of [-1, 1]) {
    const ex = centerX + side * 38;
    g.fillStyle(WHITE, face).fillRect(ex - 14, fy - 7, 28, 16);
    g.fillStyle(DARK, face).fillRect(ex - 5 - side * 3, fy - 1, 10, 10);
    g.lineStyle(7, DARK, face).lineBetween(ex - side * 20, fy - 20, ex + side * 15, fy - 8);
  }
  // A grumpy zig-zag mouth.
  g.lineStyle(4, DARK, face);
  for (let i = 0; i < 4; i++) {
    const x0 = centerX - 24 + i * 12;
    g.lineBetween(x0, fy + 22 + (i % 2) * 6, x0 + 12, fy + 22 + ((i + 1) % 2) * 6);
  }
}

function drawMove(f: MoveFrame): void {
  const { g, glow, phase, t, frame, fighter, direction: dir } = f;
  const fist = { x: fighter.position.x + dir * FIST.x, y: fighter.position.y + FIST.y };
  const floor = fighter.position.y;
  const view = viewOf(g, fighter.position.x);
  const centerX = (view.left + view.right) / 2;

  if (phase === 'startup') {
    // The stage darkens as the storm gathers.
    g.fillStyle(DARK, STORM_DARK * t).fillRect(
      view.left,
      view.top,
      view.right - view.left,
      view.bottom - view.top,
    );
    stormCloud(g, glow, view, centerX, easeOutCubic(t), 1, frame, 0);
    // Electricity crackling on the raised fist, growing.
    disc(glow, fist.x, fist.y, 8 + 8 * t, BOLT, 0.25 + 0.2 * t);
    for (let i = 0; i < 3; i++) {
      if (hash01(frame, i) > 0.35 + 0.4 * (1 - t)) continue;
      const a = hash01(frame, i + 9) * Math.PI * 2;
      const len = 14 + 22 * t;
      bolt(
        g,
        glow,
        fist.x,
        fist.y,
        fist.x + Math.cos(a) * len,
        fist.y + Math.sin(a) * len,
        frame * 7 + i,
        2,
        1,
      );
    }
    sparks(g, fist.x, fist.y, frame, 6, 26 * t, 0.6, 0.9);
    // Last moment: a thin feeler from the fist to the cloud.
    if (t > 0.7) {
      bolt(
        g,
        glow,
        fist.x,
        fist.y,
        fist.x + dir * 30,
        view.top + CLOUD_BOTTOM,
        frame,
        2,
        (t - 0.7) / 0.3,
      );
    }
    return;
  }

  if (phase === 'active') {
    // White flash, then the whole stage under lightning.
    const flash = clamp01(1 - t * 2.5);
    if (flash > 0) {
      glow
        .fillStyle(WHITE, 0.55 * flash)
        .fillRect(view.left, view.top, view.right - view.left, view.bottom - view.top);
    }
    g.fillStyle(DARK, STORM_DARK).fillRect(
      view.left,
      view.top,
      view.right - view.left,
      view.bottom - view.top,
    );
    stormCloud(g, glow, view, centerX, 1, 1, frame, 1);
    const width = view.right - view.left;
    // The bolts jump around every couple of frames: lightning, not lasers.
    const beat = Math.floor(frame / 2);
    for (let i = 0; i < BOLTS; i++) {
      const x = view.left + ((i + 0.2 + 0.6 * hash01(beat, i)) / BOLTS) * width;
      bolt(
        g,
        glow,
        x,
        view.top + CLOUD_BOTTOM - 8,
        x + (hash01(beat, i + 50) - 0.5) * 60,
        floor,
        beat * 13 + i,
        4,
        1,
      );
      sparks(g, x, floor - 4, beat + i * 3, 5, 30, 0.7, 0.9);
      glow.fillStyle(BOLT, 0.35).fillRect(x - 24, floor - 6, 48, 8);
    }
    // The big one: from the cloud into the fist.
    bolt(g, glow, fist.x, fist.y, fist.x + dir * 20, view.top + CLOUD_BOTTOM - 8, beat, 7, 1);
    disc(glow, fist.x, fist.y, 14, BOLT, 0.35);
    return;
  }

  // Recovery: the storm rolls off and the stage brightens, a little smoke rises.
  const fade = 1 - t;
  g.fillStyle(DARK, STORM_DARK * fade).fillRect(
    view.left,
    view.top,
    view.right - view.left,
    view.bottom - view.top,
  );
  stormCloud(g, glow, view, centerX, 1 - easeOutCubic(t) * 0.6, fade, frame, 0);
  for (let i = 0; i < 6; i++) {
    const x = lerp(view.left, view.right, (i + 0.5) / 6);
    const rise = 40 * t + 10 * hash01(i, 7);
    disc(g, x, floor - 10 - rise, 10 + 12 * t, CLOUD_LIGHT, 0.5 * fade);
  }
  sparks(g, fist.x, fist.y, frame, 4, 18, 0.5, fade);
}

function drawImpact(f: ImpactFrame): void {
  const { g, glow, x, y, t, blocked } = f;
  const fade = 1 - t;
  const size = blocked ? 0.55 : 1;
  const seed = Math.floor(t * 20);
  if (!blocked) {
    // The bolt that finds the victim, straight from the sky.
    bolt(g, glow, x + (hash01(seed, 3) - 0.5) * 30, y - 420, x, y, seed, 8, clamp01(fade * 1.6));
    if (t < 0.15) disc(glow, x, y, 70, WHITE, 0.9 * (1 - t / 0.15));
  }
  // Electric burst: rings and crackles around the contact.
  const out = easeOutBack(clamp01(t * 1.4));
  glow.lineStyle(5, BOLT, 0.8 * fade).strokeCircle(x, y, (16 + 70 * out) * size);
  glow.lineStyle(2, BOLT_HOT, 0.8 * fade).strokeCircle(x, y, (8 + 44 * out) * size);
  const arcs = blocked ? 4 : 8;
  for (let i = 0; i < arcs; i++) {
    const a = (i / arcs) * Math.PI * 2 + hash01(seed, i) * 0.6;
    const len = (30 + 40 * hash01(seed, i + 10)) * size;
    bolt(g, glow, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, seed * 31 + i, 2, fade);
  }
  sparks(g, x, y, seed + 5, blocked ? 6 : 14, 90 * size, t, fade);
}

export const LIGHTNING_THEME: SpecialTheme = {
  impactMs: 700,
  drawMove,
  drawImpact,
};
