import type Phaser from 'phaser';
import { GAME_FONTS } from '../config/fonts';
import { COLORS } from './theme';

/*
 * Controls bar text in the fight-game style: each command as its keys (gold) and what they do
 * (white, upper case), in the fight lettering (Bangers) with outline and drop shadow, the
 * commands spread across the bar. Built from the plain hint strings (STRINGS.*Hint), so a new
 * screen only needs its string.
 */

/** A placed piece of the row and its width (text measures itself; drawn keys do not). */
interface Part {
  object: Phaser.GameObjects.Text | Phaser.GameObjects.Container;
  width: number;
}

export interface HintCommand {
  /** "← → ↑ ↓", "ENTER", "Q E", or a label such as "P1: AUGUSTO". */
  keys: string;
  /** "lutador", "selecionar"; empty for a label. */
  action: string;
}

/** Commands are separated by runs of 2+ spaces in the hint strings. */
const COMMAND_SEPARATOR = / {2,}/;

/**
 * Splits a hint into commands: the words before the first one with a lower-case letter are
 * the keys, the rest is the action ("← → ↑ ↓ lutador" → keys "← → ↑ ↓", action "lutador").
 */
export function parseHint(text: string): HintCommand[] {
  return text
    .trim()
    .split(COMMAND_SEPARATOR)
    .map((command) => {
      const words = command.split(' ');
      const first = words.findIndex((word) => /\p{Ll}/u.test(word));
      if (first <= 0)
        return first < 0 ? { keys: command, action: '' } : { keys: '', action: command };
      return { keys: words.slice(0, first).join(' '), action: words.slice(first).join(' ') };
    });
}

const SIZE = 17;
/** Arrow keys are drawn (the fonts have no arrows): gold triangles with the text's outline. */
const ARROWS: Record<string, number> = { '→': 0, '↓': 90, '←': 180, '↑': 270 };
const ARROW = { size: 11, gap: 5 } as const;
/** Gap between a command's keys and its action, and between commands. */
const KEY_GAP = 7;
const COMMAND_GAP = 30;
/** Never wider than the screen minus this margin (shrinks to fit). */
const SIDE_MARGIN = 16;

function style(color: number): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: GAME_FONTS.TITLE,
    fontSize: `${SIZE}px`,
    color: `#${color.toString(16).padStart(6, '0')}`,
    stroke: '#0b0820',
    strokeThickness: 4,
    shadow: { offsetX: 1, offsetY: 2, color: '#000000', blur: 0, fill: true },
  };
}

/** A centred row of commands at (x, y); `setHint` rebuilds it for another hint. */
export class ControlsHint {
  readonly container: Phaser.GameObjects.Container;
  private text = '';

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    hint: string,
    private readonly maxWidth: number,
  ) {
    this.container = scene.add.container(x, y);
    this.setHint(hint);
  }

  setHint(hint: string): this {
    if (hint === this.text) return this;
    this.text = hint;
    this.container.removeAll(true);
    const parts: Part[] = [];
    const gaps: number[] = [];
    parseHint(hint).forEach((command, i) => {
      if (i > 0) gaps[parts.length] = COMMAND_GAP;
      if (command.keys) parts.push(this.keys(command.keys));
      if (command.action) {
        if (command.keys) gaps[parts.length] = KEY_GAP;
        parts.push(this.part(command.action.toUpperCase(), COLORS.white));
      }
    });
    const width = parts.reduce((sum, part, i) => sum + part.width + (gaps[i] ?? 0), 0);
    let cursor = -width / 2;
    parts.forEach((part, i) => {
      cursor += gaps[i] ?? 0;
      part.object.setPosition(cursor, 0);
      cursor += part.width;
    });
    this.container.add(parts.map((part) => part.object));
    this.container.setScale(Math.min(1, (this.maxWidth - SIDE_MARGIN * 2) / Math.max(1, width)));
    return this;
  }

  /** A command's keys: drawn arrows, then the named keys in gold ("ENTER", "Q E"). */
  private keys(keys: string): Part {
    const words = keys.split(' ');
    const arrows = words.filter((word) => word in ARROWS);
    if (arrows.length === 0) return this.part(keys, COLORS.gold);
    const step = ARROW.size + ARROW.gap;
    const g = this.scene.add.graphics();
    arrows.forEach((arrow, i) => drawArrow(g, i * step + ARROW.size / 2, ARROWS[arrow]!));
    const rest = words.filter((word) => !(word in ARROWS)).join(' ');
    const items: Phaser.GameObjects.GameObject[] = [g];
    let width = arrows.length * step - ARROW.gap;
    if (rest) {
      const text = this.part(rest, COLORS.gold);
      text.object.setPosition(width + KEY_GAP, 0);
      width += KEY_GAP + text.width;
      items.push(text.object);
    }
    return { object: this.scene.add.container(0, 0, items), width };
  }

  private part(text: string, color: number): Part {
    const object = this.scene.add
      .text(0, 0, text, style(color))
      .setOrigin(0, 0.5)
      .setLetterSpacing(1);
    return { object, width: object.width };
  }
}

/** A gold triangle pointing at `angle` (0 = right), outlined and shadowed like the text. */
function drawArrow(g: Phaser.GameObjects.Graphics, cx: number, angle: number): void {
  const r = ARROW.size / 2;
  const rad = (angle * Math.PI) / 180;
  const point = (a: number, d: number) => ({
    x: cx + Math.cos(rad + a) * d,
    y: Math.sin(rad + a) * d,
  });
  const raw = [point(0, r + 1), point((2 * Math.PI) / 3, r), point((-2 * Math.PI) / 3, r)];
  // Centre the triangle's bounds (not its centroid) on the line, so ↑ and ↓ sit level.
  const xs = raw.map((p) => p.x);
  const ys = raw.map((p) => p.y);
  const dx = cx - (Math.min(...xs) + Math.max(...xs)) / 2;
  const dy = -(Math.min(...ys) + Math.max(...ys)) / 2;
  const tri = raw.map((p) => ({ x: p.x + dx, y: p.y + dy }));
  const shadow = tri.map((p) => ({ x: p.x + 1, y: p.y + 2 }));
  g.fillStyle(0x000000, 1).fillPoints(shadow, true);
  g.lineStyle(4, 0x0b0820, 1).strokePoints(tri, true, true);
  g.fillStyle(COLORS.gold, 1).fillPoints(tri, true);
}
