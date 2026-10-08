import Phaser from 'phaser';
import type { CombatEvent } from '../../core/systems/CombatSystem';
import type { ReadonlyFighter } from '../../core/fighter/ReadonlyFighter';
import type { AttackConfig, SpecialEffectConfig, SpecialEffectStyle } from '../../types/fighter';
import { COLORS, DEPTH, arcadeText } from '../../ui/theme';
import { vfxTextureKey } from '../assets/fighterAssets';
import { AGENT_THEME } from './agentTheme';
import { FLUID_THEME } from './fluidTheme';
import { LIGHTNING_THEME } from './lightningTheme';
import { MIND_THEME } from './mindTheme';
import type { EffectImage, SpecialTheme } from './specialTheme';
import { VIBE_THEME } from './vibeTheme';
import { ZAP_THEME } from './zapTheme';

const THEMES: Readonly<Record<SpecialEffectStyle, SpecialTheme>> = {
  zapMessages: ZAP_THEME,
  mindNetwork: MIND_THEME,
  vibeCode: VIBE_THEME,
  agentBuilder: AGENT_THEME,
  liquidFlow: FLUID_THEME,
  skyLightning: LIGHTNING_THEME,
};

const LABEL_OFFSET_Y = -194;
/** Images one slot can show in a frame (e.g. a glow copy and the crisp image). */
const IMAGES_PER_SLOT = 2;
/** Impacts on screen at once (a new one recycles the oldest). */
const IMPACT_SLOTS = 2;

interface Impact {
  attacker: ReadonlyFighter;
  theme: SpecialTheme;
  effect: SpecialEffectConfig;
  x: number;
  y: number;
  direction: 1 | -1;
  blocked: boolean;
  startedAt: number;
}

/**
 * A few reusable images that a theme can place each frame. Hidden again at the start of every
 * frame, so an effect that stops drawing them simply disappears (move interrupted, round
 * over...). The texture is the effect's emblem / glyph; without it, `available` is false.
 */
class ImageSlot implements EffectImage {
  private readonly images: Phaser.GameObjects.Image[];
  private used = 0;
  private texture: string | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    depth: number,
  ) {
    this.images = Array.from({ length: IMAGES_PER_SLOT }, () =>
      scene.add.image(0, 0, '__DEFAULT').setDepth(depth).setVisible(false),
    );
  }

  get available(): boolean {
    return this.texture !== null;
  }

  /** Starts a frame with this texture (path in /public), or none. */
  begin(path: string | undefined): void {
    this.used = 0;
    const key = path ? vfxTextureKey(path) : null;
    this.texture = key && this.scene.textures.exists(key) ? key : null;
    for (const image of this.images) image.setVisible(false);
  }

  show(options: Parameters<EffectImage['show']>[0]): void {
    const image = this.images[this.used];
    if (!this.texture || !image || options.alpha <= 0 || options.scale <= 0) return;
    this.used++;
    if (image.texture.key !== this.texture) image.setTexture(this.texture);
    image
      .setPosition(options.x, options.y)
      .setScale(options.scale)
      .setAlpha(Math.min(1, options.alpha))
      .setRotation(options.rotation ?? 0)
      .setBlendMode(options.glow ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL)
      .setVisible(true);
    if (options.tint === undefined) image.clearTint();
    else image.setTint(options.tint);
  }
}

/**
 * App-themed special VFX (see render/special/*Theme.ts). The move itself is drawn from the
 * fighter's stateFrame only, so it freezes in hitstop and vanishes the moment the move ends or
 * is interrupted; impacts are short time-based bursts so they play through the hitstop. Every
 * object is created once here and reused: nothing piles up, and the scene's shutdown destroys
 * it all. Styles are picked per move in FighterConfig.assets.specialEffects.
 */
export class SpecialEffects {
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly labels: readonly Phaser.GameObjects.Text[];
  private readonly moveSlots: readonly { emblem: ImageSlot; glyph: ImageSlot }[];
  private readonly impactSlots: readonly ImageSlot[];
  private readonly impacts: (Impact | null)[] = Array.from({ length: IMPACT_SLOTS }, () => null);

  constructor(private readonly scene: Phaser.Scene) {
    this.glow = scene.add.graphics().setDepth(DEPTH.effects).setBlendMode(Phaser.BlendModes.ADD);
    this.graphics = scene.add.graphics().setDepth(DEPTH.effects + 1);
    this.labels = [0, 1].map(() =>
      scene.add
        .text(0, 0, '', arcadeText(18, COLORS.cyan))
        .setOrigin(0.5)
        .setDepth(DEPTH.effects + 3)
        .setVisible(false),
    );
    this.moveSlots = [0, 1].map(() => ({
      glyph: new ImageSlot(scene, DEPTH.effects + 2),
      emblem: new ImageSlot(scene, DEPTH.effects + 2),
    }));
    this.impactSlots = Array.from(
      { length: IMPACT_SLOTS },
      () => new ImageSlot(scene, DEPTH.effects + 2),
    );
  }

