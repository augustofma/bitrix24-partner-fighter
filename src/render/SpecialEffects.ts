import type Phaser from 'phaser';
import type { ReadonlyFighter } from '../core/fighter/ReadonlyFighter';
import type { AttackConfig, SpecialEffectStyle } from '../types/fighter';
import { COLORS, DEPTH, arcadeText } from '../ui/theme';

const GREEN = 0x43e6a0;
const BLUE = 0x258bff;
const CYAN = 0x2fe0ff;
const NETWORK_COLORS = [BLUE, CYAN, GREEN] as const;
const LABEL_OFFSET_Y = -194;

// digital (24ZAP)
const PACKET_COUNT = 3;
const PACKET_WIDTH = 26;
const PACKET_HEIGHT = 16;

// agentNetwork (MINDHUB AGENT)
const NODE_COUNT = 9;
const NODE_RADIUS = 5;
const AGENT_ORBIT_COUNT = 3;
const AGENT_ORBIT_RADIUS = 26;
const BEAM_WIDTH = 10;
const PARTICLE_COUNT = 14;

/** Everything a style needs to draw one frame, derived only from the simulation. */
interface EffectFrame {
  g: Phaser.GameObjects.Graphics;
  fighter: ReadonlyFighter;
  attack: AttackConfig;
  /** Overall opacity: 1 until recovery, then fading out. */
  alpha: number;
}

/**
 * Read-only, frame-driven special VFX. Everything is derived from fighter.stateFrame, so the
 * effects freeze during hitstop, never use randomness, and vanish as soon as the move is
 * interrupted or the round resets. Styles are chosen per move in FighterConfig.assets.
 */
export class SpecialEffects {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly labels: readonly Phaser.GameObjects.Text[];

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(DEPTH.effects);
    this.labels = [0, 1].map(() =>
      scene.add
        .text(0, 0, '', arcadeText(18, COLORS.cyan))
        .setOrigin(0.5)
        .setDepth(DEPTH.effects)
        .setVisible(false),
    );
  }

  sync(fighters: readonly ReadonlyFighter[]): void {
    this.graphics.clear();
    fighters.forEach((fighter, index) => {
      const label = this.labels[index];
      label?.setVisible(false);
      const attack = fighter.activeAttack;
      if (fighter.state !== 'special' || !attack) return;
      const effect = fighter.config.assets.specialEffects?.[attack.id];
      if (!effect) return;
      const alpha = fadeAlpha(fighter, attack);
      label
        ?.setText(effect.label)
        .setPosition(fighter.position.x, fighter.position.y + LABEL_OFFSET_Y)
        .setAlpha(alpha)
        .setVisible(true);
      STYLES[effect.style]({ g: this.graphics, fighter, attack, alpha });
    });
  }
}

function fadeAlpha(fighter: ReadonlyFighter, attack: AttackConfig): number {
  if (fighter.attackPhase !== 'recovery') return 1;
  const elapsed = fighter.stateFrame - attack.startupFrames - attack.activeFrames;
  return Math.max(0, 1 - elapsed / attack.recoveryFrames);
}

const STYLES: Readonly<Record<SpecialEffectStyle, (frame: EffectFrame) => void>> = {
  digital: drawDigital,
  agentNetwork: drawAgentNetwork,
};

/** Small data packets travelling forward through the hitbox. */
function drawDigital({ g, fighter, attack, alpha }: EffectFrame): void {
  const { x, y } = fighter.position;
  const direction = fighter.direction;
  for (let i = 0; i < PACKET_COUNT; i++) {
    const travel = (fighter.stateFrame * 5 + i * 28) % attack.hitbox.width;
    const px = x + direction * (attack.hitbox.x + travel);
    const py = y + attack.hitbox.y + 8 + i * 16;
    g.lineStyle(2, i % 2 ? GREEN : BLUE, alpha);
    g.strokeRoundedRect(px - PACKET_WIDTH / 2, py, PACKET_WIDTH, PACKET_HEIGHT, 3);
    g.lineBetween(px - 8, py + 5, px + 6, py + 5);
    g.lineBetween(px, py + 10, px + 8, py + 10);
    g.lineBetween(px - direction * 20, py + 8, px - direction * 34, py + 8);
  }
}

