import { gameMusic, playSfx } from '../audio/gameAudio';
import { SCENE_MUSIC } from '../config/audio';
import Phaser from 'phaser';
import { MENU_BACK_KEYS, MENU_CONFIRM_KEYS } from '../config/controls';
import { GAME_WIDTH } from '../config/display';
import { DEFAULT_AI_DIFFICULTY } from '../config/match';
import { RegistryKeys } from '../config/registryKeys';
import { SceneKeys } from '../config/sceneKeys';
import { STRINGS } from '../config/strings';
import { ROSTER, getFighterConfig, getPlayableFighters, pickCpuOpponent } from '../fighters/roster';
import { onKeys } from '../input/menuKeys';
import type { FighterConfig } from '../types/fighter';
import { isAIDifficulty, type AIDifficulty, type GameMode } from '../types/match';
import { getStoryLocation, locationLabel } from '../story/locations';
import { campaignStartLocation, hasStoryCampaign, isStoryRival } from '../story/storyProfiles';
import type { StageSelectData } from './StageSelectScene';
import { beginStory } from './story/storyFlow';
import { DifficultySelector } from '../ui/DifficultySelector';
import { ArcadeButton } from '../ui/select/ArcadeButton';
import { drawArcadeFrame } from '../ui/select/arcadeFrame';
import { HeroPanel } from '../ui/select/HeroPanel';
import { RosterCard } from '../ui/select/RosterCard';
import { createSelectBackground } from '../ui/select/SelectBackground';
import {
  CARDS_PER_PAGE,
  SELECT_LAYOUT,
  cardSlot,
  fillerSlots,
  pageCount,
} from '../ui/select/selectLayout';
import { COLORS, arcadeText, bodyText, css } from '../ui/theme';
import { fadeIn, goToScene } from './transitions';

const TITLE_SHINE_MS = 1400;
const TITLE_SHINE_DELAY_MS = 2200;
const FOOTER_HEIGHT = 28;
const TITLE_GLOW_BLUR = 10;
/** Quick fight: pick your fighter, then the rival, then the stage (StageSelectScene). */
const QUICK_FIGHT_STEPS = 3;

/** Which pick this screen is making: in story mode only 'player' is used. */
export type SelectStep = 'player' | 'rival';

export interface CharacterSelectData {
  mode?: GameMode;
  /** Quick fight: open on the rival step (coming back from the stage select). */
  step?: SelectStep;
  playerFighterId?: string;
  /** Preselected card (the player's on the first step, the rival's on the second). */
  cpuFighterId?: string;
}

/**
 * Arcade roster screen built from the playable fighters (ROSTER filtered by `playable`):
 * illustrated map background, a paged grid of fighter cards, a hero panel for the highlighted
 * fighter, the CPU difficulty and a SELECIONAR button. Works for any number of fighters (pages
 * of CARDS_PER_PAGE); in story mode a playable fighter without a campaign is shown locked.
 * Quick fight runs two picks on this screen (your fighter, then the rival; mirror matches are
 * allowed) and hands both to the stage select. ESC on the rival step goes back to the first.
 */
export class CharacterSelectScene extends Phaser.Scene {
  private selectedIndex = 0;
  /** What this screen offers: the playable fighters, in roster order. */
  private fighters: readonly FighterConfig[] = [];
  private cards: RosterCard[] = [];
  private hero!: HeroPanel;
  private difficulty!: DifficultySelector;
  private selectButton!: ArcadeButton;
  private pageLabel: Phaser.GameObjects.Text | null = null;
  private opponentLabel: Phaser.GameObjects.Text | null = null;
  /** Quick fight (any playable fighter) or story (playable fighters with a campaign). */
  private mode: GameMode = 'quick';
  private step: SelectStep = 'player';
  /** Quick fight: the fighter picked on the first step. */
  private player: FighterConfig | null = null;
  private titleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;

  constructor() {
    super(SceneKeys.CharacterSelect);
  }

