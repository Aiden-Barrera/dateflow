type HapticOptions = {
  /** Skip vibration when the user prefers reduced motion. Default: false. */
  readonly prefersReducedMotion?: boolean;
};

/**
 * Triggers a short haptic pulse on Android/vibration-capable browsers.
 *
 * On iOS (Safari) `navigator.vibrate` is not implemented. Rather than
 * silently swallowing the no-op we log a single console.warn so it's
 * visible during development without crashing production.
 *
 * Respects `prefersReducedMotion` — motion-sensitive users should not
 * receive unexpected physical feedback either.
 */
export function triggerHaptic(
  durationMs: number,
  { prefersReducedMotion = false }: HapticOptions = {},
): void {
  if (prefersReducedMotion) return;

  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(durationMs);
  } else {
    console.warn(
      "[haptics] navigator.vibrate not supported (iOS or non-vibrating browser)",
    );
  }
}