  /** A special connected (hit or block): its themed impact at the contact point. */
  impact(event: CombatEvent, attacker: ReadonlyFighter): void {
    if (event.attack.state !== 'special') return;
    const effect = attacker.config.assets.specialEffects?.[event.attack.id];
    if (!effect) return;
    const slot = this.oldestImpactSlot();
    this.impacts[slot] = {
      attacker,
      theme: THEMES[effect.style],
      effect,
      x: event.point.x,
      y: event.point.y,
      direction: attacker.direction,
      blocked: event.type === 'block',
      startedAt: this.scene.time.now,
    };
  }

  /** Every rendered frame: redraw the moves in progress and the live impacts. */
  sync(fighters: readonly ReadonlyFighter[]): void {
    this.graphics.clear();
    this.glow.clear();
    fighters.forEach((fighter, index) => this.drawMove(fighter, index));
    this.drawImpacts();
  }

  private drawMove(fighter: ReadonlyFighter, index: number): void {
    const label = this.labels[index];
    const slots = this.moveSlots[index];
    label?.setVisible(false);
    const attack = fighter.activeAttack;
    const phase = fighter.attackPhase;
    const effect =
      fighter.state === 'special' && attack
        ? fighter.config.assets.specialEffects?.[attack.id]
        : undefined;
    slots?.emblem.begin(effect?.emblem);
    slots?.glyph.begin(effect?.glyph);
    if (!effect || !attack || !phase || !slots) return;

    const alpha = phase === 'recovery' ? 1 - recoveryProgress(fighter, attack) : 1;
    label
      ?.setText(effect.label)
      .setPosition(fighter.position.x, fighter.position.y + LABEL_OFFSET_Y)
      .setAlpha(alpha)
      .setVisible(true);

    const direction = fighter.direction;
    const { hitbox } = attack;
    const near = fighter.position.x + direction * hitbox.x;
    const far = fighter.position.x + direction * (hitbox.x + hitbox.width);
    const midY = fighter.position.y + hitbox.y + hitbox.height / 2;
    THEMES[effect.style].drawMove({
      g: this.graphics,
      glow: this.glow,
      fighter,
      attack,
      phase,
      frame: fighter.stateFrame,
      t: phaseProgress(fighter, attack),
      direction,
      hand: { x: near, y: midY },
      front: { x: far, y: midY },
      box: {
        left: Math.min(near, far),
        right: Math.max(near, far),
        top: fighter.position.y + hitbox.y,
        bottom: fighter.position.y + hitbox.y + hitbox.height,
      },
      emblem: slots.emblem,
      glyph: slots.glyph,
      impacting: this.impacts.some(
        (impact) =>
          impact?.attacker === fighter &&
          this.scene.time.now - impact.startedAt < impact.theme.impactMs,
      ),
    });
  }

  private drawImpacts(): void {
    const now = this.scene.time.now;
    this.impacts.forEach((impact, i) => {
      const slot = this.impactSlots[i];
      slot?.begin(impact?.effect.emblem);
      if (!impact || !slot) return;
      const t = (now - impact.startedAt) / impact.theme.impactMs;
      if (t >= 1 || t < 0) {
        this.impacts[i] = null;
        return;
      }
      impact.theme.drawImpact({
        g: this.graphics,
        glow: this.glow,
        x: impact.x,
        y: impact.y,
        direction: impact.direction,
        t,
        blocked: impact.blocked,
        emblem: slot,
      });
    });
  }

  private oldestImpactSlot(): number {
    let best = 0;
    for (let i = 0; i < this.impacts.length; i++) {
      const impact = this.impacts[i];
      if (!impact) return i;
      if (impact.startedAt < (this.impacts[best]?.startedAt ?? Infinity)) best = i;
    }
    return best;
  }
}

/** Progress (0..1) inside the move's current phase, from its frame data. */
function phaseProgress(fighter: ReadonlyFighter, attack: AttackConfig): number {
  const frame = fighter.stateFrame;
  switch (fighter.attackPhase) {
    case 'startup':
      return Math.min(1, (frame + 1) / attack.startupFrames);
    case 'active':
      return Math.min(1, (frame - attack.startupFrames + 1) / attack.activeFrames);
    default:
      return recoveryProgress(fighter, attack);
  }
}

function recoveryProgress(fighter: ReadonlyFighter, attack: AttackConfig): number {
  const elapsed = fighter.stateFrame - attack.startupFrames - attack.activeFrames;
  return Math.min(1, Math.max(0, elapsed / attack.recoveryFrames));
}
