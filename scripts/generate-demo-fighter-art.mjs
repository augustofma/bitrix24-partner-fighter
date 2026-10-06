#!/usr/bin/env node
/**
 * Generates the DEMO pixel-art spritesheet and portrait for FIGHTER_A.
 *
 * Purpose: prove the sprite pipeline (loading, frame slicing, animations, flip, anchoring,
 * scale, fallback). It is NOT final art. 100% original, drawn procedurally here.
 * Uses only Node built-ins (no dependencies): node scripts/generate-demo-fighter-art.mjs
 *
 * Output (see src/fighters/fighterA.ts for the matching config):
 *   public/fighters/fighter-a/sprite.png    8x4 grid of 96x112 frames (all 32 used, 0-31)
 *   public/fighters/fighter-a/portrait.png  120x150 bust
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'fighters', 'fighter-a');

const FRAME_W = 96;
const FRAME_H = 112;
const COLUMNS = 8;
const ROWS = 4;
/** Local y=0 (the feet) maps to this pixel row, so the soles touch the frame's bottom edge. */
const FOOT_RADIUS = 3;
const BASE_Y = FRAME_H - 1 - FOOT_RADIUS;
const CENTER_X = FRAME_W / 2;

const C = {
  outline: [27, 27, 47],
  gi: [42, 157, 143],
  giDark: [29, 110, 100],
  glove: [231, 111, 81],
  gloveDark: [170, 78, 56],
  skin: [244, 192, 149],
  hair: [61, 43, 31],
  band: [233, 196, 106],
  shoe: [52, 52, 74],
  eye: [27, 27, 47],
};

// ------------------------------------------------------------------ tiny raster canvas

class Canvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 4);
  }
  set(x, y, [r, g, b]) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const i = (y * this.width + x) * 4;
    this.data.set([r, g, b, 255], i);
  }
  /** Fills every pixel whose center satisfies `inside(x, y)` within the bounding box. */
  fill(minX, minY, maxX, maxY, color, inside, clip) {
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      for (let x = Math.floor(minX); x <= Math.ceil(maxX); x++) {
        if (clip && (x < clip.x0 || x >= clip.x1 || y < clip.y0 || y >= clip.y1)) continue;
        if (inside(x + 0.5, y + 0.5)) this.set(x, y, color);
      }
    }
  }
  disc(cx, cy, r, color, clip) {
    this.fill(
      cx - r,
      cy - r,
      cx + r,
      cy + r,
      color,
      (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r,
      clip,
    );
  }
  capsule(ax, ay, bx, by, r, color, clip) {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    this.fill(
      Math.min(ax, bx) - r,
      Math.min(ay, by) - r,
      Math.max(ax, bx) + r,
      Math.max(ay, by) + r,
      color,
      (x, y) => {
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
        return (x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2 <= r * r;
      },
      clip,
    );
  }
  rect(x, y, w, h, color, clip) {
    this.fill(x, y, x + w - 1, y + h - 1, color, () => true, clip);
  }
}

// ------------------------------------------------------------------ PNG encoder

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function encodePng(canvas) {
  const { width, height, data } = canvas;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    Buffer.from(data.subarray(y * width * 4, (y + 1) * width * 4)).copy(
      raw,
      y * (width * 4 + 1) + 1,
    );
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------ poses
// Local coordinates in native pixels: x forward (facing right), y up is negative, feet at 0.

const P = (x, y) => ({ x, y });
const IDLE = {
  head: P(3, -80),
  neck: P(2, -69),
  hip: P(0, -42),
  fe: P(11, -56),
  fh: P(17, -65),
  be: P(-3, -54),
  bh: P(8, -62),
  fk: P(7, -21),
  ff: P(10, 0),
  bk: P(-6, -21),
  bf: P(-10, 0),
};
/** Forward slide (px) applied at a 90 degree tip. */
const TIP_SHIFT = 36;
const withPose = (base, changes) => ({ ...base, ...changes });
/** Moves the upper body down by dy (breathing / bobbing). */
const bob = (pose, dy) => {
  const out = { ...pose };
  for (const k of ['head', 'neck', 'fe', 'fh', 'be', 'bh']) out[k] = P(pose[k].x, pose[k].y + dy);
  out.hip = P(pose.hip.x, pose.hip.y + dy / 2);
  return out;
};
/**
 * Tips the whole pose backwards by `deg` around the feet, sliding it forward so the body stays
 * inside the frame (the fighter is being knocked back anyway).
 */
const tipBack = (pose, deg) => {
  const a = (deg * Math.PI) / 180;
  const out = {};
  for (const [k, p] of Object.entries(pose)) {
    out[k] = P(
      p.x * Math.cos(a) + p.y * Math.sin(a) + Math.sin(a) * TIP_SHIFT,
      -p.x * Math.sin(a) + p.y * Math.cos(a),
    );
  }
  return out;
};

const CROUCH = {
  head: P(7, -57),
  neck: P(5, -47),
  hip: P(-1, -25),
  fe: P(14, -38),
  fh: P(19, -46),
  be: P(3, -36),
  bh: P(12, -43),
  fk: P(13, -17),
  ff: P(11, 0),
  bk: P(-9, -13),
  bf: P(-12, 0),
};
const PUNCH_WINDUP = withPose(IDLE, {
  head: P(1, -79),
  neck: P(0, -69),
  fe: P(4, -56),
  fh: P(8, -62),
  ff: P(12, 0),
  bf: P(-11, 0),
});
const PUNCH_EXTENDED = withPose(IDLE, {
  head: P(7, -79),
  neck: P(5, -69),
  fe: P(22, -65),
  fh: P(37, -66),
  be: P(-4, -55),
  bh: P(3, -61),
  fk: P(10, -21),
  ff: P(15, 0),
  bk: P(-8, -20),
  bf: P(-13, 0),
});
const KICK_WINDUP = withPose(IDLE, {
  head: P(0, -79),
  neck: P(0, -68),
  hip: P(0, -43),
  fk: P(13, -40),
  ff: P(10, -22),
  bk: P(-3, -22),
  bf: P(-5, 0),
});
const KICK_EXTENDED = withPose(IDLE, {
  head: P(-3, -77),
  neck: P(-2, -67),
  hip: P(0, -43),
  fe: P(7, -58),
  fh: P(12, -64),
  be: P(-10, -55),
  bh: P(-6, -62),
  fk: P(22, -44),
  ff: P(43, -43),
  bk: P(-3, -22),
  bf: P(-5, 0),
});
const BLOCK = {
  head: P(1, -75),
  neck: P(0, -66),
  hip: P(-2, -40),
  fe: P(13, -59),
  fh: P(15, -73),
  be: P(10, -54),
  bh: P(14, -69),
  fk: P(7, -20),
  ff: P(11, 0),
  bk: P(-8, -20),
  bf: P(-12, 0),
};
const HURT = {
  head: P(-10, -75),
  neck: P(-7, -66),
  hip: P(-1, -41),
  fe: P(4, -55),
  fh: P(1, -45),
  be: P(-15, -58),
  bh: P(-22, -65),
  fk: P(6, -21),
  ff: P(9, 0),
  bk: P(-7, -21),
  bf: P(-11, 0),
};
const LYING = {
  head: P(-39, -8),
  neck: P(-29, -8),
  hip: P(-2, -7),
  fe: P(-23, -3),
  fh: P(-14, -2),
  be: P(-32, -17),
  bh: P(-42, -20),
  fk: P(10, -13),
  ff: P(23, -3),
  bk: P(11, -7),
  bf: P(25, -2),
};
const VICTORY = withPose(IDLE, {
  fe: P(8, -82),
  fh: P(10, -98),
  be: P(-8, -56),
  bh: P(-3, -48),
  ff: P(12, 0),
  bf: P(-12, 0),
});

function walkPose(swing, dy) {
  const p = bob(IDLE, dy);
  p.fk = P(7 + swing * 4, -21);
  p.ff = P(10 + swing * 7, swing > 0 ? -3 : 0);
  p.bk = P(-6 - swing * 4, -21);
  p.bf = P(-10 - swing * 7, swing < 0 ? -3 : 0);
  return p;
}

const JUMP_RISE = withPose(IDLE, {
  fh: P(15, -74),
  fe: P(10, -62),
  fk: P(6, -22),
  ff: P(4, -3),
  bk: P(-4, -22),
  bf: P(-6, -1),
});
const JUMP_TUCK = {
  head: P(3, -80),
  neck: P(2, -70),
  hip: P(0, -45),
  fe: P(10, -59),
  fh: P(15, -67),
  be: P(-4, -56),
  bh: P(6, -63),
  fk: P(11, -35),
  ff: P(6, -21),
  bk: P(-1, -31),
  bf: P(-7, -20),
};

/** Frame order defines the indices used in src/fighters/fighterA.ts. */
const FRAMES = [
  // 0-3 idle
  bob(IDLE, 0),
  bob(IDLE, 1),
  bob(IDLE, 2),
  bob(IDLE, 1),
  // 4-7 walk
  walkPose(1, 1),
  walkPose(0, 0),
  walkPose(-1, 1),
  walkPose(0, 0),
  // 8-9 jump (rise, apex tuck); fall is frame 31
  JUMP_RISE,
  JUMP_TUCK,
  // 10 crouch
  CROUCH,
  // 11-13 punch (startup / active / recovery)
  PUNCH_WINDUP,
  PUNCH_EXTENDED,
  withPose(PUNCH_EXTENDED, { fe: P(16, -61), fh: P(26, -66) }),
  // 14-16 kick (startup / active / recovery)
  KICK_WINDUP,
  KICK_EXTENDED,
  withPose(KICK_WINDUP, { fk: P(16, -36), ff: P(18, -16) }),
  // 17 block
  BLOCK,
  // 18-19 hurt
  HURT,
  tipBack(HURT, 8),
  // 20-22 knockout (falling, falling, lying)
  tipBack(HURT, 30),
  tipBack(HURT, 60),
  LYING,
  // 23-25 victory
  bob(withPose(VICTORY, { fe: P(12, -70), fh: P(16, -84) }), 0),
  VICTORY,
  bob(VICTORY, 2),
  // 26-27 airPunch (startup / active, held through recovery)
  withPose(JUMP_TUCK, { fe: P(6, -58), fh: P(10, -65), be: P(-8, -56), bh: P(-4, -64) }),
  withPose(JUMP_TUCK, {
    head: P(6, -79),
    neck: P(4, -70),
    fe: P(18, -59),
    fh: P(31, -52),
    be: P(-7, -58),
    bh: P(-2, -64),
  }),
  // 28-29 airKick (startup / active, held through recovery)
  withPose(JUMP_TUCK, { fk: P(14, -44), ff: P(9, -27) }),
  {
    head: P(-3, -78),
    neck: P(-2, -69),
    hip: P(0, -45),
    fe: P(7, -60),
    fh: P(11, -67),
    be: P(-9, -58),
    bh: P(-14, -64),
    fk: P(15, -35),
    ff: P(35, -27),
    bk: P(-1, -33),
    bf: P(-8, -22),
  },
  // 30 crouchBlock: crouched with both forearms raised in front of the face
  withPose(CROUCH, {
    head: P(5, -54),
    neck: P(3, -46),
    fe: P(11, -40),
    fh: P(13, -53),
    be: P(8, -37),
    bh: P(12, -50),
  }),
  // 31 jump fall: legs reaching down for the landing, arms open (8 = rise, 9 = apex tuck)
  {
    head: P(3, -79),
    neck: P(2, -69),
    hip: P(0, -45),
    fe: P(12, -58),
    fh: P(18, -61),
    be: P(-7, -57),
    bh: P(-12, -60),
    fk: P(8, -25),
    ff: P(9, -6),
    bk: P(-4, -26),
    bf: P(-7, -8),
  },
];

// ------------------------------------------------------------------ drawing

function drawFighter(canvas, pose, ox, oy, scale = 1, clip) {
  const at = (p) => [ox + p.x * scale, oy + p.y * scale];
  const limb = (a, b, c, r, color) => {
    canvas.capsule(...at(a), ...at(b), r * scale, color, clip);
    canvas.capsule(...at(b), ...at(c), r * scale, color, clip);
  };
  const LIMB = 3;
  const TORSO = 6;
  const HEAD = 8;

  // Pass 1: silhouette outline.
  const o = 1.2;
  limb(pose.neck, pose.be, pose.bh, LIMB + o, C.outline);
  limb(pose.hip, pose.bk, pose.bf, LIMB + o, C.outline);
  limb(pose.neck, pose.fe, pose.fh, LIMB + o, C.outline);
  limb(pose.hip, pose.fk, pose.ff, LIMB + o, C.outline);
  canvas.capsule(...at(pose.neck), ...at(pose.hip), (TORSO + o) * scale, C.outline, clip);
  canvas.disc(...at(pose.head), (HEAD + o) * scale, C.outline, clip);
  for (const k of ['fh', 'bh']) canvas.disc(...at(pose[k]), (4 + o) * scale, C.outline, clip);
  for (const k of ['ff', 'bf'])
    canvas.disc(...at(pose[k]), (FOOT_RADIUS + o) * scale, C.outline, clip);

  // Pass 2: fills, back to front.
  limb(pose.neck, pose.be, pose.bh, LIMB, C.giDark);
  canvas.disc(...at(pose.bh), 4 * scale, C.gloveDark, clip);
  limb(pose.hip, pose.bk, pose.bf, LIMB, C.giDark);
  canvas.disc(...at(pose.bf), FOOT_RADIUS * scale, C.shoe, clip);
  canvas.capsule(...at(pose.neck), ...at(pose.hip), TORSO * scale, C.gi, clip);
  canvas.disc(...at(pose.head), HEAD * scale, C.skin, clip);
  // Hair (top half of the head) and headband with a tail flowing backwards.
  const [hx, hy] = at(pose.head);
  canvas.fill(
    hx - HEAD * scale,
    hy - HEAD * scale,
    hx + HEAD * scale,
    hy - 2 * scale,
    C.hair,
    (x, y) => (x - hx) ** 2 + (y - hy) ** 2 <= (HEAD * scale) ** 2,
    clip,
  );
  canvas.rect(hx - HEAD * scale, hy - 3 * scale, HEAD * 2 * scale, 2 * scale, C.band, clip);
  canvas.rect(hx - (HEAD + 4) * scale, hy - 2 * scale, 4 * scale, 2 * scale, C.band, clip);
  canvas.rect(hx + 3 * scale, hy, 2 * scale, 2 * scale, C.eye, clip); // eye (faces right)
  limb(pose.hip, pose.fk, pose.ff, LIMB, C.gi);
  canvas.disc(...at(pose.ff), FOOT_RADIUS * scale, C.shoe, clip);
  canvas.disc(...at(pose.hip), 3 * scale, C.glove, clip); // belt knot, above the legs
  limb(pose.neck, pose.fe, pose.fh, LIMB, C.gi);
  canvas.disc(...at(pose.fh), 4 * scale, C.glove, clip);
}

function buildSheet() {
  const sheet = new Canvas(FRAME_W * COLUMNS, FRAME_H * ROWS);
  FRAMES.forEach((pose, index) => {
    const x0 = (index % COLUMNS) * FRAME_W;
    const y0 = Math.floor(index / COLUMNS) * FRAME_H;
    const clip = { x0, y0, x1: x0 + FRAME_W, y1: y0 + FRAME_H };
    drawFighter(sheet, pose, x0 + CENTER_X, y0 + BASE_Y, 1, clip);
  });
  return sheet;
}

function buildPortrait() {
  const width = 120;
  const height = 150;
  const portrait = new Canvas(width, height);
  // Bust: the idle pose, zoomed so head and torso fill the image (legs are cropped).
  drawFighter(portrait, bob(IDLE, 0), width / 2 - 6, 228, 2.6, {
    x0: 0,
    y0: 0,
    x1: width,
    y1: height,
  });
  return portrait;
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'sprite.png'), encodePng(buildSheet()));
writeFileSync(join(OUT_DIR, 'portrait.png'), encodePng(buildPortrait()));
console.log(
  `Wrote ${FRAMES.length} frames (${FRAME_W}x${FRAME_H}) to ${join(OUT_DIR, 'sprite.png')}`,
);
console.log(`Wrote portrait to ${join(OUT_DIR, 'portrait.png')}`);
