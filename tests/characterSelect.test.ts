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
      cameras = { main: { flash: vi.fn() } };
    },
  },
}));
vi.mock('../src/ui/ArcadeBackground', () => ({ createArcadeBackground: vi.fn() }));
vi.mock('../src/ui/MenuButton', () => ({ MenuButton: class {} }));
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

import { SceneKeys } from '../src/config/sceneKeys';
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
