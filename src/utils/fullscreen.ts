import { STRINGS } from '../config/strings';
import { shouldShowTouchControls } from './device';

/** Prefixed fullscreen API of Safari (iPad; iPhone has none for pages). */
type WebkitFullscreen = {
  webkitRequestFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

const IOS_HINT_SEEN = 'bpf-ios-hint-seen';
const IOS_HINT_MS = 9000;

/**
 * On touch devices, the first tap (and any tap after leaving it) puts the page in fullscreen and
 * locks it to landscape, so the browser's address bar stops taking a slice of the 16:9 game.
 * Browsers only allow it from a user gesture. iPad Safari uses the prefixed API. iPhone Safari
 * has no fullscreen for pages: there a one-time hint explains how to add the game to the home
 * screen, which opens it as a fullscreen app (as does the web manifest on Android).
 */
export function enableTapToFullscreen(): void {
  if (!shouldShowTouchControls() || isStandalone()) return;
  // iPhone Safari has no fullscreen for pages, whatever the API surface says.
  if (isIphone()) {
    showIosHint();
    return;
  }
  const root = document.documentElement as HTMLElement & WebkitFullscreen;
  const request =
    typeof root.requestFullscreen === 'function'
      ? () => root.requestFullscreen({ navigationUI: 'hide' })
      : typeof root.webkitRequestFullscreen === 'function'
        ? () => Promise.resolve(root.webkitRequestFullscreen?.())
        : undefined;
  if (!request) return;
  document.addEventListener('pointerup', () => {
    const doc = document as Document & WebkitFullscreen;
    if (doc.fullscreenElement || doc.webkitFullscreenElement) return;
    try {
      request()
        .then(() => lockLandscape())
        .catch(() => undefined);
    } catch {
      // Refused synchronously (old prefixed API): stay in the page.
    }
  });
}

/** Opened from the home screen (installed app): already fullscreen. */
function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

function isIphone(): boolean {
  return /iPhone|iPod/.test(navigator.userAgent);
}

function showIosHint(): void {
  try {
    if (sessionStorage.getItem(IOS_HINT_SEEN)) return;
    sessionStorage.setItem(IOS_HINT_SEEN, '1');
  } catch {
    // Storage blocked: show it anyway.
  }
  const hint = document.createElement('div');
  hint.id = 'ios-hint';
  hint.textContent = STRINGS.iosFullscreenHint;
  const close = () => hint.remove();
  document.addEventListener('pointerup', close, { once: true });
  window.setTimeout(close, IOS_HINT_MS);
  document.body.appendChild(hint);
}

function lockLandscape(): void {
  // Not in the TS DOM typings everywhere, and only allowed in fullscreen on Android Chrome.
  const orientation = screen.orientation as
    (ScreenOrientation & { lock?: (orientation: string) => Promise<void> }) | undefined;
  orientation?.lock?.('landscape').catch(() => undefined);
}
