import { KO_HITSTOP_FRAMES, SPAWN_OFFSET_X } from '../config/simulation';
import type { FighterConfig } from '../types/fighter';
import type { Direction, Vec2 } from '../types/geometry';
import type { InputState } from '../types/input';
import type { StageConfig } from '../types/stage';
import { Fighter } from './fighter/Fighter';
import { InputTracker, NEUTRAL_INPUT } from './input';
import { ArenaSystem } from './systems/ArenaSystem';
import { CombatSystem, type CombatEvent, type FighterIndex } from './systems/CombatSystem';
import { MatchSystem, type MatchEvent, type MatchRules } from './systems/MatchSystem';
import { RoundSystem, type RoundEvent, type RoundTiming } from './systems/RoundSystem';

export type SimulationEvent = CombatEvent | RoundEvent | MatchEvent;

export interface FightSimulationOptions {
  fighters: readonly [FighterConfig, FighterConfig];
  stage: StageConfig;
  /** Override round timing (mainly for tests). */
  roundTiming?: RoundTiming;
  /** Override best-of rules (mainly for tests). Default: best of three. */
  matchRules?: MatchRules;
}

interface Spawn {
  position: Vec2;
  direction: Direction;
}

/**
 * The whole match as pure, deterministic data: same inputs => same result.
 * No Phaser, no time source, no randomness. The scene calls `step()` at a fixed 60 Hz
 * with one InputState per side and renders the resulting state.
 *
 * A match is a sequence of rounds (RoundSystem) scored by MatchSystem. Between rounds the
 * fighters and every transient value are reset, except the special meter.
 *
 * Index 0 is the left/player side, index 1 the right/CPU side.
 */
export class FightSimulation {
  readonly fighters: readonly [Fighter, Fighter];
  readonly match: MatchSystem;
  readonly stage: StageConfig;

  private currentRound: RoundSystem;
  private readonly roundTiming: RoundTiming | undefined;
  private readonly spawns: readonly [Spawn, Spawn];
  private readonly arena: ArenaSystem;
  private readonly combat = new CombatSystem();
  private trackers: readonly [InputTracker, InputTracker] = [
    new InputTracker(),
    new InputTracker(),
  ];
  private hitstopFrames = 0;
  private pendingVictory: FighterIndex | null = null;
  private frameCount = 0;

  constructor(options: FightSimulationOptions) {
    const { stage } = options;
    const centerX = stage.width / 2;
    this.stage = stage;
    this.arena = new ArenaSystem(stage);
    this.roundTiming = options.roundTiming;
    this.currentRound = new RoundSystem(options.roundTiming);
    this.match = new MatchSystem(options.matchRules);
    this.spawns = [
      { position: { x: centerX - SPAWN_OFFSET_X, y: stage.groundY }, direction: 1 },
      { position: { x: centerX + SPAWN_OFFSET_X, y: stage.groundY }, direction: -1 },
    ];
    this.fighters = [
      new Fighter(options.fighters[0], this.spawns[0].position, 1, stage.groundY),
      new Fighter(options.fighters[1], this.spawns[1].position, -1, stage.groundY),
    ];
  }

  /** The round being played (a new RoundSystem every round). */
  get round(): RoundSystem {
    return this.currentRound;
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
    return this.currentRound.phase === 'fight';
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

    const roundEvents = this.currentRound.step([this.fighters[0].health, this.fighters[1].health]);
    const matchEvents: MatchEvent[] = [];
    for (const event of roundEvents) {
      if (event.type === 'victoryPose') this.pendingVictory = event.winnerIndex;
      if (event.type === 'roundOver') matchEvents.push(...this.match.recordRound(event.result));
    }
    this.tryVictoryPose();
    if (matchEvents.some((event) => event.type === 'roundStart')) this.startNextRound();

    return [...combatEvents, ...roundEvents, ...matchEvents];
  }

  /** Fresh round: fighters back to spawn, timer and every transient value reset; meter kept. */
  private startNextRound(): void {
    this.fighters.forEach((fighter, i) => {
      const spawn = this.spawns[i as FighterIndex];
      fighter.resetForRound(spawn.position, spawn.direction);
    });
    this.currentRound = new RoundSystem(this.roundTiming);
    this.trackers = [new InputTracker(), new InputTracker()];
    this.hitstopFrames = 0;
    this.pendingVictory = null;
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
