import Phaser from 'phaser';
import { COLORS, DEPTH } from '../theme';

/*
 * "SPECIAL READY" dressing for one special meter: breathing glow on the frame, a shine sweeping
 * along the fill, small procedural lightning bolts (bar ends, frame edges, short cuts across the
 * fill) and a few sparks. One burst when the meter becomes ready, a short discharge when it
 * drops below the threshold. Everything is created once and reused; the scene's shutdown
 * destroys it with the rest of the HUD.
 */

export interface BarRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ELECTRIC = { core: COLORS.white, arc: COLORS.neon, hot: COLORS.gold } as const;
/** Breathing glow: alpha range and one full breath (ms). */
const GLOW_MIN_ALPHA = 0.6;
const GLOW_BREATH_MS = 1800;
const GLOW_LAYERS = 3;
/** New bolt pattern this often (ms): fast enough to crackle, slow enough not to strobe. */
const BOLT_INTERVAL_MS = 85;
const IDLE_BOLTS = 3;
const BURST_BOLTS = 7;
const BURST_MS = 320;
const DISCHARGE_MS = 220;
/** Bolts stay this close to the bar (px) so they never reach the life bar or the names. */
const BOLT_REACH = 6;
const SHINE_PERIOD_MS = 1600;
const SHINE_WIDTH = 16;
const SPARK_TEXTURE = 'hud:spark';
const SPARK_POOL = 28;
const SPARK_SIZE = 4;
/** Fill brightness pulse (white overlay alpha), in step with the glow breath. */
const FILL_PULSE_ALPHA = { min: 0.05, max: 0.28 };

