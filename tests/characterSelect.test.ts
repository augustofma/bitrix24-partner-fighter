import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FighterConfig } from '../src/types/fighter';

const ui = vi.hoisted(() => {
  /** Recorded state of a fake game object; every other Phaser call is a chainable no-op. */
  interface DisplayState {
    x: number;
    y: number;
    text: string;
    visible: boolean;
    width: number;
    input: { enabled: boolean } | undefined;
    handlers: Map<string, () => void>;
  }
  const setters: Record<string, (state: DisplayState, value: unknown, next: unknown) => void> = {
    setVisible: (s, v) => (s.visible = v === true),
    setX: (s, v) => (s.x = Number(v)),
    setText: (s, v) => (s.text = String(v)),
    setInteractive: (s) => (s.input = { enabled: true }),
    on: (s, event, handler) => s.handlers.set(String(event), handler as () => void),
  };
  function display(x = 0, y = 0, text = ''): DisplayState {
    const state: DisplayState = {
      x,
      y,
      text,
      visible: true,
      width: 40,
      input: undefined,
      handlers: new Map(),
    };
    const proxy: DisplayState = new Proxy(state, {
      get(target, prop) {
        if (prop in target) return target[prop as keyof DisplayState];
        if (typeof prop !== 'string' || prop === 'then') return undefined;
        return (value: unknown, next: unknown) => {
          setters[prop]?.(target, value, next);
          return proxy;
        };
      },
    });
    return proxy;
  }
  return {
    display,
    keys: new Map<string, () => void>(),
    texts: [] as DisplayState[],
    buttons: new Map<string, () => void>(),
    portraits: [] as FighterConfig[],
    hero: [] as FighterConfig[],
    /** Stands in for the Phaser game registry, shared by every scene of the "session". */
    registry: new Map<string, unknown>(),
    goToScene: vi.fn(),
    playSfx: vi.fn(),
  };
});

vi.mock('phaser', () => ({
  default: {
    Scene: class {
      add = {
        rectangle: (x: number, y: number) => ui.display(x, y),
        graphics: () => ui.display(),
        image: () => ui.display(),
        container: (x: number, y: number) => ui.display(x, y),
        text: (x: number, y: number, text: string) => {
          const display = ui.display(x, y, text);
          ui.texts.push(display);
          return display;
        },
      };
      tweens = { add: vi.fn() };
      cameras = { main: { flash: vi.fn() } };
      textures = { exists: () => false };
      registry = {
        get: (key: string) => ui.registry.get(key),
        set: (key: string, value: unknown) => ui.registry.set(key, value),
      };
    },
  },
}));
vi.mock('../src/ui/select/SelectBackground', () => ({ createSelectBackground: vi.fn() }));
vi.mock('../src/ui/select/ArcadeButton', () => ({
  ArcadeButton: class {
    constructor(_scene: unknown, _x: number, _y: number, label: string, onActivate: () => void) {
      ui.buttons.set(label, onActivate);
    }
    flash() {}
  },
}));
vi.mock('../src/ui/select/HeroPanel', () => ({
  HeroPanel: class {
    show(config: FighterConfig) {
      ui.hero.push(config);
    }
  },
}));
vi.mock('../src/scenes/transitions', () => ({ fadeIn: vi.fn(), goToScene: ui.goToScene }));
vi.mock('../src/audio/gameAudio', () => ({
  gameMusic: () => ({ play: vi.fn(), playSting: vi.fn(), stop: vi.fn() }),
  playSfx: ui.playSfx,
}));
vi.mock('../src/input/menuKeys', () => ({
  onKeys: (_scene: unknown, names: string[], handler: () => void) => {
    for (const name of names) ui.keys.set(name, handler);
  },
}));
vi.mock('../src/render/PortraitView', () => ({
  createPortrait: (_scene: unknown, x: number, y: number, config: FighterConfig) => {
    ui.portraits.push(config);
    return ui.display(x, y);
  },
}));

