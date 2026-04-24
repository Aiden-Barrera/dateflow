"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSpring, animated } from "@react-spring/web";
import type { Venue } from "../../../../lib/types/venue";
import {
  isSwipeCommitted,
  computeSpringTarget,
  SWIPE_TRIGGER_PX,
  MAX_ROTATION_DEG,
  type SwipeDragState,
  type SwipeAnimation,
  type DragIntent,
} from "./use-swipe-physics";
import { VenueCardContent, PreviewVenueCard } from "./venue-card-content";

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

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

type SwipeCardCanvasProps = {
  readonly venue: Venue;
  readonly nextVenue: Venue | null;
  readonly thirdVenue: Venue | null;
  readonly cardIndex: number;
  readonly totalCards: number;
  readonly submitting: boolean;
  readonly onSwipe: (liked: boolean) => Promise<void>;
};

export function SwipeCardCanvas({
  venue,
  nextVenue,
  thirdVenue,
  cardIndex,
  totalCards,
  submitting,
  onSwipe,
}: SwipeCardCanvasProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef<PointerTracking | null>(null);
  const [dragState, setDragState] = useState<SwipeDragState | null>(null);
  const [animatingSwipe, setAnimatingSwipe] = useState<SwipeAnimation | null>(null);
  const [isSettled, setIsSettled] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const [springProps, springApi] = useSpring(() => ({
    x: 0,
    y: 28,
    rotation: 0,
    opacity: 0.78,
    scale: 0.965,
    config: { tension: 280, friction: 26 },
  }));

  useEffect(() => {
    let second: ReturnType<typeof requestAnimationFrame> | null = null;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        setIsSettled(true);
        springApi.start({ x: 0, y: 0, rotation: 0, opacity: 1, scale: 1 });
      });
    });
    return () => {
      cancelAnimationFrame(first);
      if (second !== null) cancelAnimationFrame(second);
    };
  }, [springApi]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

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

      if (!prefersReducedMotion) window.navigator?.vibrate?.(12);

      try {
        await onSwipe(liked);
      } catch {
        setAnimatingSwipe(null);
        springApi.start({ x: 0, y: 0, rotation: 0, opacity: 1, scale: 1 });
      }
    },
    [animatingSwipe, dragState, onSwipe, prefersReducedMotion, springApi, submitting],
  );

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (submitting || animatingSwipe) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    pointerRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRegionY: clamp((event.clientY - bounds.top) / bounds.height, 0, 1),
      lastX: event.clientX,
      lastTimestamp: event.timeStamp,
      intent: "idle",
      offsetX: 0,
      offsetY: 0,
      velocityX: 0,
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const ptr = pointerRef.current;
    if (!ptr || ptr.pointerId !== event.pointerId) return;

    const offsetX = event.clientX - ptr.startX;
    const offsetY = event.clientY - ptr.startY;
    const absX = Math.abs(offsetX);
    const absY = Math.abs(offsetY);
    const elapsed = Math.max(event.timeStamp - ptr.lastTimestamp, 1);
    const velocityX = (event.clientX - ptr.lastX) / elapsed;

    let intent = ptr.intent;
    if (intent === "idle") {
      if (absY > 14 && absY > absX) intent = "scrolling";
      else if (absX > 14 && absX >= absY) {
        intent = "dragging";
        cardRef.current?.setPointerCapture(event.pointerId);
      }
    }

    pointerRef.current = {
      ...ptr,
      intent,
      offsetX,
      offsetY,
      velocityX,
      lastX: event.clientX,
      lastTimestamp: event.timeStamp,
    };

    if (intent === "dragging") {
      const drag: SwipeDragState = {
        offsetX,
        offsetY,
        velocityX,
        startRegionY: ptr.startRegionY,
        intent: "dragging",
      };
      setDragState(drag);

      const pivot = (ptr.startRegionY - 0.5) * -8;
      springApi.start({
        x: offsetX,
        y: clamp(offsetY * 0.16, -26, 26) + Math.min(absX * 0.02, 12),
        rotation: clamp(offsetX / 16 + pivot, -MAX_ROTATION_DEG, MAX_ROTATION_DEG),
        opacity: 1,
        scale: 1,
        immediate: true,
      });
    }
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
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
      void triggerSwipe(finalDrag.offsetX > 0);
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
  }

  const dragOffsetX = dragState?.offsetX ?? 0;
  const dragOffsetY = dragState?.offsetY ?? 0;
  const dragRatio = clamp(dragOffsetX / SWIPE_TRIGGER_PX, -1.3, 1.3);
  const dragStrength = Math.min(Math.abs(dragRatio), 1);
  const isDragging = dragState?.intent === "dragging";
  const neutralReturnStrength = isDragging || animatingSwipe ? 0 : 1;

  // Back-card opacity/transform driven by drag progress.
  // At rest: card 2 peeks 18px below with 96% scale, card 3 peeks 36px at 93% scale.
  // As top card is dragged, both cards animate forward (more visible + larger).
  const card2YOffset = 18 - dragStrength * 14 - (animatingSwipe ? 20 : 0);
  const card2Scale = 0.96 + dragStrength * 0.032 + (animatingSwipe ? 0.02 : 0);
  const card2Opacity = 0.84 + dragStrength * 0.16 + (animatingSwipe ? 0.16 : 0);

  const card3YOffset = 36 - dragStrength * 8;
  const card3Scale = 0.93 + dragStrength * 0.02;
  const card3Opacity = 0.38 + dragStrength * 0.18;

  return (
    <div className="relative min-h-[640px]">
      {/* Card 3 — deepest layer; shows blurred preview when venue available */}
      <div
        className="pointer-events-none absolute inset-x-5 top-6 bottom-1 overflow-hidden rounded-[2.2rem] border border-white/25 bg-white/25"
        style={{
          opacity: card3Opacity,
          transform: `translateY(${card3YOffset}px) scale(${card3Scale})`,
          filter: thirdVenue ? "blur(2px)" : "blur(1px)",
          boxShadow: "0 20px 56px rgba(45,42,38,0.06)",
          transition: isDragging
            ? "transform 70ms linear, opacity 70ms linear"
            : "transform 360ms cubic-bezier(0.16,0.84,0.24,1), opacity 220ms ease",
        }}
        aria-hidden="true"
      >
        {thirdVenue ? <PreviewVenueCard venue={thirdVenue} /> : null}
      </div>

      {/* Card 2 — peek card with real venue content */}
      {nextVenue ? (
        <div
          className="pointer-events-none absolute inset-x-2 top-2 bottom-2 overflow-hidden rounded-[2rem] border border-white/55 bg-white/72 shadow-[0_14px_36px_rgba(45,42,38,0.08)]"
          style={{
            transform: `translateY(${card2YOffset}px) scale(${card2Scale})`,
            opacity: card2Opacity,
            transition: isDragging
              ? "transform 70ms linear, opacity 70ms linear"
              : "transform 320ms cubic-bezier(0.18,0.86,0.24,1), opacity 220ms ease",
          }}
          aria-hidden="true"
        >
          <PreviewVenueCard venue={nextVenue} />
        </div>
      ) : null}

      {/* Card 1 — top interactive card with spring physics */}
      <animated.div
        ref={cardRef}
        className={`relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/95 shadow-[0_30px_80px_rgba(74,18,36,0.45)] backdrop-blur-sm ${
          submitting ? "pointer-events-none" : "cursor-grab active:cursor-grabbing"
        }`}
        style={{
          x: springProps.x,
          y: springProps.y,
          rotate: springProps.rotation,
          opacity: !isSettled ? 0.78 : springProps.opacity,
          scale: springProps.scale,
          filter: !isSettled ? "blur(6px)" : animatingSwipe ? "blur(1.5px)" : "blur(0px)",
          touchAction: "pan-y",
          boxShadow: isDragging || animatingSwipe
            ? "0 32px 110px rgba(45,42,38,0.26)"
            : "0 24px 80px rgba(45,42,38,0.16)",
        }}
        tabIndex={0}
        aria-label="Venue swipe card. Use left arrow to pass and right arrow to like."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onKeyDown={(event) => {
          if (submitting || animatingSwipe) return;
          if (event.key === "ArrowLeft") { event.preventDefault(); void triggerSwipe(false); }
          if (event.key === "ArrowRight") { event.preventDefault(); void triggerSwipe(true); }
        }}
      >
        <VenueCardContent
          venue={venue}
          cardIndex={cardIndex}
          totalCards={totalCards}
          dragStrength={dragStrength}
          dragRatio={dragRatio}
          dragOffsetX={dragOffsetX}
          dragOffsetY={dragOffsetY}
          isDragging={isDragging}
          isAnimating={Boolean(animatingSwipe)}
          animatingDirection={animatingSwipe?.direction ?? null}
          submitting={submitting}
          neutralReturnStrength={neutralReturnStrength}
          onSwipe={(liked) => { void triggerSwipe(liked); }}
        />
      </animated.div>
    </div>
  );
}