  create(data?: CharacterSelectData): void {
    this.mode = data?.mode ?? 'quick';
    this.step = 'player';
    this.player = null;
    fadeIn(this);
    gameMusic(this).play(SCENE_MUSIC.characterSelect);
    createSelectBackground(this);

    this.fighters = getPlayableFighters();
    this.selectedIndex = this.fighters.findIndex((fighter) => this.canPick(fighter));
    if (this.selectedIndex < 0) throw new Error('The roster has no playable fighter.');
    if (this.mode === 'quick' && data?.step === 'rival' && data.playerFighterId) {
      this.step = 'rival';
      this.player = getFighterConfig(data.playerFighterId);
      this.selectIfPlayable(data.cpuFighterId ?? pickCpuOpponent(this.player.id).id);
    } else if (data?.playerFighterId) {
      this.selectIfPlayable(data.playerFighterId);
    }

    this.createTopBar();
    this.cards = [];
    this.createCards();
    this.hero = new HeroPanel(this, ROSTER);

    const { difficulty, selectButton, footerY } = SELECT_LAYOUT;
    this.difficulty = new DifficultySelector(
      this,
      difficulty.x,
      difficulty.y,
      difficulty.width,
      difficulty.height,
      this.savedDifficulty(),
      (value) => {
        playSfx(this, 'menu-move');
        this.registry.set(RegistryKeys.aiDifficulty, value);
      },
    );
    this.selectButton = new ArcadeButton(
      this,
      selectButton.x,
      selectButton.y,
      STRINGS.selectButton,
      () => this.confirm(),
      { width: selectButton.width, height: selectButton.height, fontSize: 28, pulse: true },
    );

    this.add
      .rectangle(GAME_WIDTH / 2, footerY, GAME_WIDTH, FOOTER_HEIGHT, COLORS.navyDeep, 0.85)
      .setStrokeStyle(2, COLORS.royal);
    this.hintText = this.add
      .text(GAME_WIDTH / 2, footerY, STRINGS.selectHint, bodyText(13, COLORS.white))
      .setOrigin(0.5)
      .setAlpha(0.92);

    onKeys(this, ['LEFT'], () => this.moveSelection(-1));
    onKeys(this, ['RIGHT'], () => this.moveSelection(1));
    onKeys(this, ['UP'], () => this.difficulty.step(1));
    onKeys(this, ['DOWN'], () => this.difficulty.step(-1));
    onKeys(this, MENU_CONFIRM_KEYS, () => {
      this.selectButton.flash();
      this.confirm();
    });
    onKeys(this, MENU_BACK_KEYS, () => this.back());

    this.refreshSelection();
  }

