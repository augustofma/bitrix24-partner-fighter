import type { StageConfig } from '../types/stage';
import { partnerArena } from './partnerArena';
import { partnerSummit } from './partnerSummit';

export const STAGES: readonly StageConfig[] = [partnerSummit, partnerArena];

export const DEFAULT_STAGE_ID = partnerSummit.id;

export function getStageConfig(id: string): StageConfig {
  const stage = STAGES.find((candidate) => candidate.id === id);
  if (!stage) throw new Error(`Unknown stage id: "${id}"`);
  return stage;
}
