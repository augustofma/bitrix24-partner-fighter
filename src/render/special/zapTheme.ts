import type { ImpactFrame, MoveFrame, SpecialTheme } from './specialTheme';
import {
  chatBubble,
  clamp01,
  easeOutBack,
  easeOutCubic,
  hash01,
  lerp,
  readReceipt,
  waveArc,
} from './vfxShapes';

/*
 * 24zap: a messaging app special. Charge: the app's bubble materializes in the hand while
 * "typing..." bubbles pop up around it and green energy gathers. Execution: the emblem is SENT
 * forward at the head of a stream of chat bubbles, with ")))" sending waves. Hit: a green
 * shockwave, bubbles bursting out in the logo's colors, blue "read" ticks and the 24zap badge.
 * Dissipation: the bubbles float up and fade.
 */

const GREEN = 0x25d366;
const LIGHT = 0x7dffb0;
const DARK = 0x0e6b3a;
const WHITE = 0xffffff;
/** The two small bubbles of the logo. */
const PINK = 0xff8ad8;
const YELLOW = 0xffb21f;
/** "Read" ticks. */
const RECEIPT = 0x34b7f1;
const BURST_COLORS = [GREEN, PINK, YELLOW, LIGHT] as const;

const STREAM_BUBBLES = 6;
const TYPING_SPOTS: readonly { dx: number; dy: number }[] = [
  { dx: -14, dy: -44 },
  { dx: 20, dy: -60 },
  { dx: 46, dy: -36 },
];

function drawMove(f: MoveFrame): void {
  const { g, glow, phase, t, frame, direction: dir, hand, front, box } = f;
  const height = box.bottom - box.top;

  if (phase === 'startup') {
    // Energy gathering: rings shrinking into the hand, and a growing core.
    for (let k = 0; k < 3; k++) {
      const p = (t * 1.5 + k / 3) % 1;
      const radius = 8 + 38 * (1 - p);
      glow.lineStyle(3, LIGHT, 0.7 * p).strokeCircle(hand.x, hand.y, radius);
    }
    glow.fillStyle(GREEN, 0.35 + 0.3 * t).fillCircle(hand.x, hand.y, 10 + 10 * t);
    // "typing..." bubbles popping up around the fighter.
    TYPING_SPOTS.forEach((spot, i) => {
      const appear = clamp01((t - i * 0.22) / 0.3);
      if (appear <= 0) return;
      const scale = easeOutBack(appear);
      chatBubble(
        g,
        hand.x + dir * spot.dx * scale,
        hand.y + spot.dy * scale,
        24 * scale,
        13 * scale,
        {
          fill: i === 1 ? WHITE : GREEN,
          contentColor: i === 1 ? DARK : WHITE,
          alpha: appear,
          tail: dir > 0 ? -1 : 1,
          content: 'dots',
          dots: 1 + (Math.floor(frame / 2) % 3),
        },
      );
    });
    f.emblem.show({ x: hand.x, y: hand.y, scale: 0.85 * easeOutBack(t), alpha: clamp01(t * 1.4) });
    return;
  }

  if (phase === 'active') {
    const sent = easeOutCubic(t);
    const head = { x: lerp(hand.x, front.x, sent), y: hand.y };
    // The stream: chat bubbles racing toward the target, each with motion streaks.
    for (let i = 0; i < STREAM_BUBBLES; i++) {
      const p = (t * 1.7 + i / STREAM_BUBBLES) % 1;
      const bx = lerp(hand.x, front.x, p);
      const by = box.top + 8 + hash01(i, 3) * (height - 16);
      glow.lineStyle(2, LIGHT, 0.5).lineBetween(bx - dir * 30, by, bx - dir * 12, by);
      chatBubble(g, bx, by, 20, 12, {
        fill: i % 3 === 2 ? WHITE : GREEN,
        contentColor: i % 3 === 2 ? GREEN : WHITE,
        alpha: 0.95,
        tail: dir > 0 ? -1 : 1,
      });
    }
    // ")))" sending waves rolling forward from the hand.
    for (let k = 0; k < 3; k++) {
      const p = (t + k / 3) % 1;
      waveArc(glow, hand.x, hand.y, 16 + p * 70, dir, 0.75, 3, LIGHT, 0.8 * (1 - p));
    }
    // Trail of the sent emblem, then the emblem itself at the head.
    for (let k = 1; k <= 3; k++) {
      glow.fillStyle(GREEN, 0.18 * (4 - k)).fillCircle(head.x - dir * k * 14, head.y, 16 - k * 3);
    }
    glow.fillStyle(WHITE, 0.5 * (1 - t)).fillCircle(hand.x, hand.y, 22 * (1 - t) + 6);
    if (!f.impacting)
      f.emblem.show({ x: head.x, y: head.y, scale: 1.05 + 0.1 * Math.sin(frame), alpha: 1 });
    return;
  }

  // Recovery: the conversation dissipates upward.
  const fade = 1 - t;
  for (let i = 0; i < 4; i++) {
    const bx = lerp(hand.x, front.x, 0.3 + 0.2 * i) + dir * hash01(i, 9) * 10;
    const by = box.top + 10 + hash01(i, 5) * height * 0.6 - t * 46;
    chatBubble(g, bx, by, 16, 10, {
      fill: i % 2 ? GREEN : WHITE,
      contentColor: i % 2 ? WHITE : GREEN,
      alpha: fade * 0.9,
      tail: dir > 0 ? -1 : 1,
      content: 'none',
    });
  }
  glow.lineStyle(3, LIGHT, 0.6 * fade).strokeCircle(front.x, front.y, 18 + t * 46);
  if (!f.impacting)
    f.emblem.show({ x: front.x, y: front.y - t * 18, scale: 1.1 + 0.35 * t, alpha: fade });
}

