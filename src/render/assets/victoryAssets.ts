import type { AssetRequest } from './fighterAssets';

/**
 * Layers of the victory screen art (public/ui/victory/, produced by
 * scripts/victory-art/prepare_victory_art.py). Everything that depends on the match (title,
 * portrait, name, result line) is drawn by VictoryScene on top of them.
 */
export const VICTORY_ART = {
  background: { type: 'image', key: 'victory:background', path: 'ui/victory/background.jpg' },
  cardFrame: { type: 'image', key: 'victory:card-frame', path: 'ui/victory/card-frame.png' },
  resultPanel: { type: 'image', key: 'victory:result-panel', path: 'ui/victory/result-panel.png' },
  button: { type: 'image', key: 'victory:button', path: 'ui/victory/button.png' },
} as const satisfies Record<string, AssetRequest>;

export const VICTORY_ASSETS: readonly AssetRequest[] = Object.values(VICTORY_ART);
