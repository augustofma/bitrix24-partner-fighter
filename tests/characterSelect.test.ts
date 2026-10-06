import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FighterConfig } from '../src/types/fighter';

const ui = vi.hoisted(() => {
  class Display {
    visible = true;
    input?: { enabled: boolean };
    handlers = new Map<string, () => void>();
    constructor(
      public x = 0,
      public y = 0,
      public text = '',
    ) {}
    setOrigin() {
      return this;
    }
    setAlpha() {
      return this;
    }
    color = '';
    setColor(value: string) {
      this.color = value;
      return this;
    }
    setStrokeStyle() {
      return this;
    }
    setSize() {
      return this;
    }
    setInteractive() {
      this.input = { enabled: true };
      return this;
    }
    setVisible(value: boolean) {
      this.visible = value;
      return this;
    }
    setX(value: number) {
      this.x = value;
      return this;
    }
    setText(value: string) {
      this.text = value;
      return this;
    }
    add() {
      return this;
    }
    on(event: string, handler: () => void) {
      this.handlers.set(event, handler);
      return this;
    }
  }
  return {
    Display,
    keys: new Map<string, () => void>(),
    cards: [] as Display[],
    configs: [] as FighterConfig[],
    texts: [] as Display[],
    buttons: new Map<string, () => void>(),
    /** Stands in for the Phaser game registry, shared by every scene of the "session". */
    registry: new Map<string, unknown>(),
    goToScene: vi.fn(),
  };
});

vi.mock('phaser', () => ({
  default: {
    Scene: class {
      add = {
        rectangle: (x: number, y: number) => new ui.Display(x, y),
        text: (x: number, y: number, text: string) => {
          const display = new ui.Display(x, y, text);
          ui.texts.push(display);
          return display;
        },
      };
      tweens = { add: vi.fn() };
      registry = {
        get: (key: string) => ui.registry.get(key),
        set: (key: string, value: unknown) => ui.registry.set(key, value),
      };
      cameras = { main: { flash: vi.fn() } };
    },
  },
}));
vi.mock('../src/ui/ArcadeBackground', () => ({ createArcadeBackground: vi.fn() }));
vi.mock('../src/ui/MenuButton', () => ({
  MenuButton: class {
    constructor(_scene: unknown, _x: number, _y: number, label: string, onActivate: () => void) {
      ui.buttons.set(label, onActivate);
    }
  },
}));
vi.mock('../src/scenes/transitions', () => ({ fadeIn: vi.fn(), goToScene: ui.goToScene }));
vi.mock('../src/input/menuKeys', () => ({
  onKeys: (_scene: unknown, names: string[], handler: () => void) => {
    for (const name of names) ui.keys.set(name, handler);
  },
}));
vi.mock('../src/render/PortraitView', () => ({
  createPortrait: (_scene: unknown, x: number, y: number, config: FighterConfig) => {
    const card = new ui.Display(x, y);
    ui.cards.push(card);
    ui.configs.push(config);
    return card;
  },
}));

import { RegistryKeys } from '../src/config/registryKeys';
import { SceneKeys } from '../src/config/sceneKeys';
import { STRINGS } from '../src/config/strings';
import { augusto } from '../src/fighters/augusto';
import { fighterB } from '../src/fighters/fighterB';
import { ROSTER } from '../src/fighters/roster';
import { CharacterSelectScene } from '../src/scenes/CharacterSelectScene';
import { DEFAULT_STAGE_ID } from '../src/stages/stageRegistry';

beforeEach(() => {
  ui.keys.clear();
  ui.cards.length = 0;
  ui.configs.length = 0;
  ui.texts.length = 0;
  ui.buttons.clear();
  ui.registry.clear();
  ui.goToScene.mockClear();
});

describe('CharacterSelectScene roster integration', () => {
  it('renders Augusto through the shared portrait path and confirms the correct MatchSetup', () => {
    const scene = new CharacterSelectScene();
    scene.create();
    expect(ui.configs).toEqual(ROSTER);
    expect(ui.texts.some((text) => text.text === augusto.displayName)).toBe(true);
    expect(ui.texts.some((text) => text.text === augusto.description)).toBe(true);
    const card = ui.cards[ROSTER.indexOf(augusto)];
    expect(card?.input?.enabled).toBe(true);
    card?.handlers.get('pointerup')?.();
    expect(ui.goToScene).toHaveBeenCalledWith(scene, SceneKeys.Versus, {
      playerFighterId: augusto.id,
      cpuFighterId: fighterB.id,
      stageId: DEFAULT_STAGE_ID,
      difficulty: 'normal',
    });
    expect(ui.cards[ROSTER.indexOf(fighterB)]?.input).toBeUndefined();
  });

  it.each([8, 16])('keeps %s roster entries reachable with hidden cards disabled', (count) => {
    // The production roster is readonly; the fixture mutation is scoped and restored.
    const roster = ROSTER as FighterConfig[];
    const original = [...roster];
    try {
      for (let index = roster.length; index < count; index++) {
        roster.push({ ...augusto, id: `test-${index}`, displayName: `TEST_${index}` });
      }
      new CharacterSelectScene().create();
      const visited = new Set<number>();
      for (let step = 0; step < count - 1; step++) {
        const selected = ui.configs.findIndex((config) =>
          ui.texts.some((text) => text.text === config.displayName),
        );
        visited.add(selected);
        expect(ui.cards[selected]?.visible).toBe(true);
        expect(ui.cards.filter((card) => card.visible)).toHaveLength(4);
        for (const card of ui.cards) {
          if (card.visible) {
            expect(card.x - 80).toBeGreaterThanOrEqual(0);
            expect(card.x + 80).toBeLessThanOrEqual(960);
          } else if (card.input) {
            expect(card.input.enabled).toBe(false);
          }
        }
        ui.keys.get('RIGHT')?.();
      }
      expect(visited.size).toBe(count - 1);
      expect(visited.has(ROSTER.indexOf(fighterB))).toBe(false);
      expect(ui.texts.some((text) => text.text === augusto.displayName)).toBe(true);
    } finally {
      roster.splice(0, roster.length, ...original);
    }
  });
});

describe('CharacterSelectScene CPU difficulty', () => {
  const lastSetup = () => ui.goToScene.mock.lastCall?.[2] as { difficulty: string } | undefined;
  const optionText = (difficulty: 'easy' | 'normal' | 'hard') =>
    ui.texts.find((text) => text.text === STRINGS.difficultyNames[difficulty]);

  it('defaults to NORMAL and shows the three options', () => {
    new CharacterSelectScene().create();
    for (const d of ['easy', 'normal', 'hard'] as const) expect(optionText(d)).toBeDefined();
    ui.keys.get('ENTER')?.();
    expect(lastSetup()?.difficulty).toBe('normal');
  });

  it('↑/↓ change the difficulty (clamped at the ends) and ←/→ still change the fighter', () => {
    new CharacterSelectScene().create();
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
    new CharacterSelectScene().create();
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
    new CharacterSelectScene().create();
    ui.keys.get('DOWN')?.();
    expect(ui.registry.get(RegistryKeys.aiDifficulty)).toBe('easy');
    new CharacterSelectScene().create();
    ui.keys.get('ENTER')?.();
    expect(lastSetup()?.difficulty).toBe('easy');
  });

  it('ignores an invalid registry value and falls back to NORMAL', () => {
    ui.registry.set(RegistryKeys.aiDifficulty, 'impossible');
    new CharacterSelectScene().create();
    ui.keys.get('ENTER')?.();
    expect(lastSetup()?.difficulty).toBe('normal');
  });
});
