import type { StageConfig } from '../types/stage';
import { partnerArena } from './partnerArena';
import { partnerSummit } from './partnerSummit';
import { joinville } from './joinville';
import { joinvilleZopu } from './joinvilleZopu';
import { recife } from './recife';
import { russia } from './russia';

export const STAGES: readonly StageConfig[] = [
  partnerSummit,
  recife,
  joinville,
  joinvilleZopu,
  russia,
  partnerArena,
];

export const DEFAULT_STAGE_ID = partnerSummit.id;

/**
 * Stages offered in the quick fight's stage select: the illustrated ones, in registry order
 * (PARTNER ARENA, the procedural placeholder, stays out).
 */
export function getSelectableStages(): readonly StageConfig[] {
  return STAGES.filter((stage) => stage.art !== undefined);
}

export function getStageConfig(id: string): StageConfig {
  const stage = STAGES.find((candidate) => candidate.id === id);
  if (!stage) throw new Error(`Unknown stage id: "${id}"`);
  return stage;
}
