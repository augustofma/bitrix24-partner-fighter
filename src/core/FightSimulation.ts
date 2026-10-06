import { KO_HITSTOP_FRAMES, SPAWN_OFFSET_X } from '../config/simulation';
import type { FighterConfig } from '../types/fighter';
import type { InputState } from '../types/input';
import type { StageConfig } from '../types/stage';
import { Fighter } from './fighter/Fighter';
import { InputTracker, NEUTRAL_INPUT } from './input';
import { ArenaSystem } from './systems/ArenaSystem';
import { CombatSystem, type CombatEvent, type FighterIndex } from './systems/CombatSystem';
import { RoundSystem, type RoundEvent, type RoundTiming } from './systems/RoundSystem';

export type SimulationEvent = CombatEvent | RoundEvent;

export interface FightSimulationOptions {
  fighters: readonly [FighterConfig, FighterConfig];
  stage: StageConfig;
  /** Override round timing (mainly for tests). */
  roundTiming?: RoundTiming;
}

/**
 * The whole fight as pure, deterministic data: same inputs => same result.
 * No Phaser, no time source, no randomness. The scene calls `step()` at a fixed 60 Hz
 * with one InputState per side and renders the resulting state.
 *
 * Index 0 is the left/player side, index 1 the right/CPU side.
 */
export class FightSimulation {
  readonly fighters: readonly [Fighter, Fighter];
  readonly round: RoundSystem;
  readonly stage: StageConfig;

  private readonly arena: ArenaSystem;
  private readonly combat = new CombatSystem();
  private readonly trackers = [new InputTracker(), new InputTracker()] as const;
  private hitstopFrames = 0;
  private pendingVictory: FighterIndex | null = null;
  private frameCount = 0;

  constructor(options: FightSimulationOptions) {
    const { stage } = options;
    const centerX = stage.width / 2;
    this.stage = stage;
    this.arena = new ArenaSystem(stage);
    this.round = new RoundSystem(options.roundTiming);
    this.fighters = [
      new Fighter(
        options.fighters[0],
        { x: centerX - SPAWN_OFFSET_X, y: stage.groundY },
        1,
        stage.groundY,
      ),
      new Fighter(
        options.fighters[1],
        { x: centerX + SPAWN_OFFSET_X, y: stage.groundY },
        -1,
        stage.groundY,
      ),
    ];
  }

  get frame(): number {
    return this.frameCount;
  }

  /** True while the impact freeze is running (renderers may shake/flash). */
  get isInHitstop(): boolean {
    return this.hitstopFrames > 0;
  }

  /** True when players' inputs are accepted. */
  get acceptsInput(): boolean {
    return this.round.phase === 'fight';
  }

  step(inputs: readonly [Readonly<InputState>, Readonly<InputState>]): SimulationEvent[] {
    this.frameCount++;
    if (this.hitstopFrames > 0) {
      this.hitstopFrames--;
      return [];
    }

    const accept = this.acceptsInput;
    this.fighters.forEach((fighter, i) => {
      const tracker = this.trackers[i as FighterIndex];
      fighter.update(tracker.next(accept ? inputs[i as FighterIndex] : NEUTRAL_INPUT));
    });

    this.arena.resolve(this.fighters);
    this.updateFacing();

    // Hits only count while the round is live (nothing can change the result afterwards).
    const combatEvents = accept ? this.combat.resolve(this.fighters) : [];
    this.applyHitstop(combatEvents);

    const roundEvents = this.round.step([this.fighters[0].health, this.fighters[1].health]);
    for (const event of roundEvents) {
      if (event.type === 'victoryPose') this.pendingVictory = event.winnerIndex;
    }
    this.tryVictoryPose();

    return [...combatEvents, ...roundEvents];
  }

  private updateFacing(): void {
    const [a, b] = this.fighters;
    if (a.canTurn) a.faceTowards(b.position.x);
    if (b.canTurn) b.faceTowards(a.position.x);
  }

  private applyHitstop(events: readonly CombatEvent[]): void {
    for (const event of events) {
      const frames = event.type === 'koHit' ? KO_HITSTOP_FRAMES : event.attack.hitstopFrames;
      this.hitstopFrames = Math.max(this.hitstopFrames, frames);
    }
  }

  private tryVictoryPose(): void {
    if (this.pendingVictory === null) return;
    if (this.fighters[this.pendingVictory].trySetVictory()) this.pendingVictory = null;
  }
}
