import {
  ATTACK_STATES,
  FIGHTER_STATES,
  type FighterConfig,
  type FighterSpriteAssets,
  type FighterStateId,
} from '../../types/fighter';
import { resolveAnimationState } from './animationHelpers';

const ATTACK_STATE_SET: ReadonlySet<FighterStateId> = new Set<FighterStateId>(ATTACK_STATES);

/*
 * Simple, pure checks for fighter art configuration. Errors make the fighter fall back to
 * the placeholder renderer; warnings are only reported (in development).
 */

export interface AssetIssue {
  level: 'error' | 'warning';
  fighterId: string;
  message: string;
}

const isPositiveInteger = (n: number) => Number.isInteger(n) && n > 0;
const isFrameIndex = (n: number) => Number.isInteger(n) && n >= 0;

/**
 * Validates one fighter's sprite config.
 * @param frameCount frames available in the loaded sheet, when known (enables range checks).
 */
export function validateSpriteAssets(config: FighterConfig, frameCount?: number): AssetIssue[] {
  const sprite = config.assets.sprite;
  if (!sprite) return [];
  const issues: AssetIssue[] = [];
  const error = (message: string) => issues.push({ level: 'error', fighterId: config.id, message });
  const warn = (message: string) =>
    issues.push({ level: 'warning', fighterId: config.id, message });

  const { sheet, animations, visual } = sprite;
  if (!sheet.key) error('sprite.sheet.key is empty.');
  if (!sheet.path) error('sprite.sheet.path is empty.');
  if (!isPositiveInteger(sheet.frameWidth) || !isPositiveInteger(sheet.frameHeight)) {
    error('sprite.sheet frameWidth/frameHeight must be positive integers.');
  }
  if (visual?.scale !== undefined && !(visual.scale > 0)) error('sprite.visual.scale must be > 0.');

  // The type requires idle, but configs can still be assembled loosely at runtime.
  if (!(animations as Partial<FighterSpriteAssets['animations']>).idle) {
    error('animations.idle is required.');
  }

  for (const state of FIGHTER_STATES) {
    const animation = animations[state];
    if (!animation) {
      if (state !== 'idle') {
        const shown = resolveAnimationState(animations, state);
        warn(`No "${state}" animation; showing "${shown}" instead.`);
      }
      continue;
    }
    if (animation.frames.length === 0) error(`animations.${state} has no frames.`);
    for (const frame of animation.frames) {
      if (!isFrameIndex(frame)) {
        error(`animations.${state} has an invalid frame index: ${frame}.`);
      } else if (frameCount !== undefined && frame >= frameCount) {
        error(`animations.${state} uses frame ${frame}, but the sheet has ${frameCount} frames.`);
      }
    }
    if (animation.frameRate !== undefined && !(animation.frameRate > 0)) {
      error(`animations.${state}.frameRate must be > 0.`);
    }
    validateAttackPhases(state, animation.attackPhases, animation.frames.length, error, warn);
  }
  return issues;
}

function validateAttackPhases(
  state: FighterStateId,
  phases: { startup: number; active: number; recovery: number } | undefined,
  frameCount: number,
  error: (message: string) => void,
  warn: (message: string) => void,
): void {
  if (!phases) return;
  const counts = [phases.startup, phases.active, phases.recovery];
  if (counts.some((n) => !Number.isInteger(n) || n < 0)) {
    error(`animations.${state}.attackPhases must be non-negative integers.`);
  } else if (counts.reduce((sum, n) => sum + n, 0) !== frameCount) {
    error(`animations.${state}.attackPhases must add up to ${frameCount} (frames.length).`);
  }
  if (!ATTACK_STATE_SET.has(state)) {
    warn(`animations.${state}.attackPhases is only used while an attack is active.`);
  }
}

/** Validates every fighter, plus texture keys shared by different sheets. */
export function validateRosterAssets(roster: readonly FighterConfig[]): AssetIssue[] {
  const issues = roster.flatMap((config) => validateSpriteAssets(config));
  const sheetsByKey = new Map<string, string>();
  for (const config of roster) {
    const sheet = config.assets.sprite?.sheet;
    if (!sheet) continue;
    const signature = `${sheet.path}|${sheet.frameWidth}x${sheet.frameHeight}`;
    const existing = sheetsByKey.get(sheet.key);
    if (existing !== undefined && existing !== signature) {
      issues.push({
        level: 'error',
        fighterId: config.id,
        message: `Texture key "${sheet.key}" is already used by a different sheet.`,
      });
    }
    sheetsByKey.set(sheet.key, signature);
  }
  return issues;
}

/**
 * Fallback decision: the sprite config to render with, or null to use the placeholder.
 * @param loadedFrameCount frames in the loaded texture, or null when it failed to load.
 */
export function selectSpriteAssets(
  config: FighterConfig,
  loadedFrameCount: number | null,
): FighterSpriteAssets | null {
  const sprite = config.assets.sprite;
  if (!sprite || loadedFrameCount === null || loadedFrameCount <= 0) return null;
  const hasErrors = validateSpriteAssets(config, loadedFrameCount).some((i) => i.level === 'error');
  return hasErrors ? null : sprite;
}
