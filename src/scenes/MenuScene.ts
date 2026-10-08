import { gameMusic, playSfx } from '../audio/gameAudio';
import { SCENE_MUSIC } from '../config/audio';
import Phaser from 'phaser';
import { MENU_BACK_KEYS, MENU_CONFIRM_KEYS } from '../config/controls';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import { SceneKeys } from '../config/sceneKeys';
import { STRINGS } from '../config/strings';
import { ROSTER } from '../fighters/roster';
import { onKeys } from '../input/menuKeys';
import {
  TITLE_ART,
  TITLE_TEXTURE_KEYS,
  TITLE_WIND_PARTS,
  windTextureKey,
} from '../render/assets/titleAssets';
import { drawFigure } from '../render/placeholder/drawFigure';
import { POSES } from '../render/placeholder/poses';
import { createArcadeBackground } from '../ui/ArcadeBackground';
import { ArtButton } from '../ui/ArtButton';
import { MenuButton } from '../ui/MenuButton';
import { ModeMenu } from '../ui/ModeMenu';
import type { GameMode } from '../types/match';
import { COLORS, arcadeText, bodyText } from '../ui/theme';
import { TitleAmbience } from '../ui/title/TitleAmbience';
import { TITLE_ART_LAYOUT } from '../ui/title/titleArtLayout';
import { WindLayer } from '../ui/title/WindLayer';
import { DEFAULT_WIND, WIND_STYLES } from '../ui/title/windMotion';
import { fadeIn, goToScene } from './transitions';

/** Procedural title (art missing): where its JOGAR button sits. */
const BUTTON_POSITION = { x: 480, y: 340 } as const;

/** Center of an art layer from its generated top-left placement. */
function centerOf(box: { x: number; y: number; width: number; height: number }) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
const LOGO_CENTER = centerOf(TITLE_ART_LAYOUT.logo);
const BUTTON_CENTER = centerOf(TITLE_ART_LAYOUT.button);

/** Logo float: rises 8 px and back in ~2.2 s, breathing 1.2% (inside the area cleared behind). */
const LOGO_FLOAT_PX = 8;
const LOGO_FLOAT_MS = 1100;
const LOGO_BREATH_SCALE = 1.012;
const LOGO_BREATH_MS = 2400;

/** Entrance (~0.9 s): fighters light up, logo grows in, START pops last. */
const ENTRANCE = {
  logoMs: 650,
  buttonDelayMs: 420,
  buttonMs: 380,
  hintDelayMs: 650,
  flashMs: 800,
} as const;
/** START: soft idle glow, generous touch target. */
const START_IDLE_GLOW = 0.5;
const START_HIT_PADDING = 22;
/** Hint under START: pulses gently. */
const HINT_PULSE_MS = 1100;
const HINT_MIN_ALPHA = 0.45;
const HINT_DASH = { width: 34, gap: 14 } as const;

/** Emitted by the JOGAR button (art or fallback) when activated. */
const PLAY_EVENT = 'play';

/** Delay before leaving after a keyboard confirm, so the press is visible. */
const KEY_PRESS_MS = 90;

const SILHOUETTE_SCALE = 1.5;

/**
 * Title screen. With the art loaded: illustrated background, a floating logo layer and a real
 * JOGAR button (mouse, touch, Enter/Space). Without it: the previous procedural look.
 */
