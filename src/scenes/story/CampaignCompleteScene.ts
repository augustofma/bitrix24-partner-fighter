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

/**
 * End of a campaign: "CAMPANHA CONCLUÍDA" in the fight lettering, the champion's card, a short
 * cheer with the route flown, and JOGAR NOVAMENTE / VOLTAR AO MENU. Reuses the victory
 * screen's art and pieces (procedural fallback when the art is missing).
 */
export class CampaignCompleteScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.CampaignComplete);
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

    if (hasArt) {
      this.add
        .image(0, 0, VICTORY_ART.background.key)
        .setOrigin(0)
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    } else {
      createArcadeBackground(this);
    }
    createVictoryEffects(this);

    const { card } = VICTORY_LAYOUT;
    const cardRoot = hasArt
      ? new VictoryCard(this, VICTORY_ART.cardFrame.key, [champion], champion.displayName).container
      : createPortrait(this, card.x, card.y, champion, FALLBACK_PORTRAIT);
    const title = createVictoryTitle(this, STRINGS.campaignComplete);
    const placesAbroad = routeCities(champion.id).some(
      (id) => !isHomeCountry(getStoryLocation(id)),
    );
    const cities = routeCities(champion.id).map((id) => locationName(getStoryLocation(id)));
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

    [title, cardRoot, cheer, row].forEach((item, i) => {
      item.setAlpha(0);
      this.tweens.add({ targets: item, alpha: 1, duration: ENTER_MS, delay: 80 + i * 220 });
    });
    this.tweens.add({
      targets: title,
      scale: { from: 0.4, to: 1 },
      duration: ENTER_MS + 60,
      delay: 80,
      ease: 'Back.easeOut',
    });

    onKeys(this, MENU_CONFIRM_KEYS, () => {
      first.flash();
      playAgain();
    });
    onKeys(this, MENU_BACK_KEYS, menu);
  }
}
