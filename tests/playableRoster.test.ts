import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AIController } from '../src/controllers/AIController';
import { HARD_AI } from '../src/controllers/aiProfiles';
import { FightSimulation } from '../src/core/FightSimulation';
import { createRng } from '../src/core/random';
import { ROSTER, getPlayableFighters, pickCpuOpponent } from '../src/fighters/roster';
import { partnerSummit } from '../src/stages/partnerSummit';
import { getStageConfig } from '../src/stages/stageRegistry';
import { hasStoryCampaign, isStoryEligible, quickFightStageId } from '../src/story/storyProfiles';
import { startStory } from '../src/story/storyProgress';
import { GAME_HEIGHT, GAME_WIDTH } from '../src/config/display';
import { CARDS_PER_PAGE, SELECT_LAYOUT, cardSlot, pageCount } from '../src/ui/select/selectLayout';

const playable = getPlayableFighters();

describe('playable roster (data-driven)', () => {
  it('is the roster filtered by `playable`, and includes every complete fighter', () => {
    expect(playable).toEqual(ROSTER.filter((fighter) => fighter.playable));
    expect(playable.map((f) => f.id)).toEqual([
      'augusto',
      'filipe',
      'joao-guiotti',
      'romualdo',
      'isaque-ferreira',
    ]);
    // Test/demo placeholders stay in the roster (code and tests use them) but are not offered.
    expect(ROSTER.filter((f) => !f.playable).map((f) => f.id)).toEqual(['fighter-a', 'fighter-b']);
  });

  it('quick fight: any playable fighter gets a playable CPU opponent and a real stage', () => {
    for (const fighter of playable) {
      const cpu = pickCpuOpponent(fighter.id);
      expect(cpu.playable).toBe(true);
      expect(cpu.id).not.toBe(fighter.id);
      expect(() => getStageConfig(quickFightStageId(fighter.id, cpu.id))).not.toThrow();
    }
    // Every playable fighter is somebody's CPU opponent.
    expect(new Set(playable.map((f) => pickCpuOpponent(f.id).id))).toEqual(
      new Set(playable.map((f) => f.id)),
    );
  });

  it('story mode: every playable fighter with a story profile can start a campaign', () => {
    for (const fighter of playable.filter((f) => isStoryEligible(f.id))) {
      expect(isStoryEligible(fighter.id)).toBe(true);
      expect(hasStoryCampaign(fighter.id)).toBe(true);
      expect(startStory(fighter.id).selectedFighter).toBe(fighter.id);
    }
    for (const fighter of ROSTER.filter((f) => !isStoryEligible(f.id))) {
      expect(hasStoryCampaign(fighter.id)).toBe(false);
    }
  });

  it('the CPU controls any playable fighter, on either side, with the generic AI', () => {
    for (const a of playable) {
      for (const b of playable) {
        if (a === b) continue;
        const sim = new FightSimulation({ fighters: [a, b], stage: partnerSummit });
        const ais = [
          new AIController(HARD_AI, createRng(7)),
          new AIController(HARD_AI, createRng(11)),
        ];
        const states = [new Set<string>(), new Set<string>()];
        let hits = 0;
        for (let frame = 0; frame < 1500 && !sim.match.isOver; frame++) {
          const [p1, p2] = sim.fighters;
          const events = sim.step([
            ais[0]!.getInput({ self: p1, opponent: p2 }),
            ais[1]!.getInput({ self: p2, opponent: p1 }),
          ]);
          hits += events.filter((e) => e.type === 'hit' || e.type === 'koHit').length;
          sim.fighters.forEach((f, i) => states[i]!.add(f.state));
        }
        // Both CPUs move and attack, and the fight produces real hits.
        for (const seen of states) {
          expect(seen.has('walk') || seen.has('jump'), `${a.id} vs ${b.id}`).toBe(true);
          expect(
            [...seen].some((s) => ['punch', 'kick', 'crouchPunch', 'crouchKick'].includes(s)),
          ).toBe(true);
        }
        expect(hits, `${a.id} vs ${b.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('no selection, CPU or story code relies on a fixed list of fighter ids', () => {
    const files = [
      'src/scenes/CharacterSelectScene.ts',
      'src/fighters/roster.ts',
      'src/scenes/VersusScene.ts',
      'src/scenes/FightScene.ts',
      ...readdirSync(join(__dirname, '../src/controllers')).map((f) => `src/controllers/${f}`),
      ...readdirSync(join(__dirname, '../src/ui/select')).map((f) => `src/ui/select/${f}`),
    ];
    for (const file of files) {
      const source = readFileSync(join(__dirname, '..', file), 'utf8');
      for (const fighter of ROSTER) expect(source, file).not.toContain(`'${fighter.id}'`);
    }
  });

  it.each([4, 5, 6, 7, 12])(
    'the select grid keeps %s fighters on screen, without overlaps',
    (n) => {
      const { grid, hero } = SELECT_LAYOUT;
      const slots = Array.from({ length: pageCount(n) * CARDS_PER_PAGE }, (_, i) => cardSlot(i));
      for (const slot of slots) {
        expect(slot.x - grid.cardWidth / 2).toBeGreaterThanOrEqual(0);
        expect(slot.x + grid.cardWidth / 2).toBeLessThanOrEqual(hero.left);
        expect(slot.y - grid.cardHeight / 2).toBeGreaterThanOrEqual(0);
        expect(slot.y + grid.cardHeight / 2).toBeLessThanOrEqual(GAME_HEIGHT);
      }
      for (let page = 0; page < pageCount(n); page++) {
        const onPage = slots.filter((s) => s.page === page);
        const keys = new Set(onPage.map((s) => `${s.x},${s.y}`));
        expect(keys.size).toBe(onPage.length);
      }
      expect(hero.left).toBeLessThan(GAME_WIDTH);
    },
  );
});
