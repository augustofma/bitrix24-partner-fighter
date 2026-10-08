import { shouldShowTouchControls } from './device';

/**
 * On touch devices, the first tap (and any tap after leaving it) puts the page in fullscreen and
 * locks it to landscape, so the browser's address bar stops taking a slice of the 16:9 game.
 * Browsers only allow it from a user gesture; where it is unsupported (iPhone Safari) or refused,
 * nothing happens. Opened as an installed app, the web manifest is already fullscreen.
 */
export function enableTapToFullscreen(): void {
  if (!shouldShowTouchControls()) return;
  const root = document.documentElement;
  if (typeof root.requestFullscreen !== 'function') return;
  document.addEventListener('pointerup', () => {
    if (document.fullscreenElement) return;
    root
      .requestFullscreen({ navigationUI: 'hide' })
      .then(() => lockLandscape())
      .catch(() => undefined);
  });
}

function lockLandscape(): void {
  // Not in the TS DOM typings everywhere, and only allowed in fullscreen on Android Chrome.
  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (orientation: string) => Promise<void>;
  };
  orientation.lock?.('landscape').catch(() => undefined);
}
