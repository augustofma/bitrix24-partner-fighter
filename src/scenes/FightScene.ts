import Phaser from 'phaser';
import { DEBUG_TOGGLE_KEY, PLAYER_ONE_KEYS } from '../config/controls';
import { GAME_HEIGHT } from '../config/display';
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
import { SpecialEffects } from '../render/SpecialEffects';
import { createStageView } from '../render/stage/createStageView';
import type { StageBackdrop } from '../render/stage/StageBackdrop';
import { getStageConfig } from '../stages/stageRegistry';
import type { InputSource } from '../types/input';
import type { MatchResult, MatchSetup } from '../types/match';
import { Announcer } from '../ui/Announcer';
import { FightHud } from '../ui/FightHud';
import { COLORS, DEPTH, bodyText } from '../ui/theme';
import { TouchControls } from '../ui/TouchControls';
import { readUrlFlag, shouldShowTouchControls } from '../utils/device';
import { goToScene, fadeIn } from './transitions';

/**
 * Glue between the pure FightSimulation and Phaser:
 * reads controllers -> steps the simulation at a fixed 60 Hz -> renders the state.
 * No gameplay rules live here.
 */
export class FightScene extends Phaser.Scene {
  private setup!: MatchSetup;
  private simulation!: FightSimulation;
  private controllers!: readonly [FighterController, FighterController];
  private views!: readonly FighterView[];
  private fightCamera!: FightCamera;
  private hud!: FightHud;
  private announcer!: Announcer;
  private effects!: HitEffects;
  private specialEffects!: SpecialEffects;
  private debugOverlay!: DebugOverlay;
  private stageView!: StageBackdrop;
  private accumulatorMs = 0;
  /** On-screen controls, when shown: the ESP button mirrors the player's SPECIAL READY. */
  private touch: TouchControls | null = null;

  constructor() {
    super(SceneKeys.Fight);
  }

  create(setup: MatchSetup): void {
    this.setup = setup;
    this.accumulatorMs = 0;
    fadeIn(this);

    const stage = getStageConfig(setup.stageId);
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
    this.hud = new FightHud(this, fighters);
    this.announcer = new Announcer(this);
    this.controllers = [
      new PlayerController(this.createPlayerInputSources()),
      new AIController(aiProfileFor(setup.difficulty)),
    ];
    this.setupDebugOverlay();

    this.events.once('shutdown', () => this.controllers.forEach((c) => c.destroy?.()));
    this.announcer.show(this.roundLabel(), 1000);
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

  private setupDebugOverlay(): void {
    this.debugOverlay = new DebugOverlay(this, readUrlFlag('debug') ?? false);
    onKeys(this, [DEBUG_TOGGLE_KEY], () => this.debugOverlay.toggle());
    if (import.meta.env.DEV) {
      this.add
        .text(8, GAME_HEIGHT - 8, STRINGS.debugHint, bodyText(11, COLORS.white))
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
    for (const event of this.simulation.step(inputs)) this.handleEvent(event);
  }

  private handleEvent(event: SimulationEvent): void {
    switch (event.type) {
      case 'hit':
        this.effects.spawn(event.point, 'hit');
        this.fightCamera.shake(80, 0.004);
        return;
      case 'block':
        this.effects.spawn(event.point, 'block');
        return;
      case 'koHit':
        this.effects.spawn(event.point, 'ko');
        this.fightCamera.shake(350, 0.012);
        this.cameras.main.flash(120, 255, 255, 255);
        return;
      case 'ko':
        this.announcer.show(STRINGS.ko, 1600);
        return;
      case 'fightStart':
        this.announcer.show(STRINGS.fight, 700);
        return;
      case 'timeUp':
        this.announcer.show(STRINGS.timeOver, 1600);
        return;
      case 'victoryPose':
        // A round has a winner: the stage celebrates until the next round starts.
        this.stageView.setMood('celebrate');
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
        const { winnerIndex, reason, roundWins } = event.outcome;
        const result: MatchResult = { winnerIndex, reason, roundWins, setup: this.setup };
        goToScene(this, SceneKeys.Victory, result);
        return;
      }
    }
  }

  /** "ROUND n", or "FINAL ROUND" when both sides are one win away. */
  private roundLabel(): string {
    const { match } = this.simulation;
    return match.isFinalRound ? STRINGS.finalRound : STRINGS.round(match.currentRound);
  }

  /** The simulation already reset the fighters: reset what only the presentation holds. */
  private startRoundPresentation(): void {
    this.effects.clear();
    this.stageView.setMood('fight');
    this.controllers.forEach((controller) => controller.reset?.());
    this.fightCamera.follow(this.simulation.fighters, true);
    this.hud.setRound(this.roundLabel(), this.simulation.match.roundWins);
    this.announcer.show(this.roundLabel(), 1000);
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
