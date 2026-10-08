import { STRINGS } from '../../config/strings';
import type { SpecialEffectConfig, SpecialMoveConfig } from '../../types/fighter';

/**
 * ALAIO VIBECODE!, shared by João Guiotti and Isaque Ferreira: a braid of neon code waves
 * thrown from a planted stance. Mid-range (162 px, against ~100 for their kicks), ground only,
 * and slow enough to be seen: blocked, it leaves the caster at a disadvantage (24 recovery
 * against 15 blockstun). Each fighter gets its own move id.
 */
export function alaioVibecode(fighterId: string): {
  move: SpecialMoveConfig;
  effect: SpecialEffectConfig;
} {
  return {
    move: {
      id: `${fighterId}.alaioVibecode`,
      displayName: STRINGS.specialAlaioVibecode,
      state: 'special',
      level: 'mid',
      meterCost: 30,
      groundOnly: true,
      // A short step into the cast.
      advanceSpeed: 2,
      damage: 17,
      chipDamage: 2,
      startupFrames: 12,
      activeFrames: 6,
      recoveryFrames: 24,
      hitbox: { x: 26, y: -134, width: 136, height: 64 },
      hitstunFrames: 24,
      blockstunFrames: 15,
      knockback: 8,
      blockPushback: 5.5,
      hitstopFrames: 11,
    },
    effect: {
      style: 'vibeCode',
      label: STRINGS.specialAlaioVibecode,
      emblem: 'vfx/vibecode-emblem.png',
      sound: 'special-vibe',
    },
  };
}
