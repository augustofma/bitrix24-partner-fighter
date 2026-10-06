import type { StageConfig } from '../types/stage';
import { partnerArena } from './partnerArena';

export const STAGES: readonly StageConfig[] = [partnerArena];

export const DEFAULT_STAGE_ID = partnerArena.id;

export function getStageConfig(id: string): StageConfig {
  const stage = STAGES.find((candidate) => candidate.id === id);
  if (!stage) throw new Error(`Unknown stage id: "${id}"`);
  return stage;
}
