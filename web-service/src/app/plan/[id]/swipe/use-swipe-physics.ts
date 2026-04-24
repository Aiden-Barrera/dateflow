"use client";

export const SWIPE_TRIGGER_PX = 124;
export const SWIPE_VELOCITY_TRIGGER = 0.55;
export const SWIPE_MIN_VELOCITY_OFFSET_PX = 64;
export const MAX_ROTATION_DEG = 18;

export type DragIntent = "idle" | "dragging" | "scrolling";

export type SwipeDragState = {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly velocityX: number;
  readonly startRegionY: number;
  readonly intent: DragIntent;
};

export type SwipeAnimation = {
  readonly direction: "left" | "right";
  readonly offsetX: number;
  readonly offsetY: number;
  readonly velocityX: number;
};

export type SpringTarget = {
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly opacity: number;
};

// ─── Pure logic (exported for tests) ─────────────────────────────────────────

export function isSwipeCommitted(drag: SwipeDragState): boolean {
  if (drag.intent !== "dragging") return false;
  const absX = Math.abs(drag.offsetX);
  if (absX >= SWIPE_TRIGGER_PX) return true;
  return (
    Math.abs(drag.velocityX) >= SWIPE_VELOCITY_TRIGGER &&
    absX >= SWIPE_MIN_VELOCITY_OFFSET_PX
  );
}

// Returns the drag direction for any meaningful offset (> deadzone).
// Returns null only when the offset is too small to have intent.
export function getSwipeDirection(drag: SwipeDragState): "left" | "right" | null {
  if (Math.abs(drag.offsetX) < 14) return null;
  return drag.offsetX > 0 ? "right" : "left";
}

export function computeSpringTarget(
  drag: SwipeDragState | null,
  anim: SwipeAnimation | null,
  prefersReducedMotion: boolean,
): SpringTarget {
  if (anim) {
    const sign = anim.direction === "right" ? 1 : -1;
    const releaseY = clamp(anim.offsetY * 0.6, -80, 80);
    const rotation = prefersReducedMotion
      ? sign * 4
      : clamp(
          anim.offsetX / 14 + sign * 6 + anim.velocityX * 8,
          anim.direction === "right" ? 8 : -24,
          anim.direction === "right" ? 24 : -8,
        );
    return { x: sign * 600, y: releaseY, rotation, opacity: 0 };
  }

  if (drag?.intent === "dragging") {
    const pivot = (drag.startRegionY - 0.5) * -2;
    const rotation = prefersReducedMotion
      ? clamp(drag.offsetX / 48, -4, 4)
      : clamp(drag.offsetX / 16 + pivot * 4, -MAX_ROTATION_DEG, MAX_ROTATION_DEG);
    const lift = Math.min(Math.abs(drag.offsetX) * 0.02, 12);
    const swayY = clamp(drag.offsetY * 0.16, -26, 26);
    return { x: drag.offsetX, y: swayY + lift, rotation, opacity: 1 };
  }

  return { x: 0, y: 0, rotation: 0, opacity: 1 };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

