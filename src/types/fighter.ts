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
export const ATTACK_STATES = ['punch', 'kick'] as const satisfies readonly FighterStateId[];
export type AttackStateId = (typeof ATTACK_STATES)[number];

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
 * Optional art for a fighter (paths relative to /public). Purely visual: nothing here affects
 * the simulation. Anything missing or invalid falls back to the placeholder renderer.
 * Format and step-by-step guide: docs/ART_DIRECTION.md.
 */
export interface FighterAssetManifest {
  /** Character-card image for select / VS / victory screens. */
  portrait?: string;
  /** Animated in-fight sprite. Without it, the geometric placeholder is drawn. */
  sprite?: FighterSpriteAssets;
  /** Use nearest-neighbour scaling for this fighter's textures (crisp pixel art). */
  pixelArt?: boolean;
}

export interface FighterSpriteAssets {
  sheet: SpriteSheetAsset;
  animations: FighterAnimationSet;
  visual?: SpriteVisualConfig;
}

/** A grid spritesheet. Frames are numbered left-to-right, top-to-bottom, starting at 0. */
export interface SpriteSheetAsset {
  /** Texture key, unique across the whole game. */
  key: string;
  /** Path relative to /public, e.g. 'fighters/fighter-a/sprite.png'. */
  path: string;
  frameWidth: number;
  frameHeight: number;
}

/**
 * One visual animation. Its timing is VISUAL ONLY: gameplay timing always comes from the
 * simulation (AttackConfig frame data, hitstun...). Frames are picked from fighter.stateFrame.
 */
export interface SpriteAnimationConfig {
  /** Frame indices in the sheet. */
  frames: readonly number[];
  /** Animation frames per second (default 10). Ignored for attack states. */
  frameRate?: number;
  /**
   * -1 = loop forever, 0 = play once and hold the last frame, n = play n extra times.
   * Default: loop for idle/walk, play once for everything else. Ignored for attack states.
   */
  repeat?: number;
  /**
   * Attack states only: how many of `frames` belong to startup / active / recovery.
   * Must add up to frames.length. Default: 1 active "impact" frame in the middle.
   */
  attackPhases?: AttackPhaseFrameCounts;
}

export interface AttackPhaseFrameCounts {
  startup: number;
  active: number;
  recovery: number;
}

/** `idle` is mandatory; other states fall back to a similar animation when absent. */
export type FighterAnimationSet = { idle: SpriteAnimationConfig } & Partial<
  Record<Exclude<FighterStateId, 'idle'>, SpriteAnimationConfig>
>;

/** How the sprite is placed over the fighter's logical position (center of the feet). */
export interface SpriteVisualConfig {
  /** Display scale of the frames (default 1). */
  scale?: number;
  /** World pixels; positive = in front of the fighter (mirrors with facing). Default 0. */
  offsetX?: number;
  /** World pixels; positive = down. Use it when the feet are not on the frame's bottom row. */
  offsetY?: number;
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
