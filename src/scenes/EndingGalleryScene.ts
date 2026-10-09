import Phaser from 'phaser';
import { gameMusic, playSfx } from '../audio/gameAudio';
import { SCENE_MUSIC } from '../config/audio';
import { MENU_BACK_KEYS, MENU_CONFIRM_KEYS } from '../config/controls';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import { SceneKeys } from '../config/sceneKeys';
import { STRINGS } from '../config/strings';
import { getFighterConfig } from '../fighters/roster';
import { onKeys } from '../input/menuKeys';
import { portraitTextureKey } from '../render/assets/fighterAssets';
import { storyEndingAsset } from '../render/assets/storyEndingAssets';
import {
  allEndingsUnlocked,
  galleryEntries,
  galleryRewardFighters,
  loadUnlockedEndings,
  type GalleryEntry,
} from '../story/endingGallery';
import { ControlsHint } from '../ui/ControlsHint';
import {
  GALLERY_LAYOUT,
  galleryGrid,
  moveInGallery,
  type GalleryCard,
} from '../ui/gallery/galleryLayout';
import { LoadingBar } from '../ui/LoadingBar';
import { ArcadeButton } from '../ui/select/ArcadeButton';
import { drawArcadeFrame } from '../ui/select/arcadeFrame';
import { createSelectBackground } from '../ui/select/SelectBackground';
import { COLORS, arcadeText, bodyText, css } from '../ui/theme';
import { queueMissing, watchLoad } from './assetLoading';
import { fadeIn, goToScene } from './transitions';

const TITLE_GLOW_BLUR = 10;
const FOOTER_HEIGHT = 28;
const FOCUS_PAD = 5;
const VIEWER_ZOOM = { scale: 1.06, ms: 9000 } as const;

/**
 * Ending gallery, from the main menu: one card per story fighter. A completed campaign unlocks
 * that fighter's ending illustration (thumbnail, full screen on ENTER or tap); a locked one
 * shows the fighter's dark silhouette and what to do to unlock it. The x/y counter is the hook
 * to finish the story with everyone.
 */
export class EndingGalleryScene extends Phaser.Scene {
  private entries: GalleryEntry[] = [];
  private cards: GalleryCard[] = [];
  private columns = 1;
  private focus = 0;
  private focusFrame!: Phaser.GameObjects.Graphics;
  private caption!: Phaser.GameObjects.Text;
  private viewer: { container: Phaser.GameObjects.Container; index: number } | null = null;

  constructor() {
    super(SceneKeys.EndingGallery);
  }

  /** The unlocked endings' art (not loaded at boot), behind a loading bar when missing. */
  preload(): void {
    const unlocked = loadUnlockedEndings();
    const assets = unlocked.flatMap((id) => storyEndingAsset(id) ?? []);
    if (queueMissing(this, assets) === 0) return;
    new LoadingBar(this);
    watchLoad(this);
  }

  create(): void {
    this.entries = galleryEntries(loadUnlockedEndings());
    const grid = galleryGrid(this.entries.length);
    this.cards = grid.cards;
    this.columns = grid.columns;
    this.focus = Math.max(
      0,
      this.entries.findIndex((entry) => entry.unlocked),
    );
    this.viewer = null;

    fadeIn(this);
    gameMusic(this).play(SCENE_MUSIC.menu);
    createSelectBackground(this);
    this.createTopBar();
    this.entries.forEach((entry, i) => this.createCard(entry, this.cards[i]!, i));
    this.focusFrame = this.add.graphics();
    this.caption = this.add
      .text(GAME_WIDTH / 2, GALLERY_LAYOUT.caption.y, '', bodyText(16, COLORS.white))
      .setOrigin(0.5);
    this.createRewardLine();
    const { footerY } = GALLERY_LAYOUT;
    this.add
      .rectangle(GAME_WIDTH / 2, footerY, GAME_WIDTH, FOOTER_HEIGHT, COLORS.navyDeep, 0.85)
      .setStrokeStyle(2, COLORS.royal);
    new ControlsHint(this, GAME_WIDTH / 2, footerY, STRINGS.galleryHint, GAME_WIDTH);

    const move = (direction: 'left' | 'right' | 'up' | 'down') => () => {
      if (this.viewer) {
        if (direction === 'left' || direction === 'right') this.cycleViewer(direction);
        return;
      }
      playSfx(this, 'menu-move');
      this.setFocus(moveInGallery(this.focus, direction, this.entries.length, this.columns));
    };
    onKeys(this, ['LEFT'], move('left'));
    onKeys(this, ['RIGHT'], move('right'));
    onKeys(this, ['UP'], move('up'));
    onKeys(this, ['DOWN'], move('down'));
    onKeys(this, MENU_CONFIRM_KEYS, () => {
      if (this.viewer) this.closeViewer();
      else this.open(this.focus);
    });
    onKeys(this, MENU_BACK_KEYS, () => {
      if (this.viewer) this.closeViewer();
      else this.back();
    });
    this.setFocus(this.focus);
  }

