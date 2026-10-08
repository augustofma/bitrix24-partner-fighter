import { beforeEach, describe, expect, it, vi } from 'vitest';

const ui = vi.hoisted(() => {
  interface Display {
    text: string;
    visible: boolean;
    handlers: Map<string, () => void>;
    input?: { enabled: boolean };
  }
  /** A fake game object: records text, visibility and handlers; any other call chains. */
  function display(text = ''): Display {
    const state: Display = { text, visible: true, handlers: new Map() };
    const proxy: Display = new Proxy(state, {
      get(target, prop) {
        if (prop in target) return target[prop as keyof Display];
        if (typeof prop !== 'string' || prop === 'then') return undefined;
        return (value: unknown, next: unknown) => {
          if (prop === 'setText') target.text = String(value);
          if (prop === 'setVisible') target.visible = value === true;
          if (prop === 'setInteractive') target.input = { enabled: true };
          if (prop === 'on') target.handlers.set(String(value), next as () => void);
          return proxy;
        };
      },
    });
    return proxy;
  }
  return {
    display,
    keys: new Map<string, () => void>(),
    texts: [] as Display[],
    containers: [] as Display[],
    /** Tap targets: the preview's zone first, then one per stage row. */
    zones: [] as { x: number; y: number; width: number; height: number; display: Display }[],
    goToScene: vi.fn(),
    playSfx: vi.fn(),
  };
});

vi.mock('phaser', () => ({
  default: {
    Scene: class {
      add = {
        rectangle: () => ui.display(),
        graphics: () => ui.display(),
        image: () => ui.display(),
        zone: (x: number, y: number, width: number, height: number) => {
          const display = ui.display();
          ui.zones.push({ x, y, width, height, display });
          return display;
        },
        container: () => {
          const container = ui.display();
          ui.containers.push(container);
          return container;
        },
        text: (_x: number, _y: number, text: string) => {
          const display = ui.display(text);
          ui.texts.push(display);
          return display;
        },
      };
      tweens = { add: vi.fn() };
      cameras = { main: { flash: vi.fn() } };
      textures = { exists: () => false, getFrame: () => ({ width: 1075, height: 605 }) };
    },
    Geom: { Rectangle: class {} },
  },
}));
vi.mock('../src/ui/select/SelectBackground', () => ({ createSelectBackground: vi.fn() }));
vi.mock('../src/ui/select/ArcadeButton', () => ({
  ArcadeButton: class {
    flash() {}
  },
}));
vi.mock('../src/scenes/transitions', () => ({ fadeIn: vi.fn(), goToScene: ui.goToScene }));
vi.mock('../src/audio/gameAudio', () => ({
  gameMusic: () => ({ play: vi.fn() }),
  playSfx: ui.playSfx,
}));
vi.mock('../src/input/menuKeys', () => ({
  onKeys: (_scene: unknown, names: string[], handler: () => void) => {
    for (const name of names) ui.keys.set(name, handler);
  },
}));

import { SceneKeys } from '../src/config/sceneKeys';
import { StageSelectScene } from '../src/scenes/StageSelectScene';
import { STAGES, getSelectableStages } from '../src/stages/stageRegistry';
import { quickFightStageId } from '../src/story/storyProfiles';
import {
  STAGE_SELECT_LAYOUT,
  coverCrop,
  listWindowStart,
} from '../src/ui/stageSelect/stageSelectLayout';

const MATCH = { playerFighterId: 'augusto', cpuFighterId: 'filipe', difficulty: 'hard' } as const;

beforeEach(() => {
  ui.keys.clear();
  ui.texts.length = 0;
  ui.containers.length = 0;
  ui.zones.length = 0;
  ui.goToScene.mockClear();
  ui.playSfx.mockClear();
});

function openScene(data: Parameters<StageSelectScene['create']>[0] = MATCH) {
  const scene = new StageSelectScene();
  scene.create(data);
  return scene;
}
const lastCall = () => ui.goToScene.mock.lastCall;
/** The stage name under the preview (the caption's big text). */
const captionName = () =>
  ui.texts.find((t) => getSelectableStages().some((s) => s.displayName === t.text) && t.visible)
    ?.text;

describe('selectable stages', () => {
  it('are the illustrated stages, in registry order (the procedural arena stays out)', () => {
    const stages = getSelectableStages();
    expect(stages.length).toBeGreaterThanOrEqual(5);
    expect(stages.every((stage) => stage.art !== undefined)).toBe(true);
    expect(stages.map((s) => s.id)).not.toContain('partner-arena');
    expect(stages.map((s) => s.id)).toEqual(STAGES.filter((s) => s.art).map((s) => s.id));
    expect(stages.map((s) => s.id)).toEqual(
      expect.arrayContaining(['partner-summit', 'recife', 'joinville', 'joinville-zopu', 'russia']),
    );
    // Each one has its own name in the list.
    expect(new Set(stages.map((s) => s.displayName)).size).toBe(stages.length);
  });
});

