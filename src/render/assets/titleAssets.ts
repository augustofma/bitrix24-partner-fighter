import { TITLE_ART_LAYOUT } from '../../ui/title/titleArtLayout';
import type { AssetRequest } from './fighterAssets';

/** Name of a wind-moved part of the title art (João's hair, the collars, backs, hems...). */
export type TitleWindPart = keyof typeof TITLE_ART_LAYOUT.wind;

export const TITLE_WIND_PARTS = Object.keys(TITLE_ART_LAYOUT.wind) as TitleWindPart[];

export function windTextureKey(part: TitleWindPart): string {
  return `title:wind:${part}`;
}

/**
 * Layers of the title screen art (public/ui/title/, produced by
 * scripts/title-art/prepare_title_art.py). The logo, the START button and the wind-moved parts
 * are separate layers so they can move; the background has the logo, the button, the hint text
 * and João's hair removed, so nothing is ever shown twice.
 */
export const TITLE_ART = {
  background: { type: 'image', key: 'title:background', path: 'ui/title/background.jpg' },
  logo: { type: 'image', key: 'title:logo', path: 'ui/title/logo.png' },
  button: { type: 'image', key: 'title:button', path: 'ui/title/button.png' },
  glow: { type: 'image', key: 'title:glow', path: 'ui/title/glow.png' },
} as const satisfies Record<string, AssetRequest>;

/** Everything the title screen needs, loaded by the BootScene before it shows. */
export const TITLE_ASSETS: readonly AssetRequest[] = [
  ...Object.values(TITLE_ART),
  ...TITLE_WIND_PARTS.map((part): AssetRequest => ({
    type: 'image',
    key: windTextureKey(part),
    path: `ui/title/wind-${part}.png`,
  })),
];

/** Texture keys the illustrated title needs (otherwise the procedural title is used). */
export const TITLE_TEXTURE_KEYS: readonly string[] = TITLE_ASSETS.map((asset) => asset.key);
