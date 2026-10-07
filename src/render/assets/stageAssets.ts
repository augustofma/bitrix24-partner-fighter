import type { StageArt, StageConfig, StageImage } from '../../types/stage';
import type { AssetRequest } from './fighterAssets';

/** Every image declared by the stages' art, without duplicates. */
export function collectStageAssets(stages: readonly StageConfig[]): AssetRequest[] {
  const requests = new Map<string, AssetRequest>();
  for (const { art } of stages) {
    if (!art) continue;
    for (const image of artImages(art)) {
      if (!requests.has(image.key)) requests.set(image.key, { type: 'image', ...image });
    }
  }
  return [...requests.values()];
}

/** Texture keys a stage needs to be drawn with its art (otherwise it falls back). */
export function stageArtKeys(stage: StageConfig): string[] {
  return stage.art ? artImages(stage.art).map((image) => image.key) : [];
}

/** Every image of a stage's art: background, performers and the flyover (plane, banner). */
function artImages(art: StageArt): StageImage[] {
  const { flyover } = art;
  return [
    art.background,
    ...(art.performers ?? []).map((p) => p.image),
    ...(flyover
      ? [
          flyover.plane,
          { key: flyover.propeller.key, path: flyover.propeller.path },
          flyover.banner,
        ]
      : []),
  ];
}
