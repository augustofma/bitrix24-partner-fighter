import { gameMusic, playSfx } from '../../audio/gameAudio';
import { SCENE_MUSIC } from '../../config/audio';
import Phaser from 'phaser';
import { MENU_BACK_KEYS, MENU_CONFIRM_KEYS } from '../../config/controls';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config/display';
import { SceneKeys } from '../../config/sceneKeys';
import { STRINGS } from '../../config/strings';
import { getFighterConfig } from '../../fighters/roster';
import { onKeys } from '../../input/menuKeys';
import { VICTORY_ART } from '../../render/assets/victoryAssets';
import { storyEndingAsset } from '../../render/assets/storyEndingAssets';
import { LoadingBar } from '../../ui/LoadingBar';
import { queueMissing, watchLoad } from '../assetLoading';
import { createPortrait } from '../../render/PortraitView';
import { getStoryLocation, isHomeCountry, locationName } from '../../story/locations';
import { routeCities } from '../../story/storyProgress';
import { createArcadeBackground } from '../../ui/ArcadeBackground';
import { ArcadeButton } from '../../ui/select/ArcadeButton';
import { VictoryCard } from '../../ui/victory/VictoryCard';
import { createVictoryEffects } from '../../ui/victory/VictoryEffects';
import { VICTORY_LAYOUT } from '../../ui/victory/victoryLayout';
import { createResultLine, createVictoryTitle } from '../../ui/victory/victoryText';
import { fadeIn } from '../transitions';
import { getStoryProgress, quitStory, restartStory } from './storyFlow';

const BUTTON = { width: 270, height: 58, fontSize: 20 } as const;
const BUTTON_GAP = 22;
const FALLBACK_PORTRAIT = { width: 220, height: 250 } as const;
const ENTER_MS = 380;
/** With an ending illustration: how long it is shown alone before the title and buttons. */
const ENDING_INTRO_MS = 1600;
/** Slow zoom over the ending illustration (scale reached, duration). */
const ENDING_ZOOM = { scale: 1.06, ms: 14000 } as const;
/** Dark bands behind the title (top) and the result line and buttons (bottom), for legibility. */
/**
 * Title over an ending illustration: smaller and to the right, over the sky, so it never covers
 * the champion (who stands on the left in the illustrations).
 */
const ENDING_TITLE = { x: 655, y: 66, maxWidth: 520 } as const;
const ENDING_SHADE = { top: 150, bottom: 210, alpha: 0.62 } as const;

/**
 * End of a campaign: "CAMPANHA CONCLUÍDA" in the fight lettering, the champion's card, a short
 * cheer with the route flown, and JOGAR NOVAMENTE / VOLTAR AO MENU. Reuses the victory
 * screen's art and pieces (procedural fallback when the art is missing).
 *
 * A champion with an ending illustration (STORY_ENDING_ART) gets it instead of
 * the victory art and the card: full screen, slowly zooming, shown alone for a moment before
 * the title, the cheer and the buttons fade in over darkened bands.
 */