  /**
   * The gallery's prize: a hidden fighter (the final boss) unlocked with every ending. Teased
   * while incomplete, announced once complete.
   */
  private createRewardLine(): void {
    const rewards = galleryRewardFighters();
    if (rewards.length === 0) return;
    const complete = allEndingsUnlocked(loadUnlockedEndings());
    const names = rewards.map((fighter) => fighter.displayName).join(' E ');
    this.add
      .text(
        GAME_WIDTH / 2,
        GALLERY_LAYOUT.reward.y,
        complete ? STRINGS.galleryReward(names) : STRINGS.galleryRewardTeaser,
        complete ? arcadeText(16, COLORS.gold) : bodyText(13, COLORS.neon),
      )
      .setOrigin(0.5)
      .setShadow(0, 0, css(COLORS.ink), 6, true, true);
  }

  private createTopBar(): void {
    const { topBarY, backButton, title, counter } = GALLERY_LAYOUT;
    new ArcadeButton(this, backButton.x, topBarY, STRINGS.back, () => this.back(), {
      width: backButton.width,
      height: backButton.height,
      fontSize: 18,
      variant: 'secondary',
    });
    drawArcadeFrame(
      this.add.graphics(),
      title.x - title.width / 2,
      topBarY - title.height / 2,
      title.width,
      title.height,
      {
        fill: COLORS.violet,
        highlight: COLORS.violetLight,
        border: COLORS.gold,
        inner: COLORS.orange,
        shadow: 5,
      },
    );
    this.add
      .text(title.x, topBarY, STRINGS.galleryTitle, arcadeText(28, COLORS.gold))
      .setOrigin(0.5)
      .setShadow(0, 0, css(COLORS.magenta), TITLE_GLOW_BLUR, true, true);
    const unlocked = this.entries.filter((entry) => entry.unlocked).length;
    const complete = unlocked === this.entries.length;
    drawArcadeFrame(
      this.add.graphics(),
      counter.x - counter.width / 2,
      topBarY - counter.height / 2,
      counter.width,
      counter.height,
      {
        fill: COLORS.navyDeep,
        fillAlpha: 0.9,
        border: complete ? COLORS.gold : COLORS.magenta,
        inner: COLORS.violet,
      },
    );
    this.add
      .text(
        counter.x,
        topBarY,
        STRINGS.galleryCount(unlocked, this.entries.length),
        arcadeText(17, complete ? COLORS.gold : COLORS.white),
      )
      .setOrigin(0.5);
  }

