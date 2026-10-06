import type { LocalBox } from './geometry';

/** Every state a fighter can be in. Rendering maps 1:1 from these to animations. */
export const FIGHTER_STATES = [
  'idle',
  'walk',
  'jump',
  'crouch',
  'punch',
  'kick',
  'block',
  'hurt',
  'knockout',
  'victory',
] as const;

export type FighterStateId = (typeof FIGHTER_STATES)[number];

/** Buttons that trigger a normal attack. Adding a button = add it here + to the input layer. */
export type AttackButton = 'punch' | 'kick';

/** States that execute an attack. Future: 'special', 'super', 'airPunch'... */
export type AttackStateId = Extract<FighterStateId, 'punch' | 'kick'>;

/** Frame data for one attack. All durations are in simulation frames (60 per second). */
export interface AttackConfig {
  id: string;
  displayName: string;
  /** Fighter state (and therefore animation) used while performing this attack. */
  state: AttackStateId;
  damage: number;
  /** Damage dealt through a block. Can never KO. */
  chipDamage: number;
  startupFrames: number;
  activeFrames: number;
  recoveryFrames: number;
  /** Damage area, relative to the attacker's feet, authored facing right. */
  hitbox: LocalBox;
  hitstunFrames: number;
  blockstunFrames: number;
  /** Horizontal speed (px/frame) applied to the defender on hit. */
  knockback: number;
  /** Horizontal speed (px/frame) applied to the defender on block. */
  blockPushback: number;
  /** Freeze frames on contact, for impact feel. */
  hitstopFrames: number;
}

export interface FighterStats {
  maxHealth: number;
  /** Forward walk speed in px/frame. */
  walkSpeed: number;
  /** Backward walk speed in px/frame. */
  backWalkSpeed: number;
  /** Initial upward speed in px/frame. */
  jumpForce: number;
  /** Horizontal speed during a directional jump in px/frame. */
  jumpHorizontalSpeed: number;
}

export interface FighterBoxes {
  /** Vulnerable area while standing/walking/attacking. */
  standing: LocalBox;
  /** Vulnerable area while crouching (lower, so high attacks whiff). */
  crouching: LocalBox;
  /** Vulnerable area while airborne. */
  airborne: LocalBox;
  /** Width of the body used to stop fighters from overlapping. */
  pushWidth: number;
}

/**
 * RESERVED - not implemented in v0.1.
 * Shape of a future special move, so content authors know where it will live.
 */
export interface SpecialMoveConfig {
  id: string;
  displayName: string;
  /** Motion input relative to facing, e.g. ['down', 'downForward', 'forward']. */
  motion: readonly string[];
  button: AttackButton;
  meterCost: number;
  attack: AttackConfig;
}

/** Colors for the placeholder (geometric) renderer. */
export interface PlaceholderPalette {
  body: number;
  accent: number;
  skin: number;
  outline: number;
}

/**
 * Optional sprite assets for a fighter (paths relative to /public).
 * When missing, the placeholder renderer is used. See docs/ART_DIRECTION.md.
 */
export interface FighterAssetManifest {
  portrait?: string;
  animations?: Partial<Record<FighterStateId, SpriteAnimationAsset>>;
}

export interface SpriteAnimationAsset {
  /** Spritesheet path relative to /public, e.g. 'fighters/fighter-a/idle.png'. */
  path: string;
  frameWidth: number;
  frameHeight: number;
  frameRate: number;
  loop: boolean;
}

/**
 * Everything that defines a character. Adding a character = adding one of these to the roster.
 * The engine never branches on a specific fighter id.
 */
export interface FighterConfig {
  id: string;
  /** Internal/short name (e.g. used for logs). */
  name: string;
  /** Name shown in UI. */
  displayName: string;
  description: string;
  /** Whether the player can pick this fighter in character select. */
  selectable: boolean;
  stats: FighterStats;
  boxes: FighterBoxes;
  attacks: Record<AttackButton, AttackConfig>;
  /** RESERVED for future special moves. Keep empty in v0.1. */
  specials: readonly SpecialMoveConfig[];
  palette: PlaceholderPalette;
  assets: FighterAssetManifest;
}
