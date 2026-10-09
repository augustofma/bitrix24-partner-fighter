import type { SfxId } from './audio';
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
  'special',
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
/** Normal attack slots remain separate from configurable special moves. */
export const NORMAL_ATTACK_STATES = [
  ...GROUND_ATTACK_STATES,
  ...CROUCH_ATTACK_STATES,
  ...AIR_ATTACK_STATES,
] as const;
export const ATTACK_STATES = [...NORMAL_ATTACK_STATES, 'special'] as const;
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
export type AttackSlot = Exclude<AttackStateId, 'special'>;

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

/** One strong contact today; future hit timelines extend the shared attack resolver. */
export interface SpecialMoveConfig extends AttackConfig {
  state: 'special';
  meterCost: number;
  groundOnly: boolean;
  /** Forward speed during startup and active frames; zero during recovery. */
  advanceSpeed: number;
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
  /** Optional procedural presentation, keyed by special move id. */
  specialEffects?: Readonly<Record<string, SpecialEffectConfig>>;
}

/**
 * App-themed VFX available to any special (drawn by render/special/):
 * - `zapMessages`: messaging app look (24zap): green chat bubbles, send waves, read receipts.
 * - `mindNetwork`: AI look (Mindhub): a glowing brain-circuit sigil, circuit traces, a neural
 *   mesh and a digital discharge.
 * - `vibeCode`: "vibe coding" look (ALAIO VIBECODE!): a code editor typing, neon sine waves
 *   carrying </> tokens and a glitch burst.
 * - `agentBuilder`: AI-agent builder look (GPTMAKER!): a blueprint grid, a robot assembled from
 *   blocks, a workflow of nodes, an amber beam and a starburst.
 * - `liquidFlow`: purple liquid look (FLUIDZ!): a wobbling blob, a rippling stream with a wave
 *   crest, a splash crown of drops with gravity and a puddle.
 * - `workflowNodes`: automation look (N8N!): workflow nodes popping in, curved connections
 *   with data packets racing to the rival, and an "executed" check burst.
 * - `skyLightning`: a boss storm (ALAIO STRIKE!): a storm cloud over the whole
 *   screen and lightning bolts from it to the floor across the stage, a bolt onto the victim.
 * Purely visual: timing comes from the move's frame data, nothing here touches gameplay.
 */
export type SpecialEffectStyle =
  | 'zapMessages'
  | 'mindNetwork'
  | 'vibeCode'
  | 'agentBuilder'
  | 'liquidFlow'
  | 'skyLightning'
  | 'workflowNodes';

export interface SpecialEffectConfig {
  style: SpecialEffectStyle;
  /** Short text flashed above the fighter while the move runs. */
  label: string;
  /** Pixel-art app emblem (path in /public) shown on the move and on the impact. */
  emblem?: string;
  /** Symbol-only image (white, path in /public), tinted and glowed by the style. */
  glyph?: string;
  /** Sound when the special starts (default: the generic special sound). */
  sound?: SfxId;
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

/** Condition that turns a hidden fighter playable (see FighterConfig.unlock). */
export type FighterUnlock = 'all-endings';

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
  /**
   * A complete fighter offered to players: shown on Character Select (every mode) and used by
   * the CPU as an opponent. Test/demo placeholders set false (they stay usable in code/tests).
   */
  playable: boolean;
  /**
   * A hidden fighter (playable: false) that becomes playable in quick fights once the player
   * meets this condition. 'all-endings': every story ending is in the gallery.
   */
  unlock?: FighterUnlock;
  stats: FighterStats;
  boxes: FighterBoxes;
  /** Standing, crouching and air normals. Each AttackConfig.state should match its slot. */
  attacks: Record<AttackSlot, AttackConfig>;
  /** F selects the first affordable move allowed in the current posture. */
  specials: readonly SpecialMoveConfig[];
  palette: PlaceholderPalette;
  assets: FighterAssetManifest;
}