function drawImpact(f: ImpactFrame): void {
  const { g, glow, x, y, t, blocked, direction: dir } = f;
  const out = easeOutCubic(t);
  const fade = 1 - t;
  const size = blocked ? 0.6 : 1;
  if (t < 0.14) glow.fillStyle(WHITE, 0.9 * (1 - t / 0.14)).fillCircle(x, y, 30 * size);
  // Shockwave: a green ring and a thinner white one.
  glow.lineStyle(5, blocked ? DARK : GREEN, 0.9 * fade).strokeCircle(x, y, (12 + 86 * out) * size);
  glow.lineStyle(2, WHITE, 0.8 * fade).strokeCircle(x, y, (8 + 58 * out) * size);
  // Bubbles bursting out in the logo's colors.
  const count = blocked ? 4 : 8;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + 0.3;
    const distance = (18 + 64 * out) * size;
    const s = 1 - 0.5 * t;
    chatBubble(
      g,
      x + Math.cos(angle) * distance,
      y + Math.sin(angle) * distance * 0.8,
      16 * s,
      10 * s,
      {
        fill: BURST_COLORS[i % BURST_COLORS.length] ?? GREEN,
        alpha: fade,
        tail: Math.cos(angle) >= 0 ? -1 : 1,
        content: 'none',
      },
    );
  }
  // Delivered and read: blue double tick (a blocked one is only "sent": one grey tick).
  readReceipt(
    g,
    x + dir * 16,
    y - 28 - 34 * out,
    14,
    blocked ? 0xb8c2cc : RECEIPT,
    clamp01(fade * 1.5),
    !blocked,
  );
  if (blocked) return;
  // The 24zap badge pops on the opponent.
  const pop = t < 0.3 ? lerp(0.4, 1.35, easeOutBack(t / 0.3)) : 1.25;
  f.emblem.show({ x, y: y - 6, scale: pop, alpha: clamp01((1 - t) * 2.2) });
}

export const ZAP_THEME: SpecialTheme = {
  impactMs: 560,
  drawMove,
  drawImpact,
};
