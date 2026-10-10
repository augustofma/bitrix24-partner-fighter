import { ANNOUNCER_VOICE, roundVoice } from '../audio/announcerVoice';
import { combatSfx } from '../audio/combatSfx';
import { StageAmbience } from '../audio/StageAmbience';
import { gameMusic, gameSfx } from '../audio/gameAudio';
import { MUSIC_FADE, crowdSfx, stageMusic } from '../config/audio';
import Phaser from 'phaser';
import { DEBUG_TOGGLE_KEY, PAUSE_KEYS, PLAYER_ONE_KEYS } from '../config/controls';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import { SceneKeys } from '../config/sceneKeys';
import { FIXED_STEP_MS, MAX_STEPS_PER_FRAME } from '../config/simulation';
import { STRINGS } from '../config/strings';
import { AIController } from '../controllers/AIController';
import { aiProfileFor } from '../controllers/aiProfiles';
import type { FighterController } from '../controllers/FighterController';
import { PlayerController } from '../controllers/PlayerController';
import { FightSimulation, type SimulationEvent } from '../core/FightSimulation';
import { getFighterConfig } from '../fighters/roster';
import { KeyboardInputSource } from '../input/KeyboardInputSource';
import { onKeys } from '../input/menuKeys';
import { createFighterView } from '../render/createFighterView';
import { DebugOverlay } from '../render/DebugOverlay';
import { FightCamera } from '../render/FightCamera';
import type { FighterView } from '../render/FighterView';
import { HitEffects } from '../render/HitEffects';
import { SpecialEffects } from '../render/special/SpecialEffects';
import { createStageView } from '../render/stage/createStageView';
import { crowdReaction } from '../render/stage/crowdReaction';
import type { StageBackdrop } from '../render/stage/StageBackdrop';
import { matchAssets } from '../render/assets/sceneAssets';
import { getStageConfig } from '../stages/stageRegistry';
import { LoadingBar } from '../ui/LoadingBar';
import { queueMissing, watchLoad } from './assetLoading';
import type { InputSource } from '../types/input';
import type { MatchResult, MatchSetup, RoundResult } from '../types/match';
import type { CrowdReaction, StageConfig } from '../types/stage';
import { Announcer } from '../ui/Announcer';
import { ComboCounter } from '../ui/hud/ComboCounter';
import { ComboTracker } from '../ui/hud/comboTracker';
import { ControlsHint } from '../ui/ControlsHint';
import { FightHud } from '../ui/FightHud';
import { PerfectCall } from '../ui/PerfectCall';
import { COLORS, DEPTH, arcadeText, bodyText } from '../ui/theme';
import { TouchControls } from '../ui/TouchControls';
import { readUrlFlag, shouldShowTouchControls } from '../utils/device';
import { endMatch } from './story/storyFlow';
import { fadeIn, isLeaving } from './transitions';
import { TouchCircle } from '../ui/TouchCircle';

/**
 * PERFECT comes this long after K.O. / TIME OVER, so both calls are read; with its ~1.6 s on
 * screen it is over before the round outro (3.2 s) hands over to the next round or the
 * victory screen.
 */
const PERFECT_DELAY_MS = 1300;

/**
 * Glue between the pure FightSimulation and Phaser:
 * reads controllers -> steps the simulation at a fixed 60 Hz -> renders the state.
 * No gameplay rules live here.
 */
/** Fixed controls bar at the bottom of the screen (keyboard players). */
const CONTROLS_BAR_HEIGHT = 24;
const CONTROLS_BAR_Y = GAME_HEIGHT - CONTROLS_BAR_HEIGHT / 2;
/** Touch pause button: bottom center, between the stick and the action buttons. */
const PAUSE_BUTTON = { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 34, radius: 22 };

