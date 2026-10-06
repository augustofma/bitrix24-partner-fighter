import type Phaser from 'phaser';
import type { ReadonlyFighter } from '../core/fighter/ReadonlyFighter';
import { COLORS, DEPTH, arcadeText } from '../ui/theme';

const GREEN = 0x43e6a0;
const BLUE = 0x258bff;
const PACKET_COUNT = 3;
const PACKET_WIDTH = 26;
const PACKET_HEIGHT = 16;

/** Read-only, frame-driven effects freeze with hitstop and disappear on interruption. */
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
      if (!effect || effect.style !== 'digital') return;
      const recovery = fighter.attackPhase === 'recovery';
      const elapsed = fighter.stateFrame - attack.startupFrames - attack.activeFrames;
      const alpha = recovery ? Math.max(0, 1 - elapsed / attack.recoveryFrames) : 1;
      const { x, y } = fighter.position;
      const direction = fighter.direction;
      label
        ?.setText(effect.label)
        .setPosition(x, y - 194)
        .setAlpha(alpha)
        .setVisible(true);
      for (let i = 0; i < PACKET_COUNT; i++) {
        const travel = (fighter.stateFrame * 5 + i * 28) % attack.hitbox.width;
        const px = x + direction * (attack.hitbox.x + travel);
        const py = y + attack.hitbox.y + 8 + i * 16;
        this.graphics.lineStyle(2, i % 2 ? GREEN : BLUE, alpha);
        this.graphics.strokeRoundedRect(px - PACKET_WIDTH / 2, py, PACKET_WIDTH, PACKET_HEIGHT, 3);
        this.graphics.lineBetween(px - 8, py + 5, px + 6, py + 5);
        this.graphics.lineBetween(px, py + 10, px + 8, py + 10);
        this.graphics.lineBetween(px - direction * 20, py + 8, px - direction * 34, py + 8);
      }
    });
  }
}