  /** A card: the ending's thumbnail (unlocked) or the fighter's silhouette (locked). */
  private createCard(entry: GalleryEntry, card: GalleryCard, index: number): void {
    const { x, y, width, thumbHeight } = card;
    const { nameHeight } = GALLERY_LAYOUT;
    const fighter = getFighterConfig(entry.fighterId);
    const artKey = storyEndingAsset(entry.fighterId)?.key;
    const frame = this.add.graphics();
    drawArcadeFrame(frame, x, y, width, thumbHeight + nameHeight, {
      fill: COLORS.navyDeep,
      fillAlpha: 0.95,
      border: entry.unlocked ? COLORS.gold : COLORS.royal,
      inner: entry.unlocked ? COLORS.orange : COLORS.indigo,
      shadow: 4,
    });

    const inset = 4;
    const thumb = { x: x + inset, y: y + inset, w: width - inset * 2, h: thumbHeight - inset };
    if (entry.unlocked && artKey && this.textures.exists(artKey)) {
      this.add.image(thumb.x, thumb.y, artKey).setOrigin(0).setDisplaySize(thumb.w, thumb.h);
    } else {
      this.add.rectangle(thumb.x, thumb.y, thumb.w, thumb.h, COLORS.ink, 1).setOrigin(0);
      const portrait = fighter.assets.portrait ? portraitTextureKey(fighter.assets.portrait) : null;
      if (portrait && this.textures.exists(portrait)) {
        // Unlocked without art: the portrait. Locked: the portrait as a dark silhouette.
        const image = this.add.image(thumb.x + thumb.w / 2, thumb.y + thumb.h, portrait);
        image.setOrigin(0.5, 1).setScale((thumb.h * 0.95) / image.height);
        if (!entry.unlocked) image.setTint(0x000000).setAlpha(0.85);
      }
      if (!entry.unlocked) {
        this.add
          .text(thumb.x + thumb.w / 2, thumb.y + thumb.h / 2 - 8, '?', arcadeText(44, COLORS.neon))
          .setOrigin(0.5)
          .setAlpha(0.9);
        this.add
          .text(
            thumb.x + thumb.w / 2,
            thumb.y + thumb.h - 14,
            STRINGS.galleryLocked,
            arcadeText(12, COLORS.white),
          )
          .setOrigin(0.5)
          .setAlpha(0.7);
      }
    }
    this.add
      .text(
        x + width / 2,
        y + thumbHeight + nameHeight / 2,
        fighter.displayName,
        arcadeText(15, entry.unlocked ? COLORS.gold : COLORS.white),
      )
      .setOrigin(0.5)
      .setAlpha(entry.unlocked ? 1 : 0.55);

    const hit = this.add
      .zone(x, y, width, thumbHeight + nameHeight)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => !this.viewer && this.setFocus(index));
    hit.on('pointerup', () => {
      if (this.viewer) return;
      this.setFocus(index);
      this.open(index);
    });
  }

  private setFocus(index: number): void {
    this.focus = index;
    const card = this.cards[index];
    const entry = this.entries[index];
    if (!card || !entry) return;
    const height = card.thumbHeight + GALLERY_LAYOUT.nameHeight;
    this.focusFrame
      .clear()
      .lineStyle(3, COLORS.neon, 1)
      .strokeRect(
        card.x - FOCUS_PAD,
        card.y - FOCUS_PAD,
        card.width + FOCUS_PAD * 2,
        height + FOCUS_PAD * 2,
      );
    const name = getFighterConfig(entry.fighterId).displayName;
    const all = this.entries.every((e) => e.unlocked);
    this.caption
      .setText(
        entry.unlocked
          ? all
            ? `${STRINGS.galleryAllUnlocked}  ${STRINGS.galleryOpenHint(name)}`
            : STRINGS.galleryOpenHint(name)
          : STRINGS.galleryLockedHint(name),
      )
      .setColor(css(entry.unlocked ? COLORS.gold : COLORS.white));
  }

  /** Full-screen view of an unlocked ending (slow zoom, the fighter's name). */
  private open(index: number): void {
    const entry = this.entries[index];
    const key = entry && storyEndingAsset(entry.fighterId)?.key;
    if (!entry?.unlocked || !key || !this.textures.exists(key)) {
      playSfx(this, 'menu-back');
      return;
    }
    playSfx(this, 'menu-confirm');
    this.closeViewer(false);
    const container = this.add.container(0, 0).setDepth(100);
    const art = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, key)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.tweens.add({
      targets: art,
      scale: art.scale * VIEWER_ZOOM.scale,
      duration: VIEWER_ZOOM.ms,
      ease: 'Sine.easeOut',
    });
    const band = this.add
      .rectangle(0, GAME_HEIGHT - 44, GAME_WIDTH, 44, COLORS.ink, 0.7)
      .setOrigin(0);
    const name = this.add
      .text(
        24,
        GAME_HEIGHT - 22,
        getFighterConfig(entry.fighterId).displayName,
        arcadeText(24, COLORS.gold),
      )
      .setOrigin(0, 0.5);
    const hint = this.add
      .text(
        GAME_WIDTH - 24,
        GAME_HEIGHT - 22,
        STRINGS.galleryViewerHint,
        bodyText(13, COLORS.white),
      )
      .setOrigin(1, 0.5)
      .setAlpha(0.75);
    const closer = this.add.zone(0, 0, GAME_WIDTH, GAME_HEIGHT).setOrigin(0).setInteractive();
    closer.on('pointerup', () => this.closeViewer());
    container.add([art, band, name, hint, closer]).setAlpha(0);
    this.tweens.add({ targets: container, alpha: 1, duration: 200 });
    this.viewer = { container, index };
  }

  /** ← → in the viewer: the previous / next unlocked ending. */
  private cycleViewer(direction: 'left' | 'right'): void {
    if (!this.viewer) return;
    const count = this.entries.length;
    const step = direction === 'right' ? 1 : -1;
    for (let i = 1; i < count; i++) {
      const next = (((this.viewer.index + step * i) % count) + count) % count;
      if (this.entries[next]?.unlocked) {
        this.setFocus(next);
        this.open(next);
        return;
      }
    }
  }

  private closeViewer(withSound = true): void {
    if (!this.viewer) return;
    if (withSound) playSfx(this, 'menu-back');
    this.viewer.container.destroy();
    this.viewer = null;
  }

  private back(): void {
    playSfx(this, 'menu-back');
    goToScene(this, SceneKeys.Menu);
  }
}
