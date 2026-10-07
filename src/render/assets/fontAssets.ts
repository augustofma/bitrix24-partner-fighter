import type { AssetRequest } from './fighterAssets';

/**
 * Display font of the victory title ("<NAME> VENCEU!"): Bangers, SIL Open Font License 1.1
 * (public/fonts/bangers/OFL.txt). Bundled with the game so the lettering looks the same on
 * every device; if it fails to load, the arcade fallback stack is used.
 */
export const TITLE_FONT = {
  type: 'font',
  key: 'Bangers',
  path: 'fonts/bangers/Bangers-Regular.ttf',
} as const satisfies AssetRequest;

export const FONT_ASSETS: readonly AssetRequest[] = [TITLE_FONT];
