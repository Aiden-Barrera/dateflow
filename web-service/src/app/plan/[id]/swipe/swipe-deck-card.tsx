"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { CategoryIcon } from "../../../../components/category-icon";
import { PriceBadge } from "../../../../components/price-badge";
import type { Category } from "../../../../lib/types/preference";
import type { Venue } from "../../../../lib/types/venue";

const SWIPE_TRIGGER_PX = 124;
const SWIPE_VELOCITY_TRIGGER = 0.55;
const SWIPE_MIN_VELOCITY_OFFSET_PX = 64;
const MAX_ROTATION_DEG = 18;

const CATEGORY_LABELS: Record<Category, string> = {
  RESTAURANT: "Restaurant",
  BAR: "Bar",
  ACTIVITY: "Activity",
  EVENT: "Event",
};

type SwipeDeckCardProps = {
  readonly venue: Venue;
  readonly nextVenue: Venue | null;
  readonly cardIndex: number;
  readonly totalCards: number;
  readonly submitting: boolean;
  readonly onSwipe: (liked: boolean) => Promise<void>;
};

type DragState = {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly startRegionY: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly velocityX: number;
  readonly lastX: number;
  readonly lastTimestamp: number;
  readonly intent: "idle" | "dragging" | "scrolling";
};

type SwipeAnimation = {
  readonly direction: "left" | "right";
  readonly offsetX: number;
  readonly offsetY: number;
  readonly velocityX: number;
};

