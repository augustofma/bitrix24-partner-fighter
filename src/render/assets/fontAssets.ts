import { FONT_FILES } from '../../config/fonts';
import type { AssetRequest } from './fighterAssets';

/**
 * Every bundled font (see config/fonts.ts). The family name is the loader key, so text styles
 * refer to it directly. If one fails to load, its fallbacks in GAME_FONTS are used.
 */
export const FONT_ASSETS: readonly AssetRequest[] = FONT_FILES.map((font) => ({
  type: 'font',
  key: font.family,
  path: font.path,
}));
