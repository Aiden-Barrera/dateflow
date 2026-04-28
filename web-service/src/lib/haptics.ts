type HapticOptions = {
  /** Skip vibration when the user prefers reduced motion. Default: false. */
  readonly prefersReducedMotion?: boolean;
};

// De-dup the unsupported warning so it only logs once per page load, not on
// every swipe action. iOS users would otherwise see it flood the console.
let hasWarnedUnsupported = false;

/**
 * Triggers a short haptic pulse on Android/vibration-capable browsers.
 *
 * On iOS (Safari) `navigator.vibrate` is not implemented. We log a single
 * console.warn (de-duped via module-level flag) so it's visible during
 * development without flooding production logs.
 *
 * Returns early in non-browser contexts (SSR) where `navigator` is undefined.
 * Respects `prefersReducedMotion` — motion-sensitive users should not
 * receive unexpected physical feedback either.
 */
export function triggerHaptic(
  durationMs: number,
  { prefersReducedMotion = false }: HapticOptions = {},
): void {
  if (prefersReducedMotion) return;

  // SSR guard — navigator is not defined outside the browser
  if (typeof navigator === "undefined") return;

  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(durationMs);
  } else if (!hasWarnedUnsupported) {
    hasWarnedUnsupported = true;
    console.warn(
      "[haptics] navigator.vibrate not supported (iOS or non-vibrating browser)",
    );
  }
}

/** Reset the de-dup flag — exposed for testing only. */
export function _resetHapticWarning(): void {
  hasWarnedUnsupported = false;
}