export class FightScene extends Phaser.Scene {
  private setup!: MatchSetup;
  private simulation!: FightSimulation;
  private controllers!: readonly [FighterController, FighterController];
  private views!: readonly FighterView[];
  private fightCamera!: FightCamera;
  private hud!: FightHud;
  private announcer!: Announcer;
  private perfectCall!: PerfectCall;
  /** PERFECT waiting for the K.O. / TIME OVER call to be read first. */
  private pendingPerfect: Phaser.Time.TimerEvent | null = null;
  private effects!: HitEffects;
  private specialEffects!: SpecialEffects;
  private debugOverlay!: DebugOverlay;
  private stageView!: StageBackdrop;
  private accumulatorMs = 0;
  /** Simulation steps since the fight began (the combo counter's clock). */
  private simFrame = 0;
  private combos = new ComboTracker();
  private comboCounter!: ComboCounter;
  private ambience!: StageAmbience;
  private stage!: StageConfig;
  /** On-screen controls, when shown: the ESP button mirrors the player's SPECIAL READY. */
  private touch: TouchControls | null = null;

  constructor() {
    super(SceneKeys.Fight);
  }

  /**
   * Safety net: the VS screen normally loads the fight's art first (fighters, stage); whatever
   * is still missing is fetched here, behind a loading bar.
   */
  preload(): void {
    const setup = this.scene.settings.data as MatchSetup;
    const fighters = [setup.playerFighterId, setup.cpuFighterId].map(getFighterConfig);
    if (queueMissing(this, matchAssets(fighters, getStageConfig(setup.stageId))) === 0) return;
    new LoadingBar(this);
    watchLoad(this);
  }

  create(setup: MatchSetup): void {
    this.setup = setup;
    this.accumulatorMs = 0;
    this.simFrame = 0;
    this.combos = new ComboTracker();
    fadeIn(this);

    const stage = getStageConfig(setup.stageId);
    this.stage = stage;
    gameMusic(this).play(stageMusic(stage), MUSIC_FADE.fightInMs);
    const configs = [
      getFighterConfig(setup.playerFighterId),
      getFighterConfig(setup.cpuFighterId),
    ] as const;
    this.simulation = new FightSimulation({ fighters: configs, stage });
    const fighters = this.simulation.fighters;

    this.stageView = createStageView(this, stage);
    this.views = configs.map((config) => createFighterView(this, config, stage.groundY));
    this.fightCamera = new FightCamera(this.cameras.main, stage);
    this.fightCamera.follow(fighters, true);
    this.effects = new HitEffects(this);
    this.specialEffects = new SpecialEffects(this);
    this.hud = new FightHud(this, fighters, () => gameSfx(this).play('special-ready'));
    this.announcer = new Announcer(this);
    this.perfectCall = new PerfectCall(this);
    this.comboCounter = new ComboCounter(this);
    this.ambience = new StageAmbience(this, stage.ambience);
    this.pendingPerfect = null;
    this.controllers = [
      new PlayerController(this.createPlayerInputSources()),
      new AIController(aiProfileFor(setup.difficulty)),
    ];
    this.setupDebugOverlay();
    this.createControlsBar();
    this.setupPause();

    this.events.once('shutdown', () => {
      this.controllers.forEach((c) => c.destroy?.());
      this.stageView.destroy();
    });
    this.announceRound();
    this.renderFrame(0);
  }

  override update(time: number, deltaMs: number): void {
    this.accumulatorMs += Math.min(deltaMs, FIXED_STEP_MS * MAX_STEPS_PER_FRAME);
    while (this.accumulatorMs >= FIXED_STEP_MS) {
      this.accumulatorMs -= FIXED_STEP_MS;
      this.stepSimulation();
    }
    this.renderFrame(time);
  }

  private createPlayerInputSources(): InputSource[] {
    const sources: InputSource[] = [];
    if (this.input.keyboard)
      sources.push(new KeyboardInputSource(this.input.keyboard, PLAYER_ONE_KEYS));
    this.touch = shouldShowTouchControls() ? new TouchControls(this) : null;
    if (this.touch) sources.push(this.touch);
    return sources;
  }

  /**
   * The keys, always on screen at the bottom of the fight, so newcomers know what to press. Only
   * for keyboard players: with touch controls the buttons already say it (and use that space).
   */
  private createControlsBar(): void {
    if (this.touch) return;
    this.add
      .rectangle(GAME_WIDTH / 2, CONTROLS_BAR_Y, GAME_WIDTH, CONTROLS_BAR_HEIGHT, COLORS.ink, 0.55)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
    new ControlsHint(
      this,
      GAME_WIDTH / 2,
      CONTROLS_BAR_Y,
      STRINGS.fightControlsHint,
      GAME_WIDTH,
    ).container
      .setScrollFactor(0)
      .setDepth(DEPTH.hud)
      .setAlpha(0.95);
  }

