import type { LocalBox } from './geometry';

/** Every state a fighter can be in. Rendering maps 1:1 from these to animations. */
export const FIGHTER_STATES = [
  'idle',
  'walk',
  'jump',
  'crouch',
  'punch',
  'kick',
  'crouchPunch',
  'crouchKick',
  'airPunch',
  'airKick',
  'block',
  'crouchBlock',
  'hurt',
  'knockout',
  'victory',
] as const;

export type FighterStateId = (typeof FIGHTER_STATES)[number];

/** Buttons that trigger a normal attack. Adding a button = add it here + to the input layer. */
export type AttackButton = 'punch' | 'kick';

/** Attacks performed standing on the ground. */
export const GROUND_ATTACK_STATES = ['punch', 'kick'] as const satisfies readonly FighterStateId[];
/** Attacks performed crouching (↓ held). The fighter stays low for the whole attack. */
export const CROUCH_ATTACK_STATES = [
  'crouchPunch',
  'crouchKick',
] as const satisfies readonly FighterStateId[];
/** Attacks performed while jumping. They end on landing. */
export const AIR_ATTACK_STATES = [
  'airPunch',
  'airKick',
] as const satisfies readonly FighterStateId[];
/** Every state that executes an attack. Future: 'special', 'super'... */
export const ATTACK_STATES = [
  ...GROUND_ATTACK_STATES,
  ...CROUCH_ATTACK_STATES,
  ...AIR_ATTACK_STATES,
] as const;
export type AttackStateId = (typeof ATTACK_STATES)[number];

/**
 * How an attack must be guarded (semantic only for now: every guard still blocks everything,
 * see `isAttackBlocked` in CombatSystem). Planned rules:
 * - `high`: blockable standing or crouching; usually whiffs over crouching fighters.
 * - `mid`: blockable standing or crouching.
 * - `low`: must be blocked crouching.
 * - `overhead`: must be blocked standing (includes jump-in attacks).
 */
export type AttackLevel = 'high' | 'mid' | 'low' | 'overhead';

/**
 * Key of an attack in `FighterConfig.attacks`. Which slot a button triggers depends on the
 * fighter's stance (see core/fighter/fighterStates.ts).
 */
export type AttackSlot = AttackStateId;

/** Frame data for one attack. All durations are in simulation frames (60 per second). */
export interface AttackConfig {
  id: string;
  displayName: string;
  /** Fighter state (and therefore animation) used while performing this attack. */
  state: AttackStateId;
  /** How it must be guarded (see AttackLevel). Not enforced yet. */
  level: AttackLevel;
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
  /** Vulnerable area while airborne. Also the body that blocks movement in the air. */
  airborne: LocalBox;
  /** Width of the body used to stop fighters from overlapping. */
  pushWidth: number;
  /**
   * Height (from the feet) of the grounded body that blocks movement. A jumping fighter whose
   * airborne box is entirely above it passes over (cross-up). Ground vs ground always collides.
   */
  pushHeight: number;
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
  /**
   * `jump` only: how many of `frames` show the rise / apex (tuck) / fall, picked from the
   * vertical velocity. Must add up to frames.length. Default: 3 frames = 1 each.
   */
  jumpPhases?: JumpPhaseFrameCounts;
}

export interface AttackPhaseFrameCounts {
  startup: number;
  active: number;
  recovery: number;
}

export interface JumpPhaseFrameCounts {
  rise: number;
  apex: number;
  fall: number;
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
  /** Standing, crouching and air normals. Each AttackConfig.state should match its slot. */
  attacks: Record<AttackSlot, AttackConfig>;
  /** RESERVED for future special moves. Keep empty in v0.1. */
  specials: readonly SpecialMoveConfig[];
  palette: PlaceholderPalette;
  assets: FighterAssetManifest;
}