export class MenuScene extends Phaser.Scene {
  /** Wind-moved parts and arena life of the illustrated title (empty for the procedural one). */
  private wind: WindLayer[] = [];
  private ambience: TitleAmbience | null = null;
  /** Shown with START; hidden while the mode choice is open. */
  private hint: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super(SceneKeys.Menu);
  }

  create(): void {
    fadeIn(this);
    gameMusic(this).play(SCENE_MUSIC.menu);
    this.wind = [];
    this.ambience = null;
    this.hint = [];
    this.events.once('shutdown', () => {
      this.wind.forEach((layer) => layer.destroy());
      this.ambience?.destroy();
      this.wind = [];
      this.ambience = null;
    });
    const startMode = (mode: GameMode) => goToScene(this, SceneKeys.CharacterSelect, { mode });
    const hasArt = TITLE_TEXTURE_KEYS.every((key) => this.textures.exists(key));
    const play = hasArt ? this.createIllustrated() : this.createProcedural();
    const at = hasArt ? BUTTON_CENTER : BUTTON_POSITION;
    // Created after the screen so the mode buttons draw on top of it, where START was.
    const modes = new ModeMenu(this, at.x, at.y, [
      { label: STRINGS.modeStory, onSelect: () => startMode('story') },
      { label: STRINGS.modeQuickFight, onSelect: () => startMode('quick') },
    ]);
    this.bindModeMenu(modes, play);
  }

  /** Every frame: the wind on the fighters and the sparks (render time only). */
  override update(time: number): void {
    const seconds = time / 1000;
    for (const layer of this.wind) layer.update(seconds);
    this.ambience?.update(seconds);
  }

  private setHintVisible(visible: boolean): void {
    for (const item of this.hint) (item as Phaser.GameObjects.Text).setVisible(visible);
  }

  /**
   * JOGAR opens the mode choice in its place (HISTÓRIA / LUTA RÁPIDA). Keyboard: Enter/Space
   * opens and confirms, arrows move, Esc closes it again.
   */
  private bindModeMenu(modes: ModeMenu, play: Phaser.GameObjects.Container): void {
    const open = () => {
      if (modes.isOpen) return;
      playSfx(this, 'menu-confirm');
      play.setVisible(false);
      this.setHintVisible(false);
      modes.open();
    };
    play.on(PLAY_EVENT, open);
    onKeys(this, MENU_CONFIRM_KEYS, () => {
      if (modes.isOpen) modes.confirm();
      else {
        if (play instanceof ArtButton) play.press();
        this.time.delayedCall(KEY_PRESS_MS, open);
      }
    });
    onKeys(this, ['LEFT', 'UP'], () => modes.isOpen && modes.move(-1));
    onKeys(this, ['RIGHT', 'DOWN'], () => modes.isOpen && modes.move(1));
    onKeys(this, MENU_BACK_KEYS, () => {
      if (!modes.isOpen) return;
      playSfx(this, 'menu-back');
      modes.close();
      play.setVisible(true);
      this.setHintVisible(true);
    });
  }

  /**
   * The approved art as layers: background (with the arena lights pulsing and sparks), the
   * wind-moved parts of both fighters (João's hair, collars, backs, hems, sleeves), the floating
   * logo, the real START button and the pulsing hint. Order of creation = drawing order.
   */
  private createIllustrated(): Phaser.GameObjects.Container {
    this.add
      .image(0, 0, TITLE_ART.background.key)
      .setOrigin(0)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.ambience = new TitleAmbience(this, TITLE_ART.glow.key, 0);
    this.wind = TITLE_WIND_PARTS.map((part) => {
      const box = TITLE_ART_LAYOUT.wind[part];
      return new WindLayer(
        this,
        {
          textureKey: windTextureKey(part),
          x: box.x,
          y: box.y,
          anchor: box.anchor,
          strips: box.strips,
          style: WIND_STYLES[part] ?? DEFAULT_WIND,
        },
        0,
      );
    });
    this.lightUpFighters();

    const logo = this.add
      .image(LOGO_CENTER.x, LOGO_CENTER.y, TITLE_ART.logo.key)
      .setScale(0.9)
      .setAlpha(0);
    this.tweens.add({
      targets: logo,
      scale: 1,
      alpha: 1,
      duration: ENTRANCE.logoMs,
      ease: 'Back.easeOut',
      onComplete: () => this.floatLogo(logo),
    });

    const button: ArtButton = new ArtButton(
      this,
      BUTTON_CENTER.x,
      BUTTON_CENTER.y,
      TITLE_ART.button.key,
      () => button.emit(PLAY_EVENT),
      { idleGlow: START_IDLE_GLOW, hitPadding: START_HIT_PADDING },
    );
    button.setAlpha(0).setScale(0.85);
    this.tweens.add({
      targets: button,
      alpha: 1,
      scale: 1,
      delay: ENTRANCE.buttonDelayMs,
      duration: ENTRANCE.buttonMs,
      ease: 'Back.easeOut',
    });
    this.createHint();
    return button;
  }

  /** Constant, smooth float (up 8 px and back) with a very slight breathing. */
  private floatLogo(logo: Phaser.GameObjects.Image): void {
    this.tweens.add({
      targets: logo,
      y: LOGO_CENTER.y - LOGO_FLOAT_PX,
      duration: LOGO_FLOAT_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: logo,
      scale: LOGO_BREATH_SCALE,
      duration: LOGO_BREATH_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** Entrance: each fighter lights up in its own neon (cyan left, violet right) as it appears. */
  private lightUpFighters(): void {
    const sides = [
      { x: 150, tint: 0x6fd0ff },
      { x: GAME_WIDTH - 150, tint: 0xd08bff },
    ];
    for (const { x, tint } of sides) {
      const flash = this.add
        .image(x, GAME_HEIGHT * 0.62, TITLE_ART.glow.key)
        .setDisplaySize(520, 620)
        .setTint(tint)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.7);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: ENTRANCE.flashMs,
        ease: 'Quad.easeOut',
        onComplete: () => flash.destroy(),
      });
    }
  }

  /** "— PRESSIONE START OU TOQUE —" in the arcade face, pulsing gently. */
  private createHint(): void {
    const { x, y } = TITLE_ART_LAYOUT.hint;
    const text = this.add
      .text(x, y, STRINGS.titleHint, arcadeText(15, COLORS.white))
      .setOrigin(0.5)
      .setLetterSpacing(1);
    const half = text.width / 2 + HINT_DASH.gap;
    const dashes = [-1, 1].map((side) =>
      this.add
        .rectangle(x + side * (half + HINT_DASH.width / 2), y, HINT_DASH.width, 2, COLORS.white)
        .setAlpha(0.9),
    );
    this.hint = [text, ...dashes];
    for (const item of this.hint) (item as Phaser.GameObjects.Text).setAlpha(0);
    this.tweens.add({
      targets: this.hint,
      alpha: 1,
      delay: ENTRANCE.hintDelayMs,
      duration: 300,
      onComplete: () =>
        this.tweens.add({
          targets: this.hint,
          alpha: HINT_MIN_ALPHA,
          duration: HINT_PULSE_MS,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        }),
    });
  }

  /** Fallback when the title art is missing: procedural background, text title, button. */
  private createProcedural(): Phaser.GameObjects.Container {
    createArcadeBackground(this);
    this.drawSilhouettes();

    const centerX = GAME_WIDTH / 2;
    this.add.text(centerX, 120, STRINGS.titleTop, arcadeText(44, COLORS.cyan)).setOrigin(0.5);
    const title = this.add
      .text(centerX, 190, STRINGS.titleBottom, arcadeText(72, COLORS.gold, COLORS.magenta))
      .setOrigin(0.5);
    this.tweens.add({
      targets: title,
      scale: 1.04,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const button: MenuButton = new MenuButton(this, centerX, BUTTON_POSITION.y, STRINGS.play, () =>
      button.emit(PLAY_EVENT),
    ).setHighlighted(true);

    const hint = this.add
      .text(centerX, 392, STRINGS.pressStart, arcadeText(16, COLORS.white))
      .setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
    // Hidden under the mode menu like the illustrated hint.
    this.hint = [hint];

    this.add
      .text(centerX, GAME_HEIGHT - 44, STRINGS.disclaimer, bodyText(13, COLORS.white))
      .setOrigin(0.5)
      .setAlpha(0.6);
    this.add
      .text(GAME_WIDTH - 12, GAME_HEIGHT - 10, STRINGS.version, bodyText(12, COLORS.white))
      .setOrigin(1, 1)
      .setAlpha(0.5);
    return button;
  }

  /** The first two roster fighters facing each other on the sides of the title. */
  private drawSilhouettes(): void {
    const [left, right] = ROSTER;
    const sides = [
      { config: left, x: 110, facing: 1 },
      { config: right, x: GAME_WIDTH - 110, facing: -1 },
    ];
    for (const { config, x, facing } of sides) {
      if (!config) continue;
      const g = this.add
        .graphics()
        .setPosition(x, GAME_HEIGHT - 70)
        .setAlpha(0.85);
      g.setScale(facing * SILHOUETTE_SCALE, SILHOUETTE_SCALE);
      drawFigure(g, POSES.block, config.palette);
    }
  }
}
