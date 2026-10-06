import type { AssetRequest } from './fighterAssets';

/**
 * Layers of the title screen art (public/ui/title/, produced by
 * scripts/title-art/prepare_title_art.py). The logo and the JOGAR button are separate layers
 * so they can move; the background has both removed, so nothing is ever shown twice.
 */
export const TITLE_ART = {
  background: { type: 'image', key: 'title:background', path: 'ui/title/background.jpg' },
  logo: { type: 'image', key: 'title:logo', path: 'ui/title/logo.png' },
  button: { type: 'image', key: 'title:button', path: 'ui/title/button.png' },
} as const satisfies Record<string, AssetRequest>;

export const TITLE_ASSETS: readonly AssetRequest[] = Object.values(TITLE_ART);