import { RegistryKeys } from '../src/config/registryKeys';
import { SceneKeys } from '../src/config/sceneKeys';
import { STRINGS } from '../src/config/strings';
import { augusto } from '../src/fighters/augusto';
import { fighterA } from '../src/fighters/fighterA';
import { fighterB } from '../src/fighters/fighterB';
import { filipe } from '../src/fighters/filipe';
import { joaoGuiotti } from '../src/fighters/joaoGuiotti';
import { ROSTER, getPlayableFighters } from '../src/fighters/roster';
import { romualdo } from '../src/fighters/romualdo';
import { isaqueFerreira } from '../src/fighters/isaqueFerreira';
import { CharacterSelectScene } from '../src/scenes/CharacterSelectScene';
import type { RosterCard } from '../src/ui/select/RosterCard';
import { CARDS_PER_PAGE, SELECT_LAYOUT } from '../src/ui/select/selectLayout';
import { campaignOpponents, campaignStartLocation } from '../src/story/storyProfiles';
import type { StoryProgress } from '../src/types/story';

beforeEach(() => {
  ui.keys.clear();
  ui.texts.length = 0;
  ui.buttons.clear();
  ui.portraits.length = 0;
  ui.hero.length = 0;
  ui.registry.clear();
  ui.goToScene.mockClear();
  ui.playSfx.mockClear();
});

function openScene(mode: 'quick' | 'story' = 'quick') {
  const scene = new CharacterSelectScene();
  scene.create({ mode });
  const cards = (scene as unknown as { cards: RosterCard[] }).cards;
  return { scene, cards };
}
/** The card's container is one of the fake displays above. */
const fake = (card: RosterCard | undefined) =>
  card?.container as unknown as ReturnType<typeof ui.display> | undefined;
const lastHero = () => ui.hero.at(-1);
const lastSetup = () => ui.goToScene.mock.lastCall?.[2] as { difficulty: string } | undefined;

