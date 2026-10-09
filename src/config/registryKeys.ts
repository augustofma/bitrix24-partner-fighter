/**
 * Keys of values kept in the Phaser game registry: session-wide state shared between scenes
 * (lost on reload), so it never lives in loose module-level variables.
 */
export const RegistryKeys = {
  /** Last CPU difficulty chosen on the character select screen. */
  aiDifficulty: 'aiDifficulty',
  /** The story campaign in progress (StoryProgress), or nothing outside story mode. */
  storyProgress: 'storyProgress',
  /** Set when the last completed campaign unlocked a new ending in the gallery. */
  newEndingUnlocked: 'newEndingUnlocked',
} as const;
