import {
  ROUND_INTRO_FRAMES,
  ROUND_OUTRO_FRAMES,
  ROUND_TIME_FRAMES,
  VICTORY_POSE_DELAY_FRAMES,
} from '../../config/match';
import { SIMULATION_FPS } from '../../config/simulation';
import type { RoundResult } from '../../types/match';

export type RoundPhase = 'intro' | 'fight' | 'ending' | 'finished';

export type RoundEvent =
  | { type: 'fightStart' }
  | { type: 'ko'; result: RoundResult }
  | { type: 'timeUp'; result: RoundResult }
  | { type: 'victoryPose'; winnerIndex: 0 | 1 }
  | { type: 'roundOver'; result: RoundResult };

export interface RoundTiming {
  timeFrames: number;
  introFrames: number;
  victoryPoseDelayFrames: number;
  outroFrames: number;
}

export const DEFAULT_ROUND_TIMING: RoundTiming = {
  timeFrames: ROUND_TIME_FRAMES,
  introFrames: ROUND_INTRO_FRAMES,
  victoryPoseDelayFrames: VICTORY_POSE_DELAY_FRAMES,
  outroFrames: ROUND_OUTRO_FRAMES,
};

/**
 * Round flow: intro -> fight (timer runs) -> ending (KO / time over) -> finished.
 * Works only with health values, so it does not depend on Fighter at all.
 */
export class RoundSystem {
  private currentPhase: RoundPhase = 'intro';
  private framesInPhase = 0;
  private remainingFrames: number;
  private roundResult: RoundResult | null = null;

  constructor(private readonly timing: RoundTiming = DEFAULT_ROUND_TIMING) {
    this.remainingFrames = timing.timeFrames;
  }

  get phase(): RoundPhase {
    return this.currentPhase;
  }

  get result(): RoundResult | null {
    return this.roundResult;
  }

  /** Value shown on the HUD clock. */
  get secondsRemaining(): number {
    return Math.ceil(this.remainingFrames / SIMULATION_FPS);
  }

  step(health: readonly [number, number]): RoundEvent[] {
    this.framesInPhase++;
    switch (this.currentPhase) {
      case 'intro':
        if (this.framesInPhase < this.timing.introFrames) return [];
        this.enterPhase('fight');
        return [{ type: 'fightStart' }];
      case 'fight':
        return this.stepFight(health);
      case 'ending':
        return this.stepEnding();
      case 'finished':
        return [];
    }
  }

  private stepFight(health: readonly [number, number]): RoundEvent[] {
    const [p1, p2] = health;
    if (p1 <= 0 || p2 <= 0) {
      const winnerIndex = p1 <= 0 && p2 <= 0 ? null : p1 <= 0 ? 1 : 0;
      return [{ type: 'ko', result: this.finishFight({ winnerIndex, reason: 'ko' }) }];
    }
    this.remainingFrames--;
    if (this.remainingFrames > 0) return [];
    const winnerIndex = p1 === p2 ? null : p1 > p2 ? 0 : 1;
    return [{ type: 'timeUp', result: this.finishFight({ winnerIndex, reason: 'timeout' }) }];
  }

  private stepEnding(): RoundEvent[] {
    const result = this.roundResult;
    if (!result) return [];
    const events: RoundEvent[] = [];
    if (this.framesInPhase === this.timing.victoryPoseDelayFrames && result.winnerIndex !== null) {
      events.push({ type: 'victoryPose', winnerIndex: result.winnerIndex });
    }
    if (this.framesInPhase >= this.timing.outroFrames) {
      this.enterPhase('finished');
      events.push({ type: 'roundOver', result });
    }
    return events;
  }

  private finishFight(result: RoundResult): RoundResult {
    this.roundResult = result;
    this.enterPhase('ending');
    return result;
  }

  private enterPhase(phase: RoundPhase): void {
    this.currentPhase = phase;
    this.framesInPhase = 0;
  }
}
