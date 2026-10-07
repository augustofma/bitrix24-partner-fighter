import type { StageConfig } from '../../types/stage';
import type { AssetRequest } from './fighterAssets';

/** Every image declared by the stages' art, without duplicates. */
export function collectStageAssets(stages: readonly StageConfig[]): AssetRequest[] {
  const requests = new Map<string, AssetRequest>();
  for (const { art } of stages) {
    if (!art) continue;
    for (const image of [art.background, ...(art.performers ?? []).map((p) => p.image)]) {
      if (!requests.has(image.key)) requests.set(image.key, { type: 'image', ...image });
    }
  }
  return [...requests.values()];
}

/** Texture keys a stage needs to be drawn with its art (otherwise it falls back). */
export function stageArtKeys(stage: StageConfig): string[] {
  const { art } = stage;
  if (!art) return [];
  return [art.background.key, ...(art.performers ?? []).map((p) => p.image.key)];
}
