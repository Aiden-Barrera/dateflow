"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSpring, animated } from "@react-spring/web";
import type { Venue } from "../../../../lib/types/venue";
import { triggerHaptic } from "../../../../lib/haptics";
import {
  isSwipeCommitted,
  computeSpringTarget,
  SWIPE_TRIGGER_PX,
  MAX_ROTATION_DEG,
  type SwipeDragState,
  type SwipeAnimation,
  type DragIntent,
} from "./use-swipe-physics";
import { VenueCardContent } from "./venue-card-content";

const SWIPE_EXIT_DURATION_MS = 240;

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function dragRatioFromX(x: number) {
  return clamp(x / SWIPE_TRIGGER_PX, -1.3, 1.3);
}

function dragStrengthFromX(x: number) {
  return Math.min(Math.abs(dragRatioFromX(x)), 1);
}

type PointerTracking = {
  pointerId: number;
  startX: number;
  startY: number;
  startRegionY: number;
  lastX: number;
  lastTimestamp: number;
  intent: DragIntent;
  offsetX: number;
  offsetY: number;
  velocityX: number;
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
  const animatingSwipeRef = useRef<SwipeAnimation | null>(null);

  // The animation state is tagged with the venue id it belongs to.  When the
  // card advances to the next venue (no remount, key={round}), the venue.id
  // changes and animatingSwipe automatically resolves to null — overlay badges
  // hide themselves without needing setState inside any effect.
  type ActiveSwipeAnimation = SwipeAnimation & { readonly venueId: string };
  const [swipeAnimation, setSwipeAnimation] = useState<ActiveSwipeAnimation | null>(null);
  const animatingSwipe = swipeAnimation?.venueId === venue.id ? swipeAnimation : null;
  const isAnimating = Boolean(animatingSwipe);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // ── Top card spring ───────────────────────────────────────────────────────
  const [cardSpring, cardApi] = useSpring(() => ({
    x: 0,
    y: 16,
    rotation: 0,
    opacity: 0,
    scale: 0.96,
    config: { tension: 300, friction: 28 },
  }));

  // ── Back-card springs (opacity 0 at rest → animate in as top card drags) ─
  const [card2Spring, card2Api] = useSpring(() => ({
    y: 20,
    scale: 0.96,
    opacity: 0,
    config: { tension: 220, friction: 24 },
  }));

  const [card3Spring, card3Api] = useSpring(() => ({
    y: 36,
    scale: 0.93,
    opacity: 0,
    config: { tension: 180, friction: 24 },
  }));

  // Track the previous venue id so we can distinguish initial mount from a
  // within-round card advance (when key={round} keeps this component alive).
  const prevVenueIdRef = useRef<string | null>(null);

  // Settle animation on mount (initial card load for the round)
  useEffect(() => {
    let second: ReturnType<typeof requestAnimationFrame> | null = null;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        cardApi.start({ x: 0, y: 0, rotation: 0, opacity: 1, scale: 1 });
      });
    });
    return () => {
      cancelAnimationFrame(first);
      if (second !== null) cancelAnimationFrame(second);
    };
  }, [cardApi]);

  // When the venue advances within the same round (no remount), the card 2
  // preview was already animated to opacity 1 / y 0 by the swipe gesture.
  // Snap the top-card spring to that settled position immediately so the user
  // sees no blank flash, then reset the back-card springs to their resting
  // positions ready for the next drag interaction.
  //
  // useLayoutEffect is intentional: we synchronously correct spring state
  // before the browser paints the new venue, so there is never a frame at
  // which the card appears in the wrong position or opacity.
  useLayoutEffect(() => {
    if (prevVenueIdRef.current === null) {
      // First render — mount effect above handles the entrance animation.
      prevVenueIdRef.current = venue.id;
      return;
    }
    if (prevVenueIdRef.current === venue.id) {
      // Same venue (StrictMode double-fire guard) — nothing to do.
      return;
    }
    prevVenueIdRef.current = venue.id;

    // Card advanced in-place — clear stale gesture/animation state.
    // (animatingSwipe resolves to null automatically via venue-id mismatch —
    //  no setSwipeAnimation call needed here.)
    animatingSwipeRef.current = null;
    pointerRef.current = null;
    cardApi.stop();
    card2Api.stop();
    card3Api.stop();

    // Immediately place the top card at the fully-settled position.
    // Card 2 was already at y:0, scale:1, opacity:1 from the swipe animation,
    // so snapping here means the user sees no blank frame.
    cardApi.start({ x: 0, y: 0, rotation: 0, opacity: 1, scale: 1, immediate: true });

    // Reset back-card springs so the next drag starts clean.
    card2Api.start({ y: 20, scale: 0.96, opacity: 0, immediate: true });
    card3Api.start({ y: 36, scale: 0.93, opacity: 0, immediate: true });
  }, [venue.id, cardApi, card2Api, card3Api]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // ── Swipe commit ──────────────────────────────────────────────────────────
  const triggerSwipe = useCallback(
    async (liked: boolean) => {
      if (submitting || animatingSwipeRef.current) return;

      const ptr = pointerRef.current;
      const anim: SwipeAnimation = {
        direction: liked ? "right" : "left",
        offsetX: ptr?.offsetX ?? 0,
        offsetY: ptr?.offsetY ?? 0,
        velocityX: ptr?.velocityX ?? 0,
      };
      animatingSwipeRef.current = anim;
      setSwipeAnimation({ ...anim, venueId: venue.id });
      pointerRef.current = null;

      const flyTarget = computeSpringTarget(null, anim, prefersReducedMotion);
      cardApi.start({
        x: flyTarget.x,
        y: flyTarget.y,
        rotation: flyTarget.rotation,
        opacity: flyTarget.opacity,
        config: { tension: 200, friction: 22 },
      });

      // Back card animates fully forward while top flies away
      card2Api.start({ y: 0, scale: 1, opacity: 1, config: { tension: 220, friction: 22 } });
      card3Api.start({ y: 20, scale: 0.96, opacity: 0.7, config: { tension: 180, friction: 22 } });

      triggerHaptic(10, { prefersReducedMotion });

      try {
        await new Promise((resolve) => window.setTimeout(resolve, SWIPE_EXIT_DURATION_MS));
        await onSwipe(liked);
      } catch {
        animatingSwipeRef.current = null;
        setSwipeAnimation(null);
        cardApi.start({ x: 0, y: 0, rotation: 0, opacity: 1, scale: 1 });
        card2Api.start({ y: 20, scale: 0.96, opacity: 0 });
        card3Api.start({ y: 36, scale: 0.93, opacity: 0 });
      }
    },
    [cardApi, card2Api, card3Api, onSwipe, prefersReducedMotion, submitting, venue.id],
  );

  // ── Pointer handlers (NO React state — zero re-renders during drag) ───────
  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (submitting || animatingSwipeRef.current) return;
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

    // Resolve intent once
    if (ptr.intent === "idle") {
      if (absY > 12 && absY > absX) {
        ptr.intent = "scrolling";
      } else if (absX > 10 && absX >= absY) {
        ptr.intent = "dragging";
        cardRef.current?.setPointerCapture(event.pointerId);
      }
    }

    ptr.offsetX = offsetX;
    ptr.offsetY = offsetY;
    ptr.velocityX = velocityX;
    ptr.lastX = event.clientX;
    ptr.lastTimestamp = event.timeStamp;

    if (ptr.intent !== "dragging") return;

    // Update top card spring — immediate (no animation, follows finger exactly)
    const pivot = (ptr.startRegionY - 0.5) * -8;
    cardApi.start({
      x: offsetX,
      y: clamp(offsetY * 0.16, -26, 26) + Math.min(absX * 0.02, 12),
      rotation: clamp(offsetX / 16 + pivot, -MAX_ROTATION_DEG, MAX_ROTATION_DEG),
      opacity: 1,
      scale: 1,
      immediate: true,
    });

    // Update back cards imperatively — spring-animated (not immediate)
    const strength = dragStrengthFromX(offsetX);
    card2Api.start({
      y: 20 - strength * 18,
      scale: 0.96 + strength * 0.035,
      opacity: strength,
    });
    card3Api.start({
      y: 36 - strength * 10,
      scale: 0.93 + strength * 0.02,
      opacity: strength * 0.55,
    });
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    const ptr = pointerRef.current;
    if (!ptr || ptr.pointerId !== event.pointerId) return;

    if (cardRef.current?.hasPointerCapture(event.pointerId)) {
      try {
        cardRef.current.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture may already be released by the browser on pointerup
        // or pointercancel, especially while the card is transitioning.
      }
    }

    const finalDrag: SwipeDragState = {
      offsetX: ptr.offsetX,
      offsetY: ptr.offsetY,
      velocityX: ptr.velocityX,
      startRegionY: ptr.startRegionY,
      intent: ptr.intent,
    };
    pointerRef.current = null;

    if (isSwipeCommitted(finalDrag)) {
      void triggerSwipe(finalDrag.offsetX > 0);
    } else {
      // Snap back
      cardApi.start({
        x: 0,
        y: 0,
        rotation: 0,
        opacity: 1,
        scale: 1,
        config: { tension: 340, friction: 28 },
      });
      card2Api.start({ y: 20, scale: 0.96, opacity: 0 });
      card3Api.start({ y: 36, scale: 0.93, opacity: 0 });
    }
  }

  // ── Animated overlay values derived from spring (no React state) ──────────
  // These use @react-spring/web's .to() — they update the DOM directly,
  // bypassing React's render cycle entirely.
  const overlayOpacity = cardSpring.x.to((x) => {
    const s = dragStrengthFromX(x);
    return isAnimating ? Math.max(s * 0.9, 0.45) : s * 0.9;
  });

  const overlayBackground = cardSpring.x.to((x) => {
    const ratio = dragRatioFromX(x);
    const s = Math.min(Math.abs(ratio), 1);
    return ratio >= 0
      ? `linear-gradient(135deg, rgba(16,163,127,${0.14 + s * 0.26}), rgba(16,163,127,0) 60%)`
      : `linear-gradient(225deg, rgba(220,53,69,${0.14 + s * 0.26}), rgba(220,53,69,0) 60%)`;
  });

  const passOpacity = cardSpring.x.to((x) => {
    const ratio = dragRatioFromX(x);
    if (animatingSwipe?.direction === "left") return 1;
    return ratio < -0.12 ? Math.min(Math.abs(ratio), 1) : 0;
  });

  const passScale = cardSpring.x.to((x) => {
    const s = Math.min(Math.abs(dragRatioFromX(x)), 1);
    return 0.94 + s * 0.12;
  });

  const likeOpacity = cardSpring.x.to((x) => {
    const ratio = dragRatioFromX(x);
    if (animatingSwipe?.direction === "right") return 1;
    return ratio > 0.12 ? Math.min(ratio, 1) : 0;
  });

  const likeScale = cardSpring.x.to((x) => {
    const s = Math.min(Math.abs(dragRatioFromX(x)), 1);
    return 0.94 + s * 0.12;
  });

  return (
    <div className="relative mx-auto h-[min(58dvh,34rem)] min-h-[29rem] w-full max-w-[23rem] sm:h-[40rem] sm:min-h-[40rem] sm:max-w-none">

      {/* Card 3 — deepest, only visible during drag/swipe, same layout as top card */}
      {thirdVenue ? (
        <animated.div
          className="pointer-events-none absolute inset-x-5 top-0 bottom-0 overflow-hidden rounded-[2.2rem] border border-white/20 bg-white shadow-[0_10px_28px_rgba(45,42,38,0.10)]"
          style={{
            y: card3Spring.y,
            scale: card3Spring.scale,
            opacity: card3Spring.opacity,
          }}
          aria-hidden="true"
          inert
        >
          <VenueCardContent
            venue={thirdVenue}
            cardIndex={cardIndex + 2}
            totalCards={totalCards}
            submitting={false}
            isAnimating={false}
            onSwipe={() => undefined}
          />
        </animated.div>
      ) : null}

      {/* Card 2 — peek card, hidden at rest, slides in as top card is dragged, same layout as top card */}
      {nextVenue ? (
        <animated.div
          className="pointer-events-none absolute inset-x-3 top-0 bottom-0 overflow-hidden rounded-[2rem] border border-white/40 bg-white shadow-[0_14px_36px_rgba(45,42,38,0.12)]"
          style={{
            y: card2Spring.y,
            scale: card2Spring.scale,
            opacity: card2Spring.opacity,
          }}
          aria-hidden="true"
          inert
        >
          <VenueCardContent
            venue={nextVenue}
            cardIndex={cardIndex + 1}
            totalCards={totalCards}
            submitting={false}
            isAnimating={false}
            onSwipe={() => undefined}
          />
        </animated.div>
      ) : null}

      {/* Card 1 — top interactive card, fully opaque to prevent bleedthrough */}
      <animated.div
        ref={cardRef}
        className={`absolute inset-0 overflow-hidden rounded-[2rem] border border-white/30 bg-white shadow-[0_24px_80px_rgba(45,42,38,0.18)] ${
          submitting ? "pointer-events-none" : "cursor-grab active:cursor-grabbing"
        }`}
        style={{
          x: cardSpring.x,
          y: cardSpring.y,
          rotate: cardSpring.rotation,
          opacity: cardSpring.opacity,
          scale: cardSpring.scale,
          filter: "none",
          touchAction: "pan-y",
          userSelect: "none",
          WebkitUserSelect: "none",
          willChange: "transform",
        }}
        tabIndex={0}
        aria-label="Venue swipe card. Use left arrow to pass and right arrow to like."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onKeyDown={(event) => {
          if (submitting || animatingSwipeRef.current) return;
          if (event.key === "ArrowLeft") { event.preventDefault(); void triggerSwipe(false); }
          if (event.key === "ArrowRight") { event.preventDefault(); void triggerSwipe(true); }
        }}
      >
        {/* Venue content — keyed by venue id so internal state (photo index,
            hours toggle) resets when the card advances within the same round. */}
        <VenueCardContent
          key={venue.id}
          venue={venue}
          cardIndex={cardIndex}
          totalCards={totalCards}
          submitting={submitting}
          isAnimating={isAnimating}
          onSwipe={(liked) => { void triggerSwipe(liked); }}
        />

        {/* Drag direction tint — animated via spring interpolation, zero re-renders */}
        <animated.div
          className="pointer-events-none absolute inset-0 z-10"
          style={{ opacity: overlayOpacity, background: overlayBackground }}
        />

        {/* Top gloss */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0))]" />

        {/* Pass badge */}
        <animated.div
          className="pointer-events-none absolute left-5 top-5 z-20 rounded-full border border-[rgba(220,53,69,0.6)] bg-[rgba(220,53,69,0.92)] px-4 py-2 text-caption font-semibold uppercase tracking-[0.18em] text-white shadow-sm backdrop-blur-sm"
          style={{ opacity: passOpacity, scale: passScale }}
          aria-hidden="true"
        >
          Pass
        </animated.div>

        {/* Like badge */}
        <animated.div
          className="pointer-events-none absolute right-5 top-5 z-20 rounded-full border border-[rgba(16,163,127,0.6)] bg-[rgba(16,163,127,0.92)] px-4 py-2 text-caption font-semibold uppercase tracking-[0.18em] text-white shadow-sm backdrop-blur-sm"
          style={{ opacity: likeOpacity, scale: likeScale }}
          aria-hidden="true"
        >
          Like
        </animated.div>
      </animated.div>
    </div>
  );
}
