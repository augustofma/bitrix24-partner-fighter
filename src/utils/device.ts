/** Reads a boolean URL flag such as `?debug=1` or `?touch=0`. Returns null when absent. */
export function readUrlFlag(name: string): boolean | null {
  const value = new URLSearchParams(window.location.search).get(name);
  if (value === null) return null;
  return value !== '0' && value !== 'false';
}

/**
 * Touch buttons are shown on devices whose primary pointer is a finger.
 * Override for testing with `?touch=1` / `?touch=0`.
 */
export function shouldShowTouchControls(): boolean {
  const forced = readUrlFlag('touch');
  if (forced !== null) return forced;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;
  return coarse || (navigator.maxTouchPoints > 0 && !fine);
}