describe('CharacterSelectScene roster integration', () => {
  it('builds a card per PLAYABLE fighter (roster filtered by `playable`) plus filler slots', () => {
    const { cards } = openScene();
    const playable = ROSTER.filter((fighter) => fighter.playable);
    expect(getPlayableFighters()).toEqual(playable);
    expect(ui.portraits).toEqual(playable);
    expect(cards.map((card) => card.config)).toEqual([
      ...playable,
      ...Array<null>(CARDS_PER_PAGE - playable.length).fill(null),
    ]);
    expect(lastHero()).toBe(augusto);
    expect(fake(cards.at(-1))?.input).toBeUndefined();
  });

  it('offers all complete fighters; hides playable:false placeholders', () => {
    const { cards } = openScene();
    const shown = cards.map((card) => card.config).filter(Boolean);
    for (const fighter of getPlayableFighters()) {
      expect(fighter.playable).toBe(true);
      expect(shown).toContain(fighter);
      expect(fake(cards[shown.indexOf(fighter)])?.input?.enabled).toBe(true);
    }
    for (const placeholder of [fighterA, fighterB]) {
      expect(placeholder.playable).toBe(false);
      expect(shown).not.toContain(placeholder);
    }
  });

  it.each(getPlayableFighters())(
    'quick fight with %s: VS with a playable CPU and the stage of the fighters’ city',
    (fighter) => {
      const { cards } = openScene();
      const card = cards.find((c) => c.config === fighter);
      fake(card)?.handlers.get('pointerup')?.();
      fake(card)?.handlers.get('pointerup')?.();
      const setup = ui.goToScene.mock.lastCall?.[2] as Record<string, string>;
      expect(ui.goToScene.mock.lastCall?.[1]).toBe(SceneKeys.Versus);
      expect(setup.playerFighterId).toBe(fighter.id);
      const cpu = ROSTER.find((f) => f.id === setup.cpuFighterId);
      expect(cpu?.playable).toBe(true);
      expect(cpu?.id).not.toBe(fighter.id);
    },
  );

  it('first tap selects, a tap on the selected card confirms the right MatchSetup', () => {
    const { scene, cards } = openScene();
    const card = cards[getPlayableFighters().indexOf(augusto)];
    expect(fake(card)?.input?.enabled).toBe(true);
    fake(card)?.handlers.get('pointerup')?.();
    expect(ui.goToScene).toHaveBeenCalledWith(scene, SceneKeys.Versus, {
      playerFighterId: augusto.id,
      // The CPU is the next playable fighter.
      cpuFighterId: filipe.id,
      // Filipe is from Recife: the fight happens at the Marco Zero.
      stageId: 'recife',
      difficulty: 'normal',
    });
  });

  it('tapping another card only moves the selection (hero panel follows)', () => {
    const { cards } = openScene();
    fake(cards[1])?.handlers.get('pointerup')?.();
    expect(ui.goToScene).not.toHaveBeenCalled();
    expect(lastHero()).toBe(getPlayableFighters()[1]);
  });

  it('SELECIONAR and ENTER confirm; VOLTAR and ESC go back to the menu', () => {
    const { scene } = openScene();
    ui.buttons.get(STRINGS.selectButton)?.();
    expect(ui.goToScene).toHaveBeenLastCalledWith(scene, SceneKeys.Versus, expect.anything());
    ui.keys.get('ENTER')?.();
    expect(ui.goToScene).toHaveBeenLastCalledWith(scene, SceneKeys.Versus, expect.anything());
    ui.buttons.get(STRINGS.back)?.();
    expect(ui.goToScene).toHaveBeenLastCalledWith(scene, SceneKeys.Menu);
    ui.keys.get('ESC')?.();
    expect(ui.goToScene).toHaveBeenLastCalledWith(scene, SceneKeys.Menu);
  });

  it('menu sounds: move on a real change, confirm on select, back on leave', () => {
    const { scene } = openScene();
    const sounds = () => ui.playSfx.mock.calls.map((call) => call[1]);
    ui.keys.get('RIGHT')?.();
    expect(sounds()).toEqual(['menu-move']);
    ui.keys.get('UP')?.(); // difficulty NORMAL -> DIFÍCIL
    ui.keys.get('UP')?.(); // already at the end: no change, no sound
    expect(sounds()).toEqual(['menu-move', 'menu-move']);
    ui.keys.get('ENTER')?.();
    expect(sounds().at(-1)).toBe('menu-confirm');
    ui.keys.get('ESC')?.();
    expect(sounds().at(-1)).toBe('menu-back');
    expect(ui.playSfx.mock.calls.every((call) => call[0] === scene)).toBe(true);
  });

  it('shows the CPU opponent picked by the roster rule', () => {
    openScene();
    expect(ui.texts.some((t) => t.text === STRINGS.selectOpponent(filipe.displayName))).toBe(true);
  });

  it.each([8, 16])('keeps %s playable fighters reachable with hidden cards disabled', (count) => {
    // The production roster is readonly; the fixture mutation is scoped and restored.
    const roster = ROSTER as FighterConfig[];
    const original = [...roster];
    try {
      for (let index = 0; getPlayableFighters().length < count; index++) {
        roster.push({ ...augusto, id: `test-${index}`, displayName: `TEST_${index}` });
      }
      const { cards } = openScene();
      const visited = new Set<FighterConfig>();
      const gridRight = SELECT_LAYOUT.hero.left;
      for (let step = 0; step < count; step++) {
        const selected = lastHero();
        if (selected) visited.add(selected);
        const selectedCard = cards.find((card) => card.config === selected);
        expect(fake(selectedCard)?.visible).toBe(true);
        expect(cards.filter((card) => fake(card)?.visible)).toHaveLength(CARDS_PER_PAGE);
        for (const card of cards) {
          const { x, visible, input } = fake(card) ?? ui.display();
          if (visible) {
            expect(x - SELECT_LAYOUT.grid.cardWidth / 2).toBeGreaterThanOrEqual(0);
            expect(x + SELECT_LAYOUT.grid.cardWidth / 2).toBeLessThan(gridRight);
          } else if (input) {
            expect(input.enabled).toBe(false);
          }
        }
        ui.keys.get('RIGHT')?.();
      }
      // Every playable fighter is reachable; placeholders never are.
      expect(visited.size).toBe(count);
      expect(visited.has(fighterA)).toBe(false);
      expect(visited.has(fighterB)).toBe(false);
    } finally {
      roster.splice(0, roster.length, ...original);
    }
  });
});

