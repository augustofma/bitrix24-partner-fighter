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

/** Texture key of a special-effect image (emblem / glyph), derived from its path. */
export function vfxTextureKey(path: string): string {
  return `vfx:${path}`;
}

/**
 * Every texture declared by the roster, without duplicates (first declaration wins). With
 * `sheets: false`, only the light ones (portraits, effect emblems): the sprite sheets are the
 * heavy part and are loaded per fight.
 */
export function collectFighterAssets(
  roster: readonly FighterConfig[],
  { sheets = true }: { sheets?: boolean } = {},
): AssetRequest[] {
  const requests = new Map<string, AssetRequest>();
  for (const { assets } of roster) {
    if (assets.portrait) {
      const key = portraitTextureKey(assets.portrait);
      if (!requests.has(key)) requests.set(key, { type: 'image', key, path: assets.portrait });
    }
    for (const effect of Object.values(assets.specialEffects ?? {})) {
      for (const path of [effect.emblem, effect.glyph]) {
        if (!path) continue;
        const key = vfxTextureKey(path);
        if (!requests.has(key)) requests.set(key, { type: 'image', key, path });
      }
    }
    const sheet = sheets ? assets.sprite?.sheet : undefined;
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
  // Effect emblems are pixel art for every fighter.
  for (const { assets } of roster) {
    for (const effect of Object.values(assets.specialEffects ?? {})) {
      for (const path of [effect.emblem, effect.glyph]) if (path) keys.add(vfxTextureKey(path));
    }
  }
  return [...keys];
}
