import type { AttackPhase } from '../../core/fighter/attackFrames';
import type { ReadonlyFighter } from '../../core/fighter/ReadonlyFighter';
import type { AttackConfig } from '../../types/fighter';
import type { Graphics } from './vfxShapes';

/** A pooled image (app emblem or glyph) a theme can place this frame; hidden otherwise. */
export interface EffectImage {
  readonly available: boolean;
  show(options: {
    x: number;
    y: number;
    scale: number;
    alpha: number;
    rotation?: number;
    tint?: number;
    /** Additive blending: a glow. */
    glow?: boolean;
  }): void;
}

/** One frame of a special in progress (derived only from the simulation: freezes in hitstop). */
export interface MoveFrame {
  /** Normal layer and additive glow layer. */
  g: Graphics;
  glow: Graphics;
  fighter: ReadonlyFighter;
  attack: AttackConfig;
  phase: AttackPhase;
  /** Frames since the move started, and progress (0..1) inside the current phase. */
  frame: number;
  t: number;
  direction: 1 | -1;
  /** Where the energy leaves (front of the hitbox, at mid height) and where the reach ends. */
  hand: { x: number; y: number };
  front: { x: number; y: number };
  /** The move's hitbox in world space (the VFX stays around it, never defines it). */
  box: { left: number; right: number; top: number; bottom: number };
  emblem: EffectImage;
  glyph: EffectImage;
  /** This move's impact is on screen: it carries the emblem, so the move should not repeat it. */
  impacting: boolean;
}

/** One frame of an impact (time-based, so it plays even during the hitstop freeze). */
export interface ImpactFrame {
  g: Graphics;
  glow: Graphics;
  x: number;
  y: number;
  direction: 1 | -1;
  /** 0..1 over the impact's duration. */
  t: number;
  /** A blocked special gets a smaller, duller version. */
  blocked: boolean;
  emblem: EffectImage;
}

export interface SpecialTheme {
  /** Duration of the hit / block impact (ms). */
  impactMs: number;
  drawMove(frame: MoveFrame): void;
  drawImpact(frame: ImpactFrame): void;
}
