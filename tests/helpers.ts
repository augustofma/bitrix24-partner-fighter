import { FightSimulation, type SimulationEvent } from '../src/core/FightSimulation';
import { createInputState } from '../src/core/input';
import type { RoundTiming } from '../src/core/systems/RoundSystem';
import { fighterA } from '../src/fighters/fighterA';
import { fighterB } from '../src/fighters/fighterB';
import { partnerArena } from '../src/stages/partnerArena';
import type { InputState } from '../src/types/input';

export const FAST_TIMING: RoundTiming = {
  timeFrames: 99 * 60,
  introFrames: 1,
  victoryPoseDelayFrames: 10,
  outroFrames: 20,
};

/** A simulation already in the 'fight' phase. */
export function createFightingSim(timing: RoundTiming = FAST_TIMING): FightSimulation {
  const sim = new FightSimulation({
    fighters: [fighterA, fighterB],
    stage: partnerArena,
    roundTiming: timing,
  });
  stepFrames(sim, 1);
  return sim;
}

export const idle = (): InputState => createInputState();
export const press = (partial: Partial<InputState>): InputState => createInputState(partial);

export function stepFrames(
  sim: FightSimulation,
  frames: number,
  p1: InputState = idle(),
  p2: InputState = idle(),
): SimulationEvent[] {
  const events: SimulationEvent[] = [];
  for (let i = 0; i < frames; i++) events.push(...sim.step([p1, p2]));
  return events;
}

/** Puts both fighters at a given center-to-center distance, facing each other. */
export function placeAtDistance(sim: FightSimulation, distance: number): void {
  const [a, b] = sim.fighters;
  const center = sim.stage.width / 2;
  a.position.x = center - distance / 2;
  b.position.x = center + distance / 2;
}