describe('StageSelectScene', () => {
  it('opens on the stage the fighters’ cities suggest, with a row per stage', () => {
    openScene();
    const suggested = quickFightStageId(MATCH.playerFighterId, MATCH.cpuFighterId);
    expect(suggested).toBe('recife');
    for (const stage of getSelectableStages()) {
      expect(ui.texts.some((t) => t.text === stage.displayName)).toBe(true);
    }
    ui.keys.get('ENTER')?.();
    expect(lastCall()?.[1]).toBe(SceneKeys.Versus);
    expect(lastCall()?.[2]).toEqual({ ...MATCH, stageId: 'recife' });
  });

  it('↑/↓/←/→ choose any stage (wrapping) and ENTER starts the VS with it', () => {
    const stages = getSelectableStages();
    const start = stages.findIndex((s) => s.id === 'recife');
    openScene();
    ui.keys.get('DOWN')?.();
    ui.keys.get('ENTER')?.();
    expect(lastCall()?.[2]).toMatchObject({ stageId: stages[start + 1]!.id });
    openScene();
    for (let i = 0; i < stages.length; i++) ui.keys.get('RIGHT')?.(); // a full lap
    ui.keys.get('UP')?.();
    ui.keys.get('ENTER')?.();
    expect(lastCall()?.[2]).toMatchObject({ stageId: stages[start - 1]!.id });
    expect(ui.playSfx.mock.calls.map((c) => c[1])).toContain('menu-move');
  });

  it('a tap on a stage selects it, a tap on the selected one confirms', () => {
    openScene();
    const stages = getSelectableStages();
    const rows = ui.zones.slice(1).map((zone) => zone.display);
    expect(rows).toHaveLength(stages.length);
    const russia = stages.findIndex((s) => s.id === 'russia');
    rows[russia]?.handlers.get('pointerup')?.();
    expect(ui.goToScene).not.toHaveBeenCalled();
    expect(captionName()).toBeDefined();
    rows[russia]?.handlers.get('pointerup')?.();
    expect(lastCall()?.[2]).toMatchObject({ stageId: 'russia' });
  });

  it('every row is tappable over its whole width (regression: the name half was dead)', () => {
    openScene();
    const { list } = STAGE_SELECT_LAYOUT;
    const rows = ui.zones.slice(1);
    expect(rows).toHaveLength(getSelectableStages().length);
    for (const zone of rows) {
      // A zone centred in its row (zones are centred on their position) as big as the row.
      expect(zone).toMatchObject({
        x: list.width / 2,
        y: list.rowHeight / 2,
        width: list.width,
        height: list.rowHeight,
      });
      expect(zone.display.input?.enabled).toBe(true);
    }
  });

  it('a tap on the big preview fights on the selected stage', () => {
    openScene();
    const { preview } = STAGE_SELECT_LAYOUT;
    const zone = ui.zones[0]!;
    expect(zone).toMatchObject({
      x: preview.left + preview.width / 2,
      y: preview.top + preview.height / 2,
      width: preview.width,
      height: preview.height,
    });
    zone.display.handlers.get('pointerup')?.();
    expect(lastCall()?.[2]).toMatchObject({ stageId: 'recife' });
  });

  it('ESC goes back to the rival pick, keeping both fighters', () => {
    openScene();
    ui.keys.get('ESC')?.();
    expect(lastCall()?.[1]).toBe(SceneKeys.CharacterSelect);
    expect(lastCall()?.[2]).toEqual({
      mode: 'quick',
      step: 'rival',
      playerFighterId: 'augusto',
      cpuFighterId: 'filipe',
    });
    expect(ui.playSfx.mock.calls.at(-1)?.[1]).toBe('menu-back');
  });

  it('the preview band shows the match', () => {
    openScene({ playerFighterId: 'joao-guiotti', cpuFighterId: 'aislan', difficulty: 'easy' });
    expect(ui.texts.some((t) => t.text.includes('JOÃO GUIOTTI') && t.text.includes('AISLAN'))).toBe(
      true,
    );
    // Neither has a home stage: the default stage is preselected.
    ui.keys.get('ENTER')?.();
    expect(lastCall()?.[2]).toMatchObject({ stageId: 'partner-summit', difficulty: 'easy' });
  });
});

describe('stage select layout', () => {
  it('keeps the selected stage inside the visible list window', () => {
    const rows = STAGE_SELECT_LAYOUT.list.visibleRows;
    expect(listWindowStart(3, rows)).toBe(0);
    for (const count of [rows + 1, rows + 4]) {
      for (let selected = 0; selected < count; selected++) {
        const start = listWindowStart(selected, count);
        expect(selected).toBeGreaterThanOrEqual(start);
        expect(selected).toBeLessThan(start + rows);
        expect(start + rows).toBeLessThanOrEqual(count);
      }
    }
  });

  it('the list fits between the top bar and the button, beside the preview', () => {
    const { list, preview, fightButton } = STAGE_SELECT_LAYOUT;
    const bottom = list.top + list.visibleRows * list.rowHeight + (list.visibleRows - 1) * list.gap;
    expect(bottom).toBeLessThanOrEqual(fightButton.y - fightButton.height / 2);
    expect(preview.left + preview.width).toBeLessThan(list.left);
    expect(list.left + list.width).toBeLessThanOrEqual(960);
  });

  it('cover crop fills the box without distortion', () => {
    const { scale, crop } = coverCrop(1075, 605, 100, 52, 0.35);
    expect(crop.width * scale).toBeCloseTo(100);
    expect(crop.height * scale).toBeCloseTo(52);
    expect(crop.x).toBeGreaterThanOrEqual(0);
    expect(crop.y).toBeGreaterThanOrEqual(0);
    expect(crop.x + crop.width).toBeLessThanOrEqual(1075 + 1e-6);
    expect(crop.y + crop.height).toBeLessThanOrEqual(605 + 1e-6);
  });
});
