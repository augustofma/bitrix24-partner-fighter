import Phaser from 'phaser';
import { BACKGROUND_COLOR, GAME_HEIGHT, GAME_WIDTH } from './config/display';
import { AudioLoaderScene } from './scenes/AudioLoaderScene';
import { BootScene } from './scenes/BootScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { FightScene } from './scenes/FightScene';
import { MenuScene } from './scenes/MenuScene';
import { PauseScene } from './scenes/PauseScene';
import { CampaignCompleteScene } from './scenes/story/CampaignCompleteScene';
import { EndingGalleryScene } from './scenes/EndingGalleryScene';
import { StoryMapScene } from './scenes/story/StoryMapScene';
import { StageSelectScene } from './scenes/StageSelectScene';
import { VersusScene } from './scenes/VersusScene';
import { VictoryScene } from './scenes/VictoryScene';
import { enableTapToFullscreen } from './utils/fullscreen';

/** Max simultaneous touches (d-pad + 2 action buttons + spare). */
const ACTIVE_POINTERS = 4;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: BACKGROUND_COLOR,
  banner: false,
  scale: {
    // Keep 16:9 and letterbox: never stretches the fighters.
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: ACTIVE_POINTERS,
  },
  render: {
    antialias: true,
    roundPixels: false,
  },
  // Order matters only for the first scene (Boot).
  scene: [
    BootScene,
    AudioLoaderScene,
    MenuScene,
    CharacterSelectScene,
    StageSelectScene,
    StoryMapScene,
    VersusScene,
    FightScene,
    PauseScene,
    VictoryScene,
    CampaignCompleteScene,
    EndingGalleryScene,
  ],
};

const game = new Phaser.Game(config);
enableTapToFullscreen();

// The game draws its own loading screen from here on: drop the HTML placeholder (index.html).
game.events.once(Phaser.Core.Events.READY, () => {
  document.getElementById('boot-status')?.remove();
  try {
    sessionStorage.removeItem('bpf-boot-reload');
  } catch {
    // Storage blocked (private mode): the reload guard simply is not reset.
  }
});

// Dev-only handle for debugging and automated smoke tests (stripped from production builds).
if (import.meta.env.DEV) {
  (window as unknown as { __BPF_GAME__: Phaser.Game }).__BPF_GAME__ = game;
}
