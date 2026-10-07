import type { CrowdReaction, StageMood } from '../../types/stage';

/** What FightScene needs from a stage background, whatever draws it. */
export interface StageBackdrop {
  /** Livelier background when a round is won ('celebrate'), calm again on the next round. */
  setMood(mood: StageMood): void;
  /** A short burst of excitement on a big moment (strong hit, special, KO, PERFECT). */
  react(reaction: CrowdReaction): void;
  /** Advances the background loops (render time, never simulation time). */
  update(timeMs: number): void;
  /** Destroys everything the stage created (scene shutdown). */
  destroy(): void;
}