export class CampaignCompleteScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.CampaignComplete);
  }

  /** Safety net: the ending is normally fetched with the campaign's fights (VS screen). */
  preload(): void {
    const fighterId = getStoryProgress(this)?.selectedFighter;
    const ending = fighterId ? storyEndingAsset(fighterId) : undefined;
    if (!ending || queueMissing(this, [ending]) === 0) return;
    new LoadingBar(this);
    watchLoad(this);
  }

  create(): void {
    fadeIn(this);
    gameMusic(this).playSting(SCENE_MUSIC.victory);
    const progress = getStoryProgress(this);
    if (!progress || progress.phase !== 'complete') {
      quitStory(this);
      return;
    }
    const champion = getFighterConfig(progress.selectedFighter);
    const hasArt = Object.values(VICTORY_ART).every(({ key }) => this.textures.exists(key));
    const endingKey = storyEndingAsset(champion.id)?.key;
    const ending = endingKey !== undefined && this.textures.exists(endingKey);

    if (ending) {
      this.createEnding(endingKey);
    } else if (hasArt) {
      this.add
        .image(0, 0, VICTORY_ART.background.key)
        .setOrigin(0)
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    } else {
      createArcadeBackground(this);
    }
    if (!ending) createVictoryEffects(this);

    const { card } = VICTORY_LAYOUT;
    // The ending illustration already shows the champion: no card over it.
    const cardRoot = ending
      ? null
      : hasArt
        ? new VictoryCard(this, VICTORY_ART.cardFrame.key, [champion], champion.displayName)
            .container
        : createPortrait(this, card.x, card.y, champion, FALLBACK_PORTRAIT);
    const title = createVictoryTitle(
      this,
      STRINGS.campaignComplete,
      ending ? ENDING_TITLE : undefined,
    );
    // Two fights in a row at the same place (e.g. Joinville) show it once in the route.
    const places = routeCities(champion.id).filter((id, i, all) => id !== all[i - 1]);
    const placesAbroad = places.some((id) => !isHomeCountry(getStoryLocation(id)));
    const cities = places.map((id) => locationName(getStoryLocation(id)));
    const cheer = createResultLine(this, hasArt ? VICTORY_ART.resultPanel.key : null, [
      {
        // A campaign that went abroad conquered more than Brazil.
        text:
          cities.length > 0 && placesAbroad ? STRINGS.campaignCheerWorld : STRINGS.campaignCheer,
        tone: 'win',
      },
      { text: STRINGS.campaignRoute(cities), tone: 'neutral' },
    ]);

    const playAgain = () => {
      playSfx(this, 'menu-confirm');
      restartStory(this);
    };
    const menu = () => {
      playSfx(this, 'menu-back');
      quitStory(this);
    };
    const { button: at } = VICTORY_LAYOUT;
    const row = this.add.container(at.x, at.y);
    const span = BUTTON.width * 2 + BUTTON_GAP;
    const first = new ArcadeButton(
      this,
      -span / 2 + BUTTON.width / 2,
      0,
      STRINGS.storyPlayAgain,
      playAgain,
      {
        ...BUTTON,
        pulse: true,
      },
    );
    const second = new ArcadeButton(
      this,
      span / 2 - BUTTON.width / 2,
      0,
      STRINGS.backToMenu,
      menu,
      {
        ...BUTTON,
        variant: 'secondary',
      },
    );
    row.add([first, second]);

    const items = [title, cardRoot, cheer, row].filter((item) => item !== null);
    for (const item of items) item.setAlpha(0);
    // Over an ending illustration the buttons only answer once they are on screen: a key still
    // held from the last fight's victory reveals them instead of skipping the ending.
    let revealed = false;
    const reveal = (delay: number) => {
      if (revealed) return;
      revealed = true;
      items.forEach((item, i) => {
        this.tweens.add({ targets: item, alpha: 1, duration: ENTER_MS, delay: delay + i * 220 });
      });
      this.tweens.add({
        targets: title,
        scale: { from: 0.4, to: 1 },
        duration: ENTER_MS + 60,
        delay,
        ease: 'Back.easeOut',
      });
    };
    const introTimer = ending ? this.time.delayedCall(ENDING_INTRO_MS, () => reveal(0)) : null;
    if (!ending) reveal(80);
    /** Runs `action` once the buttons are shown; before that, shows them now. */
    const whenRevealed = (action: () => void) => () => {
      if (revealed) {
        action();
        return;
      }
      introTimer?.remove();
      reveal(0);
    };

    onKeys(
      this,
      MENU_CONFIRM_KEYS,
      whenRevealed(() => {
        first.flash();
        playAgain();
      }),
    );
    onKeys(this, MENU_BACK_KEYS, whenRevealed(menu));
  }

  /** The champion's ending illustration, full screen and slowly zooming, with dark bands. */
  private createEnding(key: string): void {
    const art = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, key)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.tweens.add({
      targets: art,
      scale: art.scale * ENDING_ZOOM.scale,
      duration: ENDING_ZOOM.ms,
      ease: 'Sine.easeOut',
    });
    const { top, bottom, alpha } = ENDING_SHADE;
    const shade = this.add.graphics();
    shade.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, alpha, alpha, 0, 0);
    shade.fillRect(0, 0, GAME_WIDTH, top);
    shade.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, alpha, alpha);
    shade.fillRect(0, GAME_HEIGHT - bottom, GAME_WIDTH, bottom);
    shade.setAlpha(0);
    this.tweens.add({ targets: shade, alpha: 1, duration: ENTER_MS, delay: ENDING_INTRO_MS - 200 });
  }
}