export function SwipeDeckCard({
  venue,
  nextVenue,
  cardIndex,
  totalCards,
  submitting,
  onSwipe,
}: SwipeDeckCardProps) {
  const cardRef = useRef<HTMLElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [animatingSwipe, setAnimatingSwipe] = useState<SwipeAnimation | null>(null);
  const [isSettled, setIsSettled] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  useEffect(() => {
    let secondFrame: number | null = null;

    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        setIsSettled(true);
      });
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame !== null) {
        cancelAnimationFrame(secondFrame);
      }
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      setPrefersReducedMotion(media.matches);
    };

    updatePreference();
    media.addEventListener("change", updatePreference);

    return () => media.removeEventListener("change", updatePreference);
  }, []);

  const currentSlides = getVenueSlides(venue);
  const nextSlides = nextVenue ? getVenueSlides(nextVenue) : [];
  const activeSlide = currentSlides[activeSlideIndex] ?? currentSlides[0] ?? null;
  const dragOffsetX = dragState?.offsetX ?? 0;
  const dragOffsetY = dragState?.offsetY ?? 0;
  const dragRatio = clamp(dragOffsetX / SWIPE_TRIGGER_PX, -1.3, 1.3);
  const dragStrength = Math.min(Math.abs(dragRatio), 1);
  const isDragging = dragState?.intent === "dragging";
  const neutralReturnStrength = isDragging || animatingSwipe ? 0 : 1;

  const cardTransform = getCardTransform(
    dragOffsetX,
    dragOffsetY,
    dragState?.startRegionY ?? 0.5,
    animatingSwipe,
    isSettled,
    prefersReducedMotion,
  );
  const deckTransform = getNextCardTransform(
    dragRatio,
    dragOffsetY,
    animatingSwipe,
    isSettled,
    prefersReducedMotion,
  );

  async function triggerSwipe(liked: boolean) {
    if (submitting || animatingSwipe) {
      return;
    }

    const snapshot = dragState;

    setAnimatingSwipe({
      direction: liked ? "right" : "left",
      offsetX: snapshot?.offsetX ?? 0,
      offsetY: snapshot?.offsetY ?? 0,
      velocityX: snapshot?.velocityX ?? 0,
    });
    setDragState(null);

    if (!prefersReducedMotion) {
      window.navigator?.vibrate?.(12);
    }

    try {
      await onSwipe(liked);
    } catch {
      setAnimatingSwipe(null);
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLElement>) {
    if (submitting || animatingSwipe) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeY = event.clientY - bounds.top;

    setDragState({
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRegionY: clamp(relativeY / bounds.height, 0, 1),
      offsetX: 0,
      offsetY: 0,
      velocityX: 0,
      lastX: event.clientX,
      lastTimestamp: event.timeStamp,
      intent: "idle",
    });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    const pointerId = event.pointerId;
    const clientX = event.clientX;
    const clientY = event.clientY;

    setDragState((current) => {
      if (!current || current.pointerId !== pointerId) {
        return current;
      }

      const offsetX = clientX - current.startX;
      const offsetY = clientY - current.startY;
      const absX = Math.abs(offsetX);
      const absY = Math.abs(offsetY);
      const elapsed = Math.max(event.timeStamp - current.lastTimestamp, 1);
      const velocityX = (clientX - current.lastX) / elapsed;

      if (current.intent === "idle") {
        if (absY > 14 && absY > absX) {
          return {
            ...current,
            intent: "scrolling",
            lastX: clientX,
            lastTimestamp: event.timeStamp,
          };
        }

        if (absX > 14 && absX >= absY) {
          cardRef.current?.setPointerCapture(pointerId);

          return {
            ...current,
            intent: "dragging",
            offsetX,
            offsetY,
            velocityX,
            lastX: clientX,
            lastTimestamp: event.timeStamp,
          };
        }
      }

      if (current.intent === "dragging") {
        return {
          ...current,
          offsetX,
          offsetY,
          velocityX,
          lastX: clientX,
          lastTimestamp: event.timeStamp,
        };
      }

      return current;
    });
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (cardRef.current?.hasPointerCapture(event.pointerId)) {
      cardRef.current.releasePointerCapture(event.pointerId);
    }

    const shouldSwipe =
      dragState.intent === "dragging" &&
      (Math.abs(dragState.offsetX) >= SWIPE_TRIGGER_PX ||
        (Math.abs(dragState.velocityX) >= SWIPE_VELOCITY_TRIGGER &&
          Math.abs(dragState.offsetX) >= SWIPE_MIN_VELOCITY_OFFSET_PX));
    const liked = dragState.offsetX > 0;

    setDragState(null);

    if (shouldSwipe) {
      void triggerSwipe(liked);
    }
  }

  function moveToSlide(nextIndex: number) {
    if (currentSlides.length <= 1) {
      return;
    }

    setActiveSlideIndex(clampSlideIndex(nextIndex, currentSlides.length));
  }

  return (
    <div className="relative min-h-[640px]">
      <div
        className="pointer-events-none absolute inset-x-5 top-6 bottom-1 rounded-[2.4rem] border border-white/30 bg-white/30 blur-[1px]"
        style={{
          opacity: 0.28 + dragStrength * 0.18,
          transform: `translateY(${26 - dragStrength * 14}px) scale(${0.936 + dragStrength * 0.024})`,
          boxShadow: "0 20px 56px rgba(45,42,38,0.08)",
          transition: isDragging
            ? "transform 70ms linear, opacity 70ms linear"
            : getShadowDeckTransition(prefersReducedMotion),
        }}
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute inset-x-4 top-4 bottom-4 rounded-[2.2rem] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.72),_rgba(255,255,255,0))] blur-2xl"
        style={{
          opacity: 0.4 + dragStrength * 0.25,
          transform: `translateY(${10 - dragStrength * 10}px) scale(${0.98 + dragStrength * 0.04})`,
        }}
        aria-hidden="true"
      />

      {nextVenue ? (
        <div
          className="absolute inset-x-2 top-2 bottom-2 overflow-hidden rounded-[2rem] border border-white/55 bg-white/72 shadow-[0_14px_36px_rgba(45,42,38,0.08)]"
          style={{
            transform: deckTransform,
            opacity: getNextCardOpacity(dragStrength, animatingSwipe, isSettled),
            transition: isDragging
              ? "transform 70ms linear, opacity 70ms linear"
              : getDeckTransition(prefersReducedMotion),
          }}
          aria-hidden="true"
        >
          <PreviewVenueCard venue={nextVenue} slides={nextSlides} />
        </div>
      ) : null}

      <article
        ref={cardRef}
        className={`relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/95 shadow-[0_30px_80px_rgba(74,18,36,0.45)] backdrop-blur-sm ${
          submitting ? "pointer-events-none" : "cursor-grab active:cursor-grabbing"
        }`}
        style={{
          transform: cardTransform,
          touchAction: "pan-y",
          opacity: getCardOpacity(Boolean(animatingSwipe), isSettled),
          filter: getCardFilter(Boolean(animatingSwipe), isSettled),
          boxShadow: isDragging || animatingSwipe
            ? "0 32px 110px rgba(45,42,38,0.26)"
            : "0 24px 80px rgba(45,42,38,0.16)",
          transition:
            animatingSwipe || !isDragging
              ? getCardTransition(prefersReducedMotion)
              : "transform 70ms linear, box-shadow 90ms linear, opacity 180ms ease, filter 180ms ease",
        }}
        tabIndex={0}
        aria-label="Venue swipe card. Use left arrow to pass and right arrow to like."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onKeyDown={(event) => {
          if (submitting || animatingSwipe) {
            return;
          }

          if (event.key === "ArrowLeft") {
            event.preventDefault();
            void triggerSwipe(false);
          }

          if (event.key === "ArrowRight") {
            event.preventDefault();
            void triggerSwipe(true);
          }
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            opacity: Math.max(dragStrength * 0.9, animatingSwipe ? 0.45 : 0),
            background:
              dragRatio >= 0
                ? `linear-gradient(135deg, rgba(16,163,127,${0.14 + dragStrength * 0.26}), rgba(16,163,127,0) 60%)`
                : `linear-gradient(225deg, rgba(220,53,69,${0.14 + dragStrength * 0.26}), rgba(220,53,69,0) 60%)`,
            transition: isDragging ? "opacity 70ms linear" : "opacity 180ms ease",
          }}
        />

        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28"
          style={{
            opacity: 0.42 + dragStrength * 0.26,
            background: "linear-gradient(180deg, rgba(255,255,255,0.32), rgba(255,255,255,0))",
            transform: `translateY(${dragOffsetY * 0.08}px)`,
          }}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-5 pt-5">
          <SwipeIntentBadge
            label="Pass"
            tone="pass"
            progress={dragRatio < 0 ? dragStrength : 0}
            visible={dragRatio < -0.12 || animatingSwipe?.direction === "left"}
          />
          <SwipeIntentBadge
            label="Like"
            tone="like"
            progress={dragRatio > 0 ? dragStrength : 0}
            visible={dragRatio > 0.12 || animatingSwipe?.direction === "right"}
          />
        </div>

        <div className="relative aspect-[4/3] overflow-hidden bg-[linear-gradient(135deg,var(--color-secondary-muted),var(--color-primary-muted))]">
          {activeSlide ? (
            <Image
              src={activeSlide}
              alt={venue.name}
              fill
              sizes="(max-width: 768px) 100vw, 480px"
              loading="eager"
              className="object-cover"
              unoptimized
              style={{
                transform: `scale(${1.02 + dragStrength * 0.03}) translateX(${dragOffsetX * 0.025}px) translateY(${dragOffsetY * 0.015}px)`,
                transition: isDragging ? "none" : "transform 260ms ease",
              }}
            />
          ) : (
            <div className="relative flex h-full items-end overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.92),_transparent_42%),linear-gradient(135deg,var(--color-secondary),var(--color-primary))] p-6">
              <div className="absolute -right-10 top-8 h-28 w-28 rounded-[2rem] border border-white/18 bg-white/10 backdrop-blur-sm" />
              <div className="absolute left-6 top-8 h-18 w-16 rounded-[1.2rem] border border-white/18 bg-white/10 backdrop-blur-sm" />
              <div className="relative max-w-[14rem] rounded-[1.35rem] border border-white/18 bg-white/14 px-4 py-3 text-white backdrop-blur">
                <p className="text-caption font-semibold uppercase tracking-[0.18em] text-white/74">
                  Photo unavailable
                </p>
                <p className="mt-2 text-body text-white/88">
                  The venue details are real. A live photo can slot in when one is available.
                </p>
              </div>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-18 bg-[linear-gradient(180deg,transparent,rgba(28,25,23,0.26))]" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(115deg, rgba(255,255,255,0) 18%, rgba(255,255,255,0.22) 44%, rgba(255,255,255,0) 58%)",
              opacity: 0.35 + dragStrength * 0.3,
              transform: `translateX(${dragOffsetX * 0.12}px)`,
            }}
          />

          <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-caption font-medium text-[#2a1a1c] shadow-sm">
            <CategoryIcon category={venue.category} />
            {CATEGORY_LABELS[venue.category]}
          </div>

          {currentSlides.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Show previous venue photo"
                className="absolute left-6 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/20 text-white shadow-[0_10px_24px_rgba(15,23,42,0.24)] backdrop-blur-md transition-colors hover:bg-black/32"
                onClick={(event) => {
                  event.stopPropagation();
                  moveToSlide(activeSlideIndex - 1);
                }}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <ChevronIcon direction="left" />
              </button>
              <button
                type="button"
                aria-label="Show next venue photo"
                className="absolute right-6 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/20 text-white shadow-[0_10px_24px_rgba(15,23,42,0.24)] backdrop-blur-md transition-colors hover:bg-black/32"
                onClick={(event) => {
                  event.stopPropagation();
                  moveToSlide(activeSlideIndex + 1);
                }}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <ChevronIcon direction="right" />
              </button>
            </>
          ) : null}

          {currentSlides.length > 1 ? (
            <div className="absolute right-4 top-4 z-20 rounded-full border border-white/28 bg-black/20 px-3 py-1.5 text-caption font-medium text-white shadow-[0_10px_24px_rgba(15,23,42,0.22)] backdrop-blur-md">
              {activeSlideIndex + 1} / {currentSlides.length}
            </div>
          ) : null}
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-[1.5rem] border border-[rgba(208,61,106,0.18)] bg-[rgba(208,61,106,0.05)] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-3">
                <div>
                  <p className="text-caption font-semibold uppercase tracking-[0.16em] text-[#8a2346]">
                    Venue {cardIndex} of {totalCards}
                  </p>
                  <h2 className="mt-2 text-[clamp(1.9rem,4vw,2.5rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-[#2a1a1c]">
                    {venue.name}
                  </h2>
                  <p className="mt-2 text-body text-[#6a4a3a]">{venue.address}</p>
                  {venue.editorialSummary ? (
                    <p className="mt-2 line-clamp-2 text-body italic text-[#8a6a5a]">
                      {venue.editorialSummary}
                    </p>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <InfoPill>
                    <StarIcon />
                    {formatRatingWithCount(venue.rating, venue.userRatingCount)}
                  </InfoPill>
                  <InfoPill>
                    <CategoryIcon category={venue.category} />
                    {CATEGORY_LABELS[venue.category]}
                  </InfoPill>
                  {typeof venue.distanceMeters === "number" ? (
                    <InfoPill>{formatDistance(venue.distanceMeters)}</InfoPill>
                  ) : null}
                  {venue.openingHours ? (
                    <InfoPill>
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          venue.openingHours.openNow
                            ? "bg-[#10a37f]"
                            : "bg-[#c2410c]"
                        }`}
                        aria-hidden="true"
                      />
                      {venue.openingHours.openNow ? "Open now" : "Closed"}
                    </InfoPill>
                  ) : null}
                  <InfoPill>{`Round ${venue.round}`}</InfoPill>
                </div>
              </div>
              <div className="sm:hidden">
                <PriceBadge priceLevel={venue.priceLevel} />
              </div>
            </div>
          </div>

          {currentSlides.length > 1 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-caption font-semibold uppercase tracking-[0.16em] text-[#6a4a3a]">
                  Venue photos
                </p>
                <div className="flex items-center gap-1.5">
                  {currentSlides.map((slide, slideIndex) => (
                    <button
                      type="button"
                      key={`${slide}-${slideIndex}`}
                      aria-label={`Show photo ${slideIndex + 1} of ${currentSlides.length}`}
                      className={`rounded-full transition-all duration-200 ${
                        slideIndex === activeSlideIndex
                          ? "h-1.5 w-5 bg-primary"
                          : "h-1.5 w-1.5 bg-muted"
                      }`}
                      onClick={() => moveToSlide(slideIndex)}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {currentSlides.map((slide, slideIndex) => (
                  <button
                    type="button"
                    key={`${slide}-thumb-${slideIndex}`}
                    aria-label={`Show photo ${slideIndex + 1} of ${currentSlides.length}`}
                    className={`relative h-20 min-w-24 overflow-hidden rounded-[1.1rem] border bg-[#f5ebe3] shadow-[0_10px_24px_rgba(45,42,38,0.08)] ${
                      slideIndex === activeSlideIndex
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-[#d9c7b5]"
                    }`}
                    onClick={() => moveToSlide(slideIndex)}
                  >
                    <Image
                      src={slide}
                      alt={`${venue.name} photo ${slideIndex + 1}`}
                      fill
                      sizes="96px"
                      className="object-cover"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {getDisplayTags(venue.tags).slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[rgba(208,61,106,0.3)] bg-[rgba(208,61,106,0.08)] px-3 py-1.5 text-caption font-medium text-[#8a2346]"
              >
                {tag}
              </span>
            ))}
          </div>

          {venue.whyPicked ? (
            <div className="rounded-[1.25rem] border border-[rgba(208,61,106,0.25)] bg-[rgba(208,61,106,0.08)] p-4">
              <p className="text-caption font-semibold uppercase tracking-[0.16em] text-[#8a2346]">
                Why we picked this
              </p>
              <p className="mt-2 text-body text-[#2a1a1c]">{venue.whyPicked}</p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                void triggerSwipe(false);
              }}
              disabled={submitting || Boolean(animatingSwipe)}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-[#dc3545] bg-[#dc3545] text-body font-semibold text-white transition-all duration-200 hover:bg-[#c42a3c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/80 disabled:cursor-not-allowed disabled:opacity-60"
              style={getActionButtonStyle("left", dragRatio, neutralReturnStrength)}
            >
              <PassIcon />
              Pass
            </button>
            <button
              type="button"
              onClick={() => {
                void triggerSwipe(true);
              }}
              disabled={submitting || Boolean(animatingSwipe)}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-[#10a37f] bg-[#10a37f] text-body font-semibold text-white transition-all duration-200 hover:bg-[#0e8e6f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/80 disabled:cursor-not-allowed disabled:opacity-60"
              style={getActionButtonStyle("right", dragRatio, neutralReturnStrength)}
            >
              <HeartIcon />
              Like
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}

function SwipeIntentBadge({
  label,
  tone,
  progress,
  visible,
}: {
  readonly label: string;
  readonly tone: "pass" | "like";
  readonly progress: number;
  readonly visible: boolean;
}) {
  return (
    <div
      className={`rounded-full border px-4 py-2 text-caption font-semibold uppercase tracking-[0.18em] shadow-sm backdrop-blur-sm transition-all duration-150 ${
        tone === "like"
          ? "border-[rgba(16,163,127,0.6)] bg-[rgba(16,163,127,0.92)] text-white"
          : "border-[rgba(220,53,69,0.6)] bg-[rgba(220,53,69,0.92)] text-white"
      }`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible
          ? `scale(${0.94 + progress * 0.06}) translateY(${-progress * 2}px)`
          : "scale(0.92)",
      }}
      aria-hidden={!visible}
    >
      {label}
    </div>
  );
}

function PreviewVenueCard({
  venue,
  slides,
}: {
  readonly venue: Venue;
  readonly slides: readonly string[];
}) {
  return (
    <div className="flex h-full flex-col bg-white/72">
      <div className="relative aspect-[4/3] overflow-hidden bg-[linear-gradient(135deg,var(--color-secondary-muted),rgba(255,255,255,0.95))]">
        {slides.length > 0 ? (
          <Image
            src={slides[0]}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 480px"
            className="object-cover opacity-82"
            unoptimized
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.85),_transparent_42%),linear-gradient(135deg,var(--color-secondary-muted),rgba(255,255,255,0.96))]" />
            <div className="absolute -right-10 top-5 h-24 w-24 rounded-[1.7rem] border border-white/20 bg-white/20 backdrop-blur-sm" />
            <div className="absolute left-5 top-6 h-16 w-14 rounded-[1rem] border border-white/18 bg-white/18 backdrop-blur-sm" />
          </>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.94))]" />
        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/88 px-3 py-2 text-caption text-[#6a4a3a] shadow-sm">
          <CategoryIcon category={venue.category} />
          {CATEGORY_LABELS[venue.category]}
        </div>
      </div>

      <div className="space-y-4 px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-body font-semibold text-[#2a1a1c]">{venue.name}</p>
            <p className="mt-1 text-caption text-[#6a4a3a]">{venue.address}</p>
          </div>
          <div className="scale-[0.92] origin-top-right opacity-88">
            <PriceBadge priceLevel={venue.priceLevel} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#d9c7b5] bg-white px-2.5 py-1 text-caption text-[#6a4a3a]">
            <StarIcon />
            {venue.rating.toFixed(1)}
          </div>
          {getDisplayTags(venue.tags).slice(0, 2).map((tag) => (
            <div
              key={tag}
              className="rounded-full border border-[rgba(208,61,106,0.3)] bg-[rgba(208,61,106,0.08)] px-2.5 py-1 text-caption text-[#8a2346]"
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Internal markers emitted by the scoring pipeline that should never reach the
// user-facing venue card.
const INTERNAL_TAGS = new Set<string>([
  "unscored",
  "ai-curated",
  "top-rated",
  "well-reviewed",
  "restaurant",
  "bar",
  "activity",
  "event",
]);

function getDisplayTags(tags: readonly string[]): readonly string[] {
  return tags.filter((tag) => !INTERNAL_TAGS.has(tag.toLowerCase()));
}

function InfoPill({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(208,61,106,0.25)] bg-white px-3 py-1.5 text-caption font-medium text-[#8a2346]">
      {children}
    </div>
  );
}

function StarIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.75 14.78 9l5.72.78-4.13 4 1 5.72L12 16.98 6.63 19.5l1-5.72-4.13-4L9.22 9 12 3.75Z" />
    </svg>
  );
}

function PassIcon() {
  return (
    <svg
      className="h-[22px] w-[22px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.25" />
      <path d="M8.5 8.5 15.5 15.5" />
      <path d="M15.5 8.5 8.5 15.5" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      className="h-[22px] w-[22px]"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20.5c-.5 0-.98-.19-1.35-.53-2.5-2.3-4.6-4.2-6.07-6.08C3.14 12.04 2.5 10.4 2.5 8.75c0-2.9 2.24-5.25 5-5.25 1.77 0 3.38.92 4.25 2.33.87-1.41 2.48-2.33 4.25-2.33 2.76 0 5 2.35 5 5.25 0 1.65-.64 3.29-2.08 5.14-1.47 1.88-3.57 3.78-6.07 6.08-.37.34-.85.53-1.35.53Z" />
    </svg>
  );
}

function ChevronIcon({ direction }: { readonly direction: "left" | "right" }) {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === "left" ? (
        <path d="m15 18-6-6 6-6" />
      ) : (
        <path d="m9 18 6-6-6-6" />
      )}
    </svg>
  );
}

export function getVenueSlides(venue: Venue): readonly string[] {
  if (venue.photoUrls.length > 0) {
    return venue.photoUrls;
  }

  return venue.photoUrl ? [venue.photoUrl] : [];
}

export function clampSlideIndex(index: number, totalSlides: number): number {
  if (totalSlides <= 0) {
    return 0;
  }

  if (index < 0) {
    return totalSlides - 1;
  }

  if (index >= totalSlides) {
    return 0;
  }

  return index;
}

function getCardTransform(
  offsetX: number,
  offsetY: number,
  startRegionY: number,
  animatingSwipe: SwipeAnimation | null,
  isSettled: boolean,
  prefersReducedMotion: boolean,
): string {
  if (animatingSwipe?.direction === "left") {
    const releaseY = clamp(animatingSwipe.offsetY * 0.6, -80, 80);
    const releaseRotation = prefersReducedMotion
      ? -4
      : clamp(
          animatingSwipe.offsetX / 14 - 6 - animatingSwipe.velocityX * 8,
          -24,
          -8,
        );

    return `translate3d(-148%, ${releaseY}px, 0) rotate(${releaseRotation}deg) scale(0.98)`;
  }

  if (animatingSwipe?.direction === "right") {
    const releaseY = clamp(animatingSwipe.offsetY * 0.6, -80, 80);
    const releaseRotation = prefersReducedMotion
      ? 4
      : clamp(
          animatingSwipe.offsetX / 14 + 6 + animatingSwipe.velocityX * 8,
          8,
          24,
        );

    return `translate3d(148%, ${releaseY}px, 0) rotate(${releaseRotation}deg) scale(0.98)`;
  }

  if (!isSettled) {
    return "translate3d(0, 28px, 0) scale(0.965)";
  }

  const pivot = (startRegionY - 0.5) * -2;
  const rotation = prefersReducedMotion
    ? clamp(offsetX / 48, -4, 4)
    : clamp(offsetX / 16 + pivot * 4, -MAX_ROTATION_DEG, MAX_ROTATION_DEG);
  const lift = Math.min(Math.abs(offsetX) * 0.02, 12);
  const swayY = clamp(offsetY * 0.16, -26, 26);

  return `translate3d(${offsetX}px, ${swayY + lift}px, 0) rotate(${rotation}deg)`;
}

function getNextCardTransform(
  dragRatio: number,
  offsetY: number,
  animatingSwipe: SwipeAnimation | null,
  isSettled: boolean,
  prefersReducedMotion: boolean,
): string {
  if (!isSettled) {
    return "translateY(22px) scale(0.97)";
  }

  const progress = Math.min(Math.abs(dragRatio), 1);
  const releaseBoost = animatingSwipe ? 18 : 0;
  const swayY = prefersReducedMotion ? 0 : clamp(offsetY * 0.08, -8, 8);
  const translateY = 20 - progress * 10 - releaseBoost + swayY;
  const scale = 0.968 + progress * 0.026 + (animatingSwipe ? 0.018 : 0);

  return `translateY(${translateY}px) scale(${scale})`;
}

function getCardOpacity(animatingSwipe: boolean, isSettled: boolean): number {
  if (!isSettled) {
    return 0.78;
  }

  if (animatingSwipe) {
    return 0.42;
  }

  return 1;
}

function getCardFilter(animatingSwipe: boolean, isSettled: boolean): string {
  if (!isSettled) {
    return "blur(6px)";
  }

  if (animatingSwipe) {
    return "blur(1.5px)";
  }

  return "blur(0px)";
}

function getNextCardOpacity(
  dragStrength: number,
  animatingSwipe: SwipeAnimation | null,
  isSettled: boolean,
): number {
  if (!isSettled) {
    return 0.54;
  }

  if (animatingSwipe) {
    return 0.96;
  }

  return 0.78 + dragStrength * 0.18;
}

function getCardTransition(prefersReducedMotion: boolean): string {
  if (prefersReducedMotion) {
    return "transform 180ms ease, box-shadow 180ms ease, opacity 160ms ease, filter 160ms ease";
  }

  return "transform 320ms cubic-bezier(0.18, 0.86, 0.24, 1), box-shadow 260ms ease, opacity 240ms ease, filter 240ms ease";
}

function getDeckTransition(prefersReducedMotion: boolean): string {
  if (prefersReducedMotion) {
    return "transform 180ms ease, opacity 160ms ease";
  }

  return "transform 320ms cubic-bezier(0.18, 0.86, 0.24, 1), opacity 220ms ease";
}

function getShadowDeckTransition(prefersReducedMotion: boolean): string {
  if (prefersReducedMotion) {
    return "transform 180ms ease, opacity 160ms ease";
  }

  return "transform 360ms cubic-bezier(0.16, 0.84, 0.24, 1), opacity 220ms ease";
}

function getActionButtonStyle(
  direction: "left" | "right",
  dragRatio: number,
  neutralReturnStrength: number,
): CSSProperties {
  const signedStrength =
    direction === "right" ? Math.max(dragRatio, 0) : Math.max(-dragRatio, 0);
  const emphasis = Math.min(signedStrength, 1);
  const restingScale = 1 + neutralReturnStrength * 0.012;
  const activeScale = 1 + emphasis * 0.045;
  const translateY = emphasis > 0 ? -Math.round(emphasis * 4) : 0;
  const shadowAlpha = direction === "right" ? 0.18 + emphasis * 0.2 : 0.08 + emphasis * 0.12;

  return {
    transform: `translateY(${translateY}px) scale(${emphasis > 0 ? activeScale : restingScale})`,
    boxShadow:
      direction === "right"
        ? `0 16px 34px rgba(16,163,127,${shadowAlpha})`
        : `0 14px 30px rgba(220,53,69,${shadowAlpha})`,
    transition:
      "transform 180ms cubic-bezier(0.18, 0.86, 0.24, 1), box-shadow 180ms ease, background-color 180ms ease",
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function formatRatingWithCount(
  rating: number,
  reviewCount: number | undefined,
): string {
  const ratingLabel = `${rating.toFixed(1)}`;
  if (typeof reviewCount !== "number" || reviewCount <= 0) {
    return `${ratingLabel} rating`;
  }
  const reviewLabel = reviewCount === 1 ? "review" : "reviews";
  return `${ratingLabel} · ${formatReviewCount(reviewCount)} ${reviewLabel}`;
}

function formatReviewCount(count: number): string {
  if (count >= 1_000) {
    const thousands = count / 1_000;
    const rounded =
      thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10;
    return `${rounded}k`;
  }
  return String(count);
}

export function formatDistance(meters: number): string {
  const miles = meters / 1609.344;
  if (miles < 0.1) {
    return "<0.1 mi away";
  }
  return `${miles.toFixed(1)} mi away`;
}
