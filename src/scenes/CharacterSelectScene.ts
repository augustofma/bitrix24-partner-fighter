import { gameMusic, playSfx } from '../audio/gameAudio';
import { SCENE_MUSIC } from '../config/audio';
import Phaser from 'phaser';
import { MENU_BACK_KEYS, MENU_CONFIRM_KEYS } from '../config/controls';
import { GAME_WIDTH } from '../config/display';
import { DEFAULT_AI_DIFFICULTY } from '../config/match';
import { RegistryKeys } from '../config/registryKeys';
import { SceneKeys } from '../config/sceneKeys';
import { STRINGS } from '../config/strings';
import { ROSTER, pickCpuOpponent } from '../fighters/roster';
import { onKeys } from '../input/menuKeys';
import type { FighterConfig } from '../types/fighter';
import { isAIDifficulty, type AIDifficulty, type GameMode, type MatchSetup } from '../types/match';
import { getStoryLocation, locationLabel } from '../story/locations';
import {
  campaignStartLocation,
  hasStoryCampaign,
  isStoryRival,
  quickFightStageId,
} from '../story/storyProfiles';
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

/**
 * Arcade roster screen built from ROSTER: illustrated map background, a paged grid of fighter
 * cards, a hero panel for the highlighted fighter, the CPU difficulty and a SELECIONAR button.
 * Works for any roster size; non-selectable fighters are shown locked (CPU only).
 */
export class CharacterSelectScene extends Phaser.Scene {
  private selectedIndex = 0;
  private cards: RosterCard[] = [];
  private hero!: HeroPanel;
  private difficulty!: DifficultySelector;
  private selectButton!: ArcadeButton;
  private pageLabel: Phaser.GameObjects.Text | null = null;
  private opponentLabel: Phaser.GameObjects.Text | null = null;
  /** Quick fight (any selectable fighter) or story (fighters with a campaign). */
  private mode: GameMode = 'quick';

  constructor() {
    super(SceneKeys.CharacterSelect);
  }

  create(data?: { mode?: GameMode }): void {
    this.mode = data?.mode ?? 'quick';
    fadeIn(this);
    gameMusic(this).play(SCENE_MUSIC.characterSelect);
    createSelectBackground(this);

    this.selectedIndex = ROSTER.findIndex((fighter) => this.canPick(fighter));
    if (this.selectedIndex < 0) throw new Error('The roster has no selectable fighter.');

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
    this.add
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
    this.add
      .text(
        title.x,
        topBarY,
        this.mode === 'story' ? STRINGS.storySelectTitle : STRINGS.selectTitle,
        arcadeText(30, COLORS.gold),
      )
      .setOrigin(0.5)
      .setShadow(0, 0, css(COLORS.magenta), TITLE_GLOW_BLUR, true, true);

    if (pageCount(ROSTER.length) > 1) {
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
    ROSTER.forEach((config, index) => {
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
    for (let filler = 0; filler < fillerSlots(ROSTER.length); filler++) {
      const { x, y } = cardSlot(ROSTER.length + filler);
      this.cards.push(new RosterCard(this, x, y, null, () => undefined));
    }
  }

  /** In story mode only fighters with a campaign can be picked; otherwise `selectable`. */
  private canPick(config: FighterConfig): boolean {
    return this.mode === 'story' ? hasStoryCampaign(config.id) : config.selectable;
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
    const count = ROSTER.length;
    for (let i = 1; i <= count; i++) {
      const candidate = (this.selectedIndex + step * i + count * i) % count;
      const config = ROSTER[candidate];
      if (config && this.canPick(config)) {
        if (candidate !== this.selectedIndex) playSfx(this, 'menu-move');
        this.selectedIndex = candidate;
        this.refreshSelection();
        return;
      }
    }
  }

  private refreshSelection(): void {
    const fighter = ROSTER[this.selectedIndex];
    if (!fighter) return;
    const page = Math.floor(this.selectedIndex / CARDS_PER_PAGE);
    this.cards.forEach((card, index) => {
      card.setShown(cardSlot(index).page === page);
      card.setSelected(index === this.selectedIndex);
    });
    this.pageLabel?.setText(STRINGS.selectPage(page + 1, pageCount(ROSTER.length)));
    this.opponentLabel?.setText(this.badgeText(fighter));
    this.hero.show(fighter);
  }

  /** Quick fight: the CPU opponent. Story: where the campaign starts (the fighter's place). */
  private badgeText(fighter: FighterConfig): string {
    if (this.mode === 'story' && hasStoryCampaign(fighter.id)) {
      const start = getStoryLocation(campaignStartLocation(fighter.id));
      return STRINGS.storyStart(locationLabel(start));
    }
    return STRINGS.selectOpponent(pickCpuOpponent(fighter.id).displayName);
  }

  private back(): void {
    playSfx(this, 'menu-back');
    goToScene(this, SceneKeys.Menu);
  }

  private confirm(): void {
    const player = ROSTER[this.selectedIndex];
    if (!player || !this.canPick(player)) return;
    playSfx(this, 'menu-confirm');
    if (this.mode === 'story') {
      this.registry.set(RegistryKeys.aiDifficulty, this.difficulty.value);
      this.cameras.main.flash(150, 255, 255, 255);
      beginStory(this, player.id);
      return;
    }
    const cpu = pickCpuOpponent(player.id);
    const setup: MatchSetup = {
      playerFighterId: player.id,
      cpuFighterId: cpu.id,
      // The fighters' home city picks the arena (e.g. Recife -> Marco Zero).
      stageId: quickFightStageId(player.id, cpu.id),
      difficulty: this.difficulty.value,
    };
    this.cameras.main.flash(150, 255, 255, 255);
    goToScene(this, SceneKeys.Versus, setup);
  }
}