  /** VOLTAR, the framed title (with a periodic shine), then the pager or the CPU opponent. */
  private createTopBar(): void {
    const { topBarY, backButton, title, pager, opponentBadge } = SELECT_LAYOUT;
    new ArcadeButton(this, backButton.x, topBarY, STRINGS.back, () => this.back(), {
      width: backButton.width,
      height: backButton.height,
      fontSize: 18,
      variant: 'secondary',
    });

    const left = title.x - title.width / 2;
    const top = topBarY - title.height / 2;
    const banner = this.add.graphics();
    drawArcadeFrame(banner, left, top, title.width, title.height, {
      fill: COLORS.violet,
      highlight: COLORS.violetLight,
      border: COLORS.gold,
      inner: COLORS.orange,
      shadow: 5,
    });
    // The shine travels inside the banner, so no mask is needed.
    const shine = this.add.rectangle(left + 16, topBarY, 12, title.height - 16, COLORS.white, 0.22);
    this.tweens.add({
      targets: shine,
      x: left + title.width - 16,
      duration: TITLE_SHINE_MS,
      delay: TITLE_SHINE_DELAY_MS,
      repeatDelay: TITLE_SHINE_DELAY_MS,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.titleText = this.add
      .text(title.x, topBarY, STRINGS.selectTitle, arcadeText(30, COLORS.gold))
      .setOrigin(0.5)
      .setShadow(0, 0, css(COLORS.magenta), TITLE_GLOW_BLUR, true, true);

    if (pageCount(this.fighters.length) > 1) {
      const style = { width: pager.buttonWidth, height: pager.height, fontSize: 20 } as const;
      new ArcadeButton(
        this,
        pager.x - pager.gap,
        topBarY,
        STRINGS.previousFighter,
        () => this.moveSelection(-1),
        { ...style, variant: 'secondary' },
      );
      new ArcadeButton(
        this,
        pager.x + pager.gap,
        topBarY,
        STRINGS.nextFighter,
        () => this.moveSelection(1),
        { ...style, variant: 'secondary' },
      );
      this.pageLabel = this.add
        .text(pager.x, topBarY, '', arcadeText(16, COLORS.white))
        .setOrigin(0.5);
    } else {
      const badge = this.add.graphics();
      drawArcadeFrame(
        badge,
        opponentBadge.x - opponentBadge.width / 2,
        topBarY - opponentBadge.height / 2,
        opponentBadge.width,
        opponentBadge.height,
        { fill: COLORS.navyDeep, fillAlpha: 0.9, border: COLORS.magenta, inner: COLORS.violet },
      );
      this.opponentLabel = this.add
        .text(opponentBadge.x, topBarY, '', arcadeText(17, COLORS.white))
        .setOrigin(0.5);
    }
  }

  private createCards(): void {
    this.fighters.forEach((config, index) => {
      const { x, y } = cardSlot(index);
      this.cards.push(
        new RosterCard(
          this,
          x,
          y,
          config,
          () => {
            // First tap selects, a tap on the selected card confirms.
            if (this.selectedIndex === index) this.confirm();
            else {
              playSfx(this, 'menu-move');
              this.selectedIndex = index;
              this.refreshSelection();
            }
          },
          { selectable: this.canPick(config), lockedTag: this.lockedTag(config) },
        ),
      );
    });
    for (let filler = 0; filler < fillerSlots(this.fighters.length); filler++) {
      const { x, y } = cardSlot(this.fighters.length + filler);
      this.cards.push(new RosterCard(this, x, y, null, () => undefined));
    }
  }

  /** Every card is a playable fighter; story mode also needs a campaign (a story profile). */
  private canPick(config: FighterConfig): boolean {
    return this.mode === 'story' ? hasStoryCampaign(config.id) : config.playable;
  }

  private lockedTag(config: FighterConfig): string {
    if (this.mode !== 'story') return STRINGS.cpuOnly;
    return isStoryRival(config.id) ? STRINGS.storyLockedRival : STRINGS.storyLockedSoon;
  }

  /** Last difficulty chosen in this session (game registry), or the default. */
  private savedDifficulty(): AIDifficulty {
    const saved: unknown = this.registry.get(RegistryKeys.aiDifficulty);
    return isAIDifficulty(saved) ? saved : DEFAULT_AI_DIFFICULTY;
  }

  private moveSelection(step: number): void {
    const count = this.fighters.length;
    for (let i = 1; i <= count; i++) {
      const candidate = (this.selectedIndex + step * i + count * i) % count;
      const config = this.fighters[candidate];
      if (config && this.canPick(config)) {
        if (candidate !== this.selectedIndex) playSfx(this, 'menu-move');
        this.selectedIndex = candidate;
        this.refreshSelection();
        return;
      }
    }
  }

  private refreshSelection(): void {
    const fighter = this.fighters[this.selectedIndex];
    if (!fighter) return;
    const page = Math.floor(this.selectedIndex / CARDS_PER_PAGE);
    const rivalStep = this.step === 'rival';
    this.cards.forEach((card, index) => {
      card.setShown(cardSlot(index).page === page);
      // Picking the rival: the highlight reads CPU and the P1 fighter keeps its tag.
      card.setMarkerLabels(
        rivalStep ? STRINGS.cpuOnly : STRINGS.playerOneTag,
        rivalStep && card.config === this.player ? STRINGS.playerOneTag : null,
      );
      card.setSelected(index === this.selectedIndex);
    });
    this.pageLabel?.setText(STRINGS.selectPage(page + 1, pageCount(this.fighters.length)));
    this.opponentLabel?.setText(this.badgeText(fighter));
    this.titleText.setText(this.titleFor());
    this.hintText.setText(
      this.step === 'rival' && this.player
        ? STRINGS.selectRivalHint(this.player.displayName)
        : STRINGS.selectHint,
    );
    this.hero.show(fighter);
  }

  private titleFor(): string {
    if (this.mode === 'story') return STRINGS.storySelectTitle;
    return this.step === 'rival' ? STRINGS.selectRivalTitle : STRINGS.selectTitle;
  }

  /** Quick fight: the step (1, 2 of 3). Story: where the campaign starts (the fighter's place). */
  private badgeText(fighter: FighterConfig): string {
    if (this.mode === 'story' && hasStoryCampaign(fighter.id)) {
      const start = getStoryLocation(campaignStartLocation(fighter.id));
      return STRINGS.storyStart(locationLabel(start));
    }
    return STRINGS.selectStep(this.step === 'rival' ? 2 : 1, QUICK_FIGHT_STEPS);
  }

  private selectIfPlayable(fighterId: string): void {
    const index = this.fighters.findIndex((f) => f.id === fighterId && this.canPick(f));
    if (index >= 0) this.selectedIndex = index;
  }

  private back(): void {
    playSfx(this, 'menu-back');
    if (this.step === 'rival' && this.player) {
      // Back to the first pick, on the fighter chosen there.
      const player = this.player;
      this.step = 'player';
      this.player = null;
      this.selectIfPlayable(player.id);
      this.refreshSelection();
      return;
    }
    goToScene(this, SceneKeys.Menu);
  }

  private confirm(): void {
    const player = this.fighters[this.selectedIndex];
    if (!player || !this.canPick(player)) return;
    playSfx(this, 'menu-confirm');
    if (this.mode === 'story') {
      this.registry.set(RegistryKeys.aiDifficulty, this.difficulty.value);
      this.cameras.main.flash(150, 255, 255, 255);
      beginStory(this, player.id);
      return;
    }
    if (this.step === 'player') {
      // Second pick: the rival, starting on the roster's suggestion (the next fighter).
      this.step = 'rival';
      this.player = player;
      this.selectIfPlayable(pickCpuOpponent(player.id).id);
      this.cameras.main.flash(120, 255, 255, 255);
      this.refreshSelection();
      return;
    }
    const data: StageSelectData = {
      playerFighterId: this.player?.id ?? player.id,
      cpuFighterId: player.id,
      difficulty: this.difficulty.value,
    };
    this.cameras.main.flash(150, 255, 255, 255);
    goToScene(this, SceneKeys.StageSelect, data);
  }
}