export class SpecialReadyEffect {
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly bolts: Phaser.GameObjects.Graphics;
  private readonly shine: Phaser.GameObjects.Graphics;
  private readonly flash: Phaser.GameObjects.Rectangle;
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private breath: Phaser.Tweens.Tween | null = null;
  private active = false;
  private nextBoltAt = 0;
  private burstUntil = 0;
  private dischargeUntil = 0;
  private seed: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly bar: BarRect,
    /** True for the right-hand meter: it fills from the right, its outer end is on the right. */
    private readonly mirrored: boolean,
  ) {
    this.seed = mirrored ? 0x9e3779b9 : 0x7f4a7c15;
    this.glow = scene.add
      .graphics()
      .setDepth(DEPTH.hud - 1)
      .setAlpha(0);
    this.drawGlow();
    this.shine = scene.add.graphics().setDepth(DEPTH.hud + 1);
    this.bolts = scene.add.graphics().setDepth(DEPTH.hud + 1);
    this.flash = scene.add
      .rectangle(bar.x - 2, bar.y - 2, bar.width + 4, bar.height + 4, COLORS.white)
      .setOrigin(0)
      .setDepth(DEPTH.hud + 1)
      .setAlpha(0);
    this.sparks = scene.add
      .particles(0, 0, sparkTexture(scene), {
        lifespan: 520,
        speedX: { min: -28, max: 28 },
        speedY: { min: -9, max: 9 },
        scale: { start: 1, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [ELECTRIC.arc, ELECTRIC.hot, ELECTRIC.core],
        frequency: 95,
        quantity: 1,
        maxParticles: SPARK_POOL,
        emitZone: {
          type: 'random',
          source: new Phaser.Geom.Rectangle(bar.x, bar.y, bar.width, bar.height),
          quantity: 1,
        } as Phaser.Types.GameObjects.Particles.EmitZoneData,
        emitting: false,
      })
      .setDepth(DEPTH.hud + 1);
    for (const object of [this.glow, this.shine, this.bolts, this.flash, this.sparks]) {
      object.setScrollFactor(0);
    }
  }

  get isActive(): boolean {
    return this.active;
  }

  /** The meter just crossed the threshold: flash, intense lightning, a wave of sparks. */
  burst(): void {
    this.setActive(true);
    const now = this.scene.time.now;
    this.burstUntil = now + BURST_MS;
    this.nextBoltAt = now;
    this.flashBar(0.85, BURST_MS);
    this.sparks.explode(10);
  }

  /** The special was paid for and the meter is below the threshold: short release. */
  discharge(): void {
    this.setActive(false);
    this.dischargeUntil = this.scene.time.now + DISCHARGE_MS;
    this.nextBoltAt = this.scene.time.now;
    this.flashBar(0.6, 160);
    this.sparks.explode(8);
    this.scene.tweens.add({ targets: this.glow, alpha: 0, duration: 180, ease: 'Quad.easeOut' });
  }

  /** Every frame: `fill` is the filled part of the bar (for the shine and inner bolts). */
  update(fill: BarRect): void {
    const now = this.scene.time.now;
    this.drawShine(fill, now);
    const discharging = now < this.dischargeUntil;
    if (!this.active && !discharging) {
      if (this.nextBoltAt !== Infinity) {
        this.bolts.clear();
        this.nextBoltAt = Infinity;
      }
      return;
    }
    if (now < this.nextBoltAt) return;
    this.nextBoltAt = now + BOLT_INTERVAL_MS;
    this.bolts.clear();
    if (discharging) {
      this.drawDischarge(1 - (this.dischargeUntil - now) / DISCHARGE_MS);
      return;
    }
    const count = now < this.burstUntil ? BURST_BOLTS : IDLE_BOLTS;
    for (let i = 0; i < count; i++) this.drawBolt(fill);
  }

  private setActive(active: boolean): void {
    if (this.active === active) return;
    this.active = active;
    this.sparks.emitting = active;
    this.breath?.stop();
    this.breath = null;
    if (active) {
      this.scene.tweens.killTweensOf(this.glow);
      this.glow.setAlpha(GLOW_MIN_ALPHA);
      this.breath = this.scene.tweens.add({
        targets: this.glow,
        alpha: 1,
        duration: GLOW_BREATH_MS / 2,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private flashBar(alpha: number, duration: number): void {
    this.scene.tweens.killTweensOf(this.flash);
    this.flash.setAlpha(alpha);
    this.scene.tweens.add({ targets: this.flash, alpha: 0, duration, ease: 'Quad.easeOut' });
  }

  /** Soft frame glow: a few widening outlines, cyan inside, gold at the edge. */
  private drawGlow(): void {
    const { x, y, width, height } = this.bar;
    this.glow.fillStyle(ELECTRIC.arc, 0.18).fillRect(x - 5, y - 4, width + 10, height + 8);
    for (let i = GLOW_LAYERS; i >= 1; i--) {
      const pad = i * 1.5;
      const outer = i === GLOW_LAYERS;
      this.glow
        .lineStyle(
          2,
          outer ? ELECTRIC.hot : ELECTRIC.arc,
          outer ? 0.5 : 0.45 + 0.2 * (GLOW_LAYERS - i),
        )
        .strokeRect(x - pad, y - pad, width + pad * 2, height + pad * 2);
    }
  }

  /** A bright band sliding along the fill toward the inner end, clipped to the fill. */
  private drawShine(fill: BarRect, now: number): void {
    this.shine.clear();
    if (!this.active || fill.width <= 0) return;
    const breath = 0.5 - 0.5 * Math.cos((now / GLOW_BREATH_MS) * Math.PI * 2);
    const pulse = FILL_PULSE_ALPHA.min + (FILL_PULSE_ALPHA.max - FILL_PULSE_ALPHA.min) * breath;
    this.shine.fillStyle(ELECTRIC.core, pulse).fillRect(fill.x, fill.y, fill.width, fill.height);
    const t = (now % SHINE_PERIOD_MS) / SHINE_PERIOD_MS;
    const travel = this.bar.width + SHINE_WIDTH;
    const offset = t * travel - SHINE_WIDTH;
    const start = this.mirrored
      ? this.bar.x + this.bar.width - offset - SHINE_WIDTH
      : this.bar.x + offset;
    const left = Math.max(start, fill.x);
    const right = Math.min(start + SHINE_WIDTH, fill.x + fill.width);
    if (right <= left) return;
    this.shine.fillStyle(ELECTRIC.core, 0.55).fillRect(left, fill.y, right - left, fill.height);
  }

  /** One small bolt: mostly at the outer end and along the frame, sometimes across the fill. */
  private drawBolt(fill: BarRect): void {
    const { x, y, width, height } = this.bar;
    const roll = this.random();
    const outerX = this.mirrored ? x + width : x;
    const outward = this.mirrored ? 1 : -1;
    if (roll < 0.4) {
      // Outer end: a crackle leaving the bar sideways.
      const startY = y + this.random() * height;
      this.zigzag(
        outerX,
        startY,
        outerX + outward * BOLT_REACH * 1.6,
        startY + (this.random() - 0.5) * 8,
        3,
      );
    } else if (roll < 0.85) {
      // Along the top or bottom edge of the frame.
      const edgeY = this.random() < 0.5 ? y - 2 : y + height + 2;
      const length = 18 + this.random() * 26;
      const startX = x + this.random() * Math.max(1, width - length);
      this.zigzag(startX, edgeY, startX + length, edgeY, 5, 2.5);
    } else if (fill.width > 8) {
      // A short cut through the filled part.
      const cutX = fill.x + 4 + this.random() * (fill.width - 8);
      this.zigzag(cutX - 3, y - 1, cutX + 3, y + height + 1, 3, 3);
    }
  }

  /** Discharge: bolts thrown out of both ends, shrinking as the release fades. */
  private drawDischarge(progress: number): void {
    const { x, y, width, height } = this.bar;
    const reach = BOLT_REACH * (1.8 - progress);
    const alpha = 1 - progress;
    for (const [endX, dir] of [
      [x, -1],
      [x + width, 1],
    ] as const) {
      const startY = y + this.random() * height;
      this.zigzag(
        endX,
        startY,
        endX + dir * reach,
        startY + (this.random() - 0.5) * 6,
        3,
        2,
        alpha,
      );
    }
  }

  /** Jagged line: a wide translucent arc under a thin white core. */
  private zigzag(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    segments: number,
    jitter = 2,
    alpha = 1,
  ): void {
    const points: Phaser.Types.Math.Vector2Like[] = [{ x: x1, y: y1 }];
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      points.push({
        x: x1 + (x2 - x1) * t + (this.random() - 0.5) * jitter,
        y: y1 + (y2 - y1) * t + (this.random() - 0.5) * jitter * 2,
      });
    }
    points.push({ x: x2, y: y2 });
    const arcColor = this.random() < 0.25 ? ELECTRIC.hot : ELECTRIC.arc;
    this.bolts.lineStyle(3, arcColor, 0.55 * alpha).strokePoints(points);
    this.bolts.lineStyle(1, ELECTRIC.core, alpha).strokePoints(points);
  }

  /** Visual-only deterministic noise (LCG), so bolts never depend on Math.random. */
  private random(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
}

/** Small white square shared by every meter (tinted per particle). */
function sparkTexture(scene: Phaser.Scene): string {
  if (!scene.textures.exists(SPARK_TEXTURE)) {
    scene.make
      .graphics({}, false)
      .fillStyle(0xffffff)
      .fillRect(0, 0, SPARK_SIZE, SPARK_SIZE)
      .generateTexture(SPARK_TEXTURE, SPARK_SIZE, SPARK_SIZE)
      .destroy();
  }
  return SPARK_TEXTURE;
}