/** Deterministic 0..1 "noise" from integers (no Math.random: same frame, same picture). */
function hash01(a: number, b = 0): number {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * MINDHUB-style AI agent network: agents orbit the caster during startup, a mesh of nodes
 * builds across the move's reach, then a discharge beam and data pulses run through it.
 */
function drawAgentNetwork({ g, fighter, attack, alpha }: EffectFrame): void {
  const { x, y } = fighter.position;
  const dir = fighter.direction;
  const frame = fighter.stateFrame;
  const { hitbox } = attack;
  const phase = fighter.attackPhase;
  const centerY = y + hitbox.y + hitbox.height / 2;
  const handX = x + dir * hitbox.x;

  // 1. Agents orbiting the caster's hand (whole move).
  for (let i = 0; i < AGENT_ORBIT_COUNT; i++) {
    const angle = frame * 0.25 + (i * Math.PI * 2) / AGENT_ORBIT_COUNT;
    const ax = handX + Math.cos(angle) * AGENT_ORBIT_RADIUS;
    const ay = centerY + Math.sin(angle) * AGENT_ORBIT_RADIUS * 0.6;
    g.fillStyle(NETWORK_COLORS[i % NETWORK_COLORS.length] ?? CYAN, alpha);
    g.fillCircle(ax, ay, NODE_RADIUS + 1);
    g.lineStyle(1, CYAN, 0.5 * alpha).lineBetween(handX, centerY, ax, ay);
  }

  // 2. Mesh of nodes across the reach; during startup it builds up node by node.
  const built =
    phase === 'startup' ? Math.ceil(((frame + 1) / attack.startupFrames) * NODE_COUNT) : NODE_COUNT;
  const nodes = Array.from({ length: built }, (_, i) => ({
    x: x + dir * (hitbox.x + (i / (NODE_COUNT - 1)) * hitbox.width),
    y: y + hitbox.y + hash01(i) * hitbox.height,
  }));
  nodes.forEach((node, i) => {
    const color = NETWORK_COLORS[i % NETWORK_COLORS.length] ?? CYAN;
    for (const link of [i + 1, i + 2]) {
      const target = nodes[link];
      if (!target) continue;
      g.lineStyle(1.5, color, 0.7 * alpha).lineBetween(node.x, node.y, target.x, target.y);
    }
    g.fillStyle(color, alpha).fillCircle(node.x, node.y, NODE_RADIUS);
    g.lineStyle(1, COLORS.white, 0.6 * alpha).strokeCircle(node.x, node.y, NODE_RADIUS + 2);
  });

  if (phase === 'startup') return;

  // 3. Active / recovery: discharge beam + data pulses running along the links + particles.
  const endX = x + dir * (hitbox.x + hitbox.width);
  const beamAlpha = phase === 'active' ? 0.9 : 0.5 * alpha;
  g.lineStyle(BEAM_WIDTH + 12, BLUE, 0.35 * beamAlpha).lineBetween(handX, centerY, endX, centerY);
  g.lineStyle(BEAM_WIDTH, CYAN, beamAlpha).lineBetween(handX, centerY, endX, centerY);
  g.lineStyle(2, COLORS.white, beamAlpha).lineBetween(handX, centerY, endX, centerY);

  for (let i = 0; i + 1 < nodes.length; i++) {
    const from = nodes[i];
    const to = nodes[i + 1];
    if (!from || !to) continue;
    const t = (((frame * 0.15 + i * 0.37) % 1) + 1) % 1;
    g.fillStyle(GREEN, alpha).fillRect(
      from.x + (to.x - from.x) * t - 3,
      from.y + (to.y - from.y) * t - 3,
      6,
      6,
    );
  }
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const px = x + dir * (hitbox.x + hash01(i, frame) * hitbox.width);
    const py = y + hitbox.y + hash01(frame, i) * hitbox.height;
    g.fillStyle(NETWORK_COLORS[i % NETWORK_COLORS.length] ?? CYAN, alpha).fillRect(px, py, 2, 2);
  }
}
