import type { FighterConfig } from '../../types/fighter';

/*
 * Pure description of what must be loaded for the roster. BootScene turns these requests
 * into Phaser loader calls, so adding a fighter never requires touching BootScene.
 */

export type AssetRequest =
  | { type: 'image'; key: string; path: string }
  | { type: 'spritesheet'; key: string; path: string; frameWidth: number; frameHeight: number }
  /** A web font; `key` is the CSS font-family it registers. */
  | { type: 'font'; key: string; path: string }
  /** Music or sound: `path` first, then `altPaths`; the browser plays the first it supports. */
  | { type: 'audio'; key: string; path: string; altPaths: readonly string[] };

/** Texture key of a portrait image (derived from its path, so it is unique and shareable). */
export function portraitTextureKey(path: string): string {
  return `portrait:${path}`;
}

/** Every texture declared by the roster, without duplicates (first declaration wins). */
export function collectFighterAssets(roster: readonly FighterConfig[]): AssetRequest[] {
  const requests = new Map<string, AssetRequest>();
  for (const { assets } of roster) {
    if (assets.portrait) {
      const key = portraitTextureKey(assets.portrait);
      if (!requests.has(key)) requests.set(key, { type: 'image', key, path: assets.portrait });
    }
    const sheet = assets.sprite?.sheet;
    if (sheet && !requests.has(sheet.key)) {
      requests.set(sheet.key, {
        type: 'spritesheet',
        key: sheet.key,
        path: sheet.path,
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      });
    }
  }
  return [...requests.values()];
}

/** Texture keys that must use nearest-neighbour filtering (fighters with `pixelArt: true`). */
export function pixelArtTextureKeys(roster: readonly FighterConfig[]): string[] {
  const keys = new Set<string>();
  for (const { assets } of roster) {
    if (!assets.pixelArt) continue;
    if (assets.portrait) keys.add(portraitTextureKey(assets.portrait));
    if (assets.sprite) keys.add(assets.sprite.sheet.key);
  }
  return [...keys];
}