  /**
   * ESC / P, the touch pause button, or leaving the page (app switch, notification, another
   * window) freeze the fight and open the pause screen over it.
   */
  private setupPause(): void {
    onKeys(this, PAUSE_KEYS, () => this.pauseFight());
    if (this.touch) {
      const { x, y, radius } = PAUSE_BUTTON;
      const circle = new TouchCircle(this, x, y, radius)
        .setFillStyle(COLORS.ink, 0.35)
        .setStrokeStyle(2, COLORS.white, 0.6)
        .setScrollFactor(0)
        .setDepth(DEPTH.touch);
      this.add
        .text(x, y, STRINGS.touchPause, arcadeText(16, COLORS.white))
        .setOrigin(0.5)
        .setAlpha(0.85)
        .setScrollFactor(0)
        .setDepth(DEPTH.touch);
      const hit = circle.fill;
      hit.setInteractive(
        new Phaser.Geom.Circle(hit.width / 2, hit.height / 2, radius + 8),
        Phaser.Geom.Circle.Contains,
      );
      hit.on('pointerup', () => this.pauseFight());
    }
    const autoPause = () => this.pauseFight();
    this.game.events.on(Phaser.Core.Events.BLUR, autoPause);
    this.game.events.on(Phaser.Core.Events.HIDDEN, autoPause);
    this.events.once('shutdown', () => {
      this.game.events.off(Phaser.Core.Events.BLUR, autoPause);
      this.game.events.off(Phaser.Core.Events.HIDDEN, autoPause);
    });
  }

  private pauseFight(): void {
    // Not while the match is already handing over to the next screen.
    if (!this.scene.isActive() || isLeaving(this)) return;
    // A finger lifted while paused would be missed: let go of everything first.
    this.touch?.releaseAll();
    this.scene.pause();
    this.scene.launch(SceneKeys.Pause, this.setup);
  }

  private setupDebugOverlay(): void {
    this.debugOverlay = new DebugOverlay(this, readUrlFlag('debug') ?? false);
    onKeys(this, [DEBUG_TOGGLE_KEY], () => this.debugOverlay.toggle());
    if (import.meta.env.DEV) {
      this.add
        .text(
          8,
          GAME_HEIGHT - CONTROLS_BAR_HEIGHT - 4,
          STRINGS.debugHint,
          bodyText(11, COLORS.white),
        )
        .setOrigin(0, 1)
        .setAlpha(0.4)
        .setScrollFactor(0)
        .setDepth(DEPTH.hud);
    }
  }

  private stepSimulation(): void {
    const [p1, p2] = this.simulation.fighters;
    const inputs = [
      this.controllers[0].getInput({ self: p1, opponent: p2 }),
      this.controllers[1].getInput({ self: p2, opponent: p1 }),
    ] as const;
    this.simFrame += 1;
    for (const event of this.simulation.step(inputs)) this.handleEvent(event);
  }

