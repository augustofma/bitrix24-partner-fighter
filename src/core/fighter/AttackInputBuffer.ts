import { INPUT_BUFFER_FRAMES } from '../../config/simulation';
import type { AttackButton } from '../../types/fighter';
import type { InputState } from '../../types/input';

/** A press survives briefly while busy; holding a button never refreshes its lifetime. */
export class AttackInputBuffer {
  current: { button: AttackButton | 'special'; framesLeft: number } | null = null;

  clear(): void {
    this.current = null;
  }

  update(pressed: Readonly<InputState>): void {
    const button = pressed.special
      ? 'special'
      : pressed.punch
        ? 'punch'
        : pressed.kick
          ? 'kick'
          : null;
    if (button) this.current = { button, framesLeft: INPUT_BUFFER_FRAMES };
    else if (this.current && --this.current.framesLeft <= 0) this.clear();
  }
}
