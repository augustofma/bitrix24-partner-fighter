import { COLORS } from './theme';

/*
 * Look of the fight clock: gold while there is time, then yellow, orange and red over the last
 * ten seconds, with a discreet pulse on each tick. Purely visual: the round length is unchanged.
 */

/** From this many seconds left, the clock starts warning. */
export const TIMER_WARNING_SECONDS = 10;
const ORANGE_FROM_SECONDS = 6;
const RED_FROM_SECONDS = 3;

export const TIMER_COLORS = {
  normal: COLORS.gold,
  warning: 0xfff04a,
  urgent: COLORS.orange,
  critical: 0xff3b30,
} as const;

export type TimerUrgency = keyof typeof TIMER_COLORS;

export interface TimerStyle {
  urgency: TimerUrgency;
  color: number;
  /** Peak scale of the per-second pulse (1 = no pulse). */
  pulseScale: number;
}

export function timerStyle(secondsRemaining: number): TimerStyle {
  const urgency: TimerUrgency =
    secondsRemaining > TIMER_WARNING_SECONDS
      ? 'normal'
      : secondsRemaining > ORANGE_FROM_SECONDS
        ? 'warning'
        : secondsRemaining > RED_FROM_SECONDS
          ? 'urgent'
          : 'critical';
  const pulseScale =
    urgency === 'normal' || secondsRemaining <= 0 ? 1 : urgency === 'critical' ? 1.14 : 1.08;
  return { urgency, color: TIMER_COLORS[urgency], pulseScale };
}

/** "07", "99": the clock always shows two digits and never goes negative. */
export function timerLabel(secondsRemaining: number): string {
  return String(Math.max(0, secondsRemaining)).padStart(2, '0');
}
