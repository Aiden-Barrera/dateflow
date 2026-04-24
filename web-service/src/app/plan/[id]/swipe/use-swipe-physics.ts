"use client";

import { useCallback, useRef, useState } from "react";
import { useSpring } from "@react-spring/web";

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

// ─── Hook ─────────────────────────────────────────────────────────────────────

type UseSwipePhysicsOptions = {
  readonly submitting: boolean;
  readonly prefersReducedMotion: boolean;
  readonly onSwipe: (liked: boolean) => Promise<void>;
};

type PointerTracking = {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly startRegionY: number;
  readonly lastX: number;
  readonly lastTimestamp: number;
  readonly intent: DragIntent;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly velocityX: number;
};

export function useSwipePhysics({
  submitting,
  prefersReducedMotion,
  onSwipe,
}: UseSwipePhysicsOptions) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef<PointerTracking | null>(null);
  const [dragState, setDragState] = useState<SwipeDragState | null>(null);
  const [animatingSwipe, setAnimatingSwipe] = useState<SwipeAnimation | null>(null);

  const target = computeSpringTarget(dragState, animatingSwipe, prefersReducedMotion);

  const [springProps, springApi] = useSpring(() => ({
    x: 0,
    y: 28,
    rotation: 0,
    opacity: 0.78,
    scale: 0.965,
    config: { tension: 280, friction: 26 },
  }));

  // Settle the card into resting position after mount
  const settle = useCallback(() => {
    springApi.start({ x: 0, y: 0, rotation: 0, opacity: 1, scale: 1 });
  }, [springApi]);

  const triggerSwipe = useCallback(
    async (liked: boolean) => {
      if (submitting || animatingSwipe) return;

      const snapshot = dragState;
      const anim: SwipeAnimation = {
        direction: liked ? "right" : "left",
        offsetX: snapshot?.offsetX ?? 0,
        offsetY: snapshot?.offsetY ?? 0,
        velocityX: snapshot?.velocityX ?? 0,
      };

      setAnimatingSwipe(anim);
      setDragState(null);
      pointerRef.current = null;

      const flyTarget = computeSpringTarget(null, anim, prefersReducedMotion);
      springApi.start({
        x: flyTarget.x,
        y: flyTarget.y,
        rotation: flyTarget.rotation,
        opacity: flyTarget.opacity,
        config: { tension: 200, friction: 22 },
      });

      if (!prefersReducedMotion) {
        window.navigator?.vibrate?.(12);
      }

      try {
        await onSwipe(liked);
      } catch {
        setAnimatingSwipe(null);
        springApi.start({ x: 0, y: 0, rotation: 0, opacity: 1, scale: 1 });
      }
    },
    [animatingSwipe, dragState, onSwipe, prefersReducedMotion, springApi, submitting],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (submitting || animatingSwipe) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      const bounds = event.currentTarget.getBoundingClientRect();
      const relativeY = event.clientY - bounds.top;

      pointerRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startRegionY: clamp(relativeY / bounds.height, 0, 1),
        lastX: event.clientX,
        lastTimestamp: event.timeStamp,
        intent: "idle",
        offsetX: 0,
        offsetY: 0,
        velocityX: 0,
      };
    },
    [animatingSwipe, submitting],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const ptr = pointerRef.current;
      if (!ptr || ptr.pointerId !== event.pointerId) return;

      const offsetX = event.clientX - ptr.startX;
      const offsetY = event.clientY - ptr.startY;
      const absX = Math.abs(offsetX);
      const absY = Math.abs(offsetY);
      const elapsed = Math.max(event.timeStamp - ptr.lastTimestamp, 1);
      const velocityX = (event.clientX - ptr.lastX) / elapsed;

      let nextIntent = ptr.intent;

      if (ptr.intent === "idle") {
        if (absY > 14 && absY > absX) nextIntent = "scrolling";
        else if (absX > 14 && absX >= absY) {
          nextIntent = "dragging";
          cardRef.current?.setPointerCapture(event.pointerId);
        }
      }

      const updated: PointerTracking = {
        ...ptr,
        intent: nextIntent,
        offsetX,
        offsetY,
        velocityX,
        lastX: event.clientX,
        lastTimestamp: event.timeStamp,
      };
      pointerRef.current = updated;

      if (nextIntent === "dragging") {
        const newDrag: SwipeDragState = {
          offsetX,
          offsetY,
          velocityX,
          startRegionY: ptr.startRegionY,
          intent: "dragging",
        };
        setDragState(newDrag);
        springApi.start({
          x: offsetX,
          y: clamp(offsetY * 0.16, -26, 26) + Math.min(absX * 0.02, 12),
          rotation: clamp(offsetX / 16 + (ptr.startRegionY - 0.5) * -8, -MAX_ROTATION_DEG, MAX_ROTATION_DEG),
          opacity: 1,
          scale: 1,
          immediate: true,
        });
      }
    },
    [springApi],
  );

  const handlePointerEnd = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const ptr = pointerRef.current;
      if (!ptr || ptr.pointerId !== event.pointerId) return;

      if (cardRef.current?.hasPointerCapture(event.pointerId)) {
        cardRef.current.releasePointerCapture(event.pointerId);
      }

      const finalDrag: SwipeDragState = {
        offsetX: ptr.offsetX,
        offsetY: ptr.offsetY,
        velocityX: ptr.velocityX,
        startRegionY: ptr.startRegionY,
        intent: ptr.intent,
      };

      pointerRef.current = null;
      setDragState(null);

      if (isSwipeCommitted(finalDrag)) {
        const liked = finalDrag.offsetX > 0;
        void triggerSwipe(liked);
      } else {
        springApi.start({
          x: 0,
          y: 0,
          rotation: 0,
          opacity: 1,
          scale: 1,
          config: { tension: 320, friction: 28 },
        });
      }
    },
    [springApi, triggerSwipe],
  );

  const dragStrength = dragState
    ? Math.min(Math.abs(clamp(dragState.offsetX / SWIPE_TRIGGER_PX, -1.3, 1.3)), 1)
    : animatingSwipe
      ? 1
      : 0;

  const dragRatio = dragState
    ? clamp(dragState.offsetX / SWIPE_TRIGGER_PX, -1.3, 1.3)
    : 0;

  return {
    cardRef,
    springProps,
    dragState,
    animatingSwipe,
    dragStrength,
    dragRatio,
    target,
    settle,
    triggerSwipe,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
  };
}
