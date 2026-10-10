/*
 * Hit streaks for the combo counter ("3 HITS!"): blows one fighter lands in a row, each within
 * a short window of the previous one, while the other neither hits back nor blocks. True links
 * (a hit landing before the defender recovers) are rare with the current frame data, so the
 * counter rewards pressure instead. Presentation only: it reads simulation events and frame
 * numbers, it never changes the fight.
 */

/** Longest gap between two hits of one streak (60 Hz frames: 1.2 s). */
export const COMBO_WINDOW_FRAMES = 72;
/** The counter shows from this many hits in a row. */
export const COMBO_MIN_SHOWN = 2;

type Side = 0 | 1;

export class ComboTracker {
  private readonly counts: [number, number] = [0, 0];
  private readonly lastHit: [number, number] = [-Infinity, -Infinity];

  /** `attacker` landed a hit at `frame`. Returns its streak (1 = a single hit). */
  hit(attacker: Side, frame: number): number {
    const defender = (1 - attacker) as Side;
    // Getting hit ends the defender's own streak.
    this.counts[defender] = 0;
    this.counts[attacker] =
      frame - this.lastHit[attacker] <= COMBO_WINDOW_FRAMES ? this.counts[attacker] + 1 : 1;
    this.lastHit[attacker] = frame;
    return this.counts[attacker];
  }

  /** The defender blocked `attacker`'s blow: the streak is broken. */
  blocked(attacker: Side): void {
    this.counts[attacker] = 0;
  }

  /** A new round: no streak carries over. */
  reset(): void {
    this.counts[0] = this.counts[1] = 0;
    this.lastHit[0] = this.lastHit[1] = -Infinity;
  }

  count(side: Side): number {
    return this.counts[side];
  }
}
