/**
 * Keys of values kept in the Phaser game registry: session-wide state shared between scenes
 * (lost on reload), so it never lives in loose module-level variables.
 */
export const RegistryKeys = {
  /** Last CPU difficulty chosen on the character select screen. */
  aiDifficulty: 'aiDifficulty',
} as const;