  private handleEvent(event: SimulationEvent): void {
    // Sounds follow real simulation events only (contacts, jumps, landings, KO...).
    gameSfx(this).playAll(combatSfx(event, this.simulation.fighters));
    // The crowd cheers big moments (presentation only).
    const reaction = crowdReaction(event);
    if (reaction) this.crowdReacts(reaction);
    switch (event.type) {
      case 'hit':
        this.comboCounter.show(
          event.attackerIndex,
          this.combos.hit(event.attackerIndex, this.simFrame),
        );
        this.specialEffects.impact(event, this.simulation.fighters[event.attackerIndex]);
        this.effects.spawn(event.point, 'hit');
        this.fightCamera.shake(80, 0.004);
        return;
      case 'block':
        this.combos.blocked(event.attackerIndex);
        this.specialEffects.impact(event, this.simulation.fighters[event.attackerIndex]);
        this.effects.spawn(event.point, 'block');
        return;
      case 'koHit':
        this.comboCounter.show(
          event.attackerIndex,
          this.combos.hit(event.attackerIndex, this.simFrame),
        );
        this.specialEffects.impact(event, this.simulation.fighters[event.attackerIndex]);
        this.effects.spawn(event.point, 'ko');
        this.fightCamera.shake(350, 0.012);
        this.cameras.main.flash(120, 255, 255, 255);
        return;
      case 'ko':
        this.announcer.show(STRINGS.ko, 1600);
        this.schedulePerfect(event.result);
        return;
      case 'fightStart':
        this.announcer.show(STRINGS.fight, 700);
        return;
      case 'timeUp':
        this.announcer.show(STRINGS.timeOver, 1600);
        this.schedulePerfect(event.result);
        return;
      case 'victoryPose':
        // A round has a winner: the stage celebrates until the next round starts, louder
        // when that round also wins the match.
        this.stageView.setMood(
          this.simulation.match.wouldWinMatch(event.winnerIndex) ? 'victory' : 'celebrate',
        );
        return;
      case 'roundOver':
        // The point is already scored: show it while the next round is being prepared.
        this.hud.setRound(this.roundLabel(), this.simulation.match.roundWins);
        return;
      case 'roundDraw':
        this.announcer.show(STRINGS.roundDraw, 1200);
        return;
      case 'roundStart':
        this.startRoundPresentation();
        return;
      case 'matchOver': {
        // The fight music winds down; the next screen (victory, or the campaign's ending after
        // its last fight) plays the sting.
        gameMusic(this).stop(MUSIC_FADE.matchEndOutMs);
        this.ambience.fadeOut(MUSIC_FADE.matchEndOutMs);
        const { winnerIndex, reason, roundWins, perfects } = event.outcome;
        const result: MatchResult = { winnerIndex, reason, roundWins, perfects, setup: this.setup };
        endMatch(this, result);
        return;
      }
    }
  }

  /** The crowd bursts on screen and, on a stage with an audience, shouts. */
  private crowdReacts(reaction: CrowdReaction): void {
    this.stageView.react(reaction);
    const shout = crowdSfx(this.stage, reaction);
    if (shout) gameSfx(this).play(shout);
  }

  /** "ROUND n", or "FINAL ROUND" when both sides are one win away. */
  private roundLabel(): string {
    const { match } = this.simulation;
    return match.isFinalRound ? STRINGS.finalRound : STRINGS.round(match.currentRound);
  }

  /** The simulation already reset the fighters: reset what only the presentation holds. */
  private startRoundPresentation(): void {
    this.effects.clear();
    this.combos.reset();
    this.comboCounter.clear();
    this.stageView.setMood('fight');
    this.controllers.forEach((controller) => controller.reset?.());
    this.fightCamera.follow(this.simulation.fighters, true);
    this.hud.setRound(this.roundLabel(), this.simulation.match.roundWins);
    this.announceRound();
  }

  /**
   * After K.O. / TIME OVER has been read, a round won without losing any health gets the
   * PERFECT call (decided by the simulation in RoundResult.perfect, never by the HUD).
   */
  private schedulePerfect(result: RoundResult): void {
    if (!result.perfect) return;
    this.pendingPerfect?.remove();
    this.pendingPerfect = this.time.delayedCall(PERFECT_DELAY_MS, () => {
      this.pendingPerfect = null;
      this.announcer.clear();
      this.perfectCall.show();
      this.crowdReacts('perfect');
      gameSfx(this).playAll(['perfect', ANNOUNCER_VOICE.perfect]);
    });
  }

  /** "ROUND n" / "FINAL ROUND": the call and its sound. */
  private announceRound(): void {
    this.pendingPerfect?.remove();
    this.pendingPerfect = null;
    this.perfectCall.hide();
    this.announcer.show(this.roundLabel(), 1000);
    const { match } = this.simulation;
    gameSfx(this).playAll(['round-start', roundVoice(match.currentRound, match.isFinalRound)]);
  }

  private renderFrame(timeMs: number): void {
    const fighters = this.simulation.fighters;
    this.stageView.update(timeMs);
    fighters.forEach((fighter, i) => this.views[i]?.sync(fighter, timeMs));
    this.specialEffects.sync(fighters);
    this.fightCamera.follow(fighters);
    this.hud.update(fighters, this.simulation.round.secondsRemaining);
    this.touch?.setSpecialReady(this.hud.specialReady(0));
    this.debugOverlay.draw(fighters);
  }
}