describe('CharacterSelectScene story mode', () => {
  it('keeps Isaque visible but locked until a story profile is configured', () => {
    const { cards } = openScene('story');
    const card = cards.find((c) => c.config === isaqueFerreira);
    expect(card).toBeDefined();
    expect(fake(card)?.input?.enabled).not.toBe(true);
  });
  it.each([augusto, filipe, joaoGuiotti, romualdo])(
    '%s can start a campaign: correct fighter, start place and rivals',
    (fighter) => {
      const { cards } = openScene('story');
      const card = cards.find((c) => c.config === fighter);
      expect(fake(card)?.input?.enabled).toBe(true);
      fake(card)?.handlers.get('pointerup')?.();
      fake(card)?.handlers.get('pointerup')?.();
      expect(ui.goToScene.mock.lastCall?.[1]).toBe(SceneKeys.StoryMap);
      const progress = ui.registry.get(RegistryKeys.storyProgress) as StoryProgress;
      expect(progress.selectedFighter).toBe(fighter.id);
      expect(progress.currentLocation).toBe(campaignStartLocation(fighter.id));
      expect(progress.opponent).toBe(campaignOpponents(fighter.id)[0]);
      expect(campaignOpponents(fighter.id)).not.toContain(fighter.id);
    },
  );

  it('offers the same playable cards as the quick fight (placeholders hidden)', () => {
    const { cards } = openScene('story');
    const shown = cards.map((card) => card.config).filter(Boolean);
    expect(shown).toEqual(getPlayableFighters());
    expect(shown).not.toContain(fighterA);
    expect(shown).not.toContain(fighterB);
  });
});

describe('CharacterSelectScene CPU difficulty', () => {
  const optionText = (difficulty: 'easy' | 'normal' | 'hard') =>
    ui.texts.find((text) => text.text === STRINGS.difficultyNames[difficulty]);

  it('defaults to NORMAL and shows the three options', () => {
    openScene();
    for (const d of ['easy', 'normal', 'hard'] as const) expect(optionText(d)).toBeDefined();
    ui.keys.get('ENTER')?.();
    expect(lastSetup()?.difficulty).toBe('normal');
  });

  it('↑/↓ change the difficulty (clamped at the ends) and ←/→ still change the fighter', () => {
    openScene();
    ui.keys.get('UP')?.();
    ui.keys.get('UP')?.();
    ui.keys.get('ENTER')?.();
    expect(lastSetup()?.difficulty).toBe('hard');
    for (let i = 0; i < 5; i++) ui.keys.get('DOWN')?.();
    ui.keys.get('RIGHT')?.();
    ui.keys.get('ENTER')?.();
    expect(lastSetup()).toMatchObject({ difficulty: 'easy', playerFighterId: ROSTER[1]?.id });
  });

  it('the < > buttons and a tap on an option work by touch', () => {
    openScene();
    ui.buttons.get(STRINGS.previousDifficulty)?.();
    ui.keys.get('ENTER')?.();
    expect(lastSetup()?.difficulty).toBe('easy');
    ui.buttons.get(STRINGS.nextDifficulty)?.();
    ui.buttons.get(STRINGS.nextDifficulty)?.();
    ui.keys.get('ENTER')?.();
    expect(lastSetup()?.difficulty).toBe('hard');
    optionText('normal')?.handlers.get('pointerup')?.();
    ui.keys.get('ENTER')?.();
    expect(lastSetup()?.difficulty).toBe('normal');
  });

  it('remembers the last choice in the game registry for the next visit', () => {
    openScene();
    ui.keys.get('DOWN')?.();
    expect(ui.registry.get(RegistryKeys.aiDifficulty)).toBe('easy');
    openScene();
    ui.keys.get('ENTER')?.();
    expect(lastSetup()?.difficulty).toBe('easy');
  });

  it('ignores an invalid registry value and falls back to NORMAL', () => {
    ui.registry.set(RegistryKeys.aiDifficulty, 'impossible');
    openScene();
    ui.keys.get('ENTER')?.();
    expect(lastSetup()?.difficulty).toBe('normal');
  });
});
