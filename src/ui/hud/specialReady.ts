import { SPECIAL_METER } from '../../config/special';
import type { FighterConfig } from '../../types/fighter';

/*
 * When is a fighter's special meter "READY"? Pure (no Phaser), so it is testable.
 *
 * The threshold is the cheapest special the fighter can ever pay for: the lowest
 * `meterCost` among its configured specials that fits in the meter. It never assumes a full
 * bar (Filipe's MINDHUB AGENT costs 35, so he is READY from 35). Posture rules such as
 * `groundOnly` are left out on purpose: the HUD would flicker on every jump.
 */

/** Meter needed for the cheapest usable special, or null when the fighter has none. */
export function specialReadyThreshold(config: Pick<FighterConfig, 'specials'>): number | null {
  const costs = config.specials
    .map((move) => move.meterCost)
    .filter((cost) => cost >= 0 && cost <= SPECIAL_METER.max);
  return costs.length > 0 ? Math.min(...costs) : null;
}

export function isSpecialReady(config: Pick<FighterConfig, 'specials'>, meter: number): boolean {
  const threshold = specialReadyThreshold(config);
  return threshold !== null && meter >= threshold;
}

export type SpecialReadyChange = 'ready' | 'discharged';

/**
 * Remembers the last state so the "became ready" burst and the "discharge" effect fire once
 * per crossing, never every frame.
 */
export class SpecialReadyTracker {
  private current = false;

  get ready(): boolean {
    return this.current;
  }

  /** Feed the state every frame; returns the change when it crossed the threshold. */
  update(ready: boolean): SpecialReadyChange | null {
    if (ready === this.current) return null;
    this.current = ready;
    return ready ? 'ready' : 'discharged';
  }

  reset(): void {
    this.current = false;
  }
}

/** Look of the touch ESP button: lit border and a soft pulsing ring while READY. */
export interface SpecialButtonStyle {
  strokeColor: number;
  strokeAlpha: number;
  strokeWidth: number;
  glow: boolean;
}

export const SPECIAL_BUTTON_IDLE: SpecialButtonStyle = {
  strokeColor: 0xffffff,
  strokeAlpha: 0.6,
  strokeWidth: 3,
  glow: false,
};

export const SPECIAL_BUTTON_READY: SpecialButtonStyle = {
  strokeColor: 0x2fe0ff,
  strokeAlpha: 1,
  strokeWidth: 4,
  glow: true,
};

export function specialButtonStyle(ready: boolean): SpecialButtonStyle {
  return ready ? SPECIAL_BUTTON_READY : SPECIAL_BUTTON_IDLE;
}
