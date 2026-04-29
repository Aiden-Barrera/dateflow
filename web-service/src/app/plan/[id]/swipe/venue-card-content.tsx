"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { CategoryIcon } from "../../../../components/category-icon";
import { PriceBadge } from "../../../../components/price-badge";
import type { Category } from "../../../../lib/types/preference";
import type { Venue } from "../../../../lib/types/venue";

// ─── Link helpers ──────────────────────────────────────────────────────────────

export function buildGoogleMapsUrl(venue: Venue): string {
  const query = encodeURIComponent(`${venue.name} ${venue.address}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function formatEventDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
// ─── Venue slide / tag helpers (re-exported via swipe-deck-card for tests) ───

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

export function getDisplayTags(tags: readonly string[]): readonly string[] {
  return tags.filter((tag) => !INTERNAL_TAGS.has(tag.toLowerCase()));
}

export function getVenueSlides(venue: Venue): readonly string[] {
  if (venue.photoUrls.length > 0) return venue.photoUrls;
  return venue.photoUrl ? [venue.photoUrl] : [];
}

export function getWrappedSlideIndex(index: number, totalSlides: number): number {
  if (totalSlides <= 0) return 0;
  return ((index % totalSlides) + totalSlides) % totalSlides;
}

// Backward-compatible export still used by swipe-deck-card re-exports/tests.
export const clampSlideIndex = getWrappedSlideIndex;

const PHOTO_THUMBNAIL_WIDTH_PX = 96;
const PHOTO_THUMBNAIL_GAP_PX = 12;

export function getThumbnailStripScrollLeft(
  index: number,
  clientWidth: number,
  totalSlides: number,
): number {
  if (totalSlides <= 1) {
    return 0;
  }

  const stride = PHOTO_THUMBNAIL_WIDTH_PX + PHOTO_THUMBNAIL_GAP_PX;
  const centeredLeft = index * stride - (clientWidth - PHOTO_THUMBNAIL_WIDTH_PX) / 2;
  const contentWidth =
    totalSlides * PHOTO_THUMBNAIL_WIDTH_PX +
    (totalSlides - 1) * PHOTO_THUMBNAIL_GAP_PX;
  const maxScrollLeft = Math.max(contentWidth - clientWidth, 0);

  return Math.min(Math.max(centeredLeft, 0), maxScrollLeft);
}

const CATEGORY_LABELS: Record<Category, string> = {
  RESTAURANT: "Restaurant",
  BAR: "Bar",
  ACTIVITY: "Activity",
  EVENT: "Event",
};

// ─── Exported pure helpers (tested) ──────────────────────────────────────────

export function formatRatingWithCount(
  rating: number,
  reviewCount: number | undefined,
): string {
  const ratingLabel = rating.toFixed(1);
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
  if (miles < 0.1) return "<0.1 mi away";
  return `${miles.toFixed(1)} mi away`;
}

export function getAgeRestrictionLabel(
  ageRestriction: "18+" | "21+" | null | undefined,
): string | null {
  if (ageRestriction == null) return null;
  return ageRestriction;
}

export function buildSwipeCardAriaLabel(
  name: string,
  category: Category,
  ageRestriction: "18+" | "21+" | null | undefined,
): string {
  const base = `${name}, ${CATEGORY_LABELS[category]}`;
  const restriction = getAgeRestrictionLabel(ageRestriction);
  return restriction ? `${base}, ${restriction} only` : base;
}

// ─── Preview card for cards 2 & 3 in the stack ───────────────────────────────

export function PreviewVenueCard({
  venue,
}: {
  readonly venue: Venue;
}) {
  const slides = getVenueSlides(venue);
  const ageLabel = getAgeRestrictionLabel(venue.ageRestriction);

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
            onContextMenu={(e) => e.preventDefault()}
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
          <div className="origin-top-right scale-[0.92] opacity-88">
            <PriceBadge priceLevel={venue.priceLevel} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#d9c7b5] bg-white px-2.5 py-1 text-caption text-[#6a4a3a]">
            <StarIcon />
            {venue.rating.toFixed(1)}
          </div>
          {getDisplayTags(venue.tags).slice(0, 2).map((tag, index) => (
            <div
              key={`${tag}-${index}`}
              className="rounded-full border border-[rgba(208,61,106,0.3)] bg-[rgba(208,61,106,0.08)] px-2.5 py-1 text-caption text-[#8a2346]"
            >
              {tag}
            </div>
          ))}
          {ageLabel ? (
            <span
              aria-label={`Age restriction: ${ageLabel}`}
              className="inline-flex items-center rounded-full border border-amber-400 bg-amber-50 px-2.5 py-1 text-caption font-semibold text-amber-700"
            >
              {ageLabel}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Main card content ────────────────────────────────────────────────────────
// Purely presentational — no drag state. Overlays (tint, badges) are rendered
// as animated.div siblings in SwipeCardCanvas using spring interpolation.

type VenueCardContentProps = {
  readonly venue: Venue;
  readonly cardIndex: number;
  readonly totalCards: number;
  readonly isAnimating: boolean;
  readonly submitting: boolean;
  readonly onSwipe: (liked: boolean) => void;
};

export function VenueCardContent({
  venue,
  cardIndex,
  totalCards,
  isAnimating,
  submitting,
  onSwipe,
}: VenueCardContentProps) {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [showHours, setShowHours] = useState(false);
  const thumbnailStripRef = useRef<HTMLDivElement | null>(null);
  const programmaticThumbnailScrollRef = useRef(false);
  const programmaticThumbnailTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slides = getVenueSlides(venue);
  const activeSlide = slides[activeSlideIndex] ?? slides[0] ?? null;
  const ageLabel = getAgeRestrictionLabel(venue.ageRestriction);
  const mapsUrl = buildGoogleMapsUrl(venue);
  const hasLinks = true; // maps always available
  const hasEventInfo = !!venue.scheduledAt || !!venue.eventUrl;
  const hasHours =
    venue.openingHours?.weekdayText && venue.openingHours.weekdayText.length > 0;

  function moveToSlide(nextIndex: number) {
    if (slides.length <= 1) return;
    programmaticThumbnailScrollRef.current = true;
    setActiveSlideIndex(getWrappedSlideIndex(nextIndex, slides.length));
  }

  useEffect(() => {
    if (
      !programmaticThumbnailScrollRef.current ||
      !thumbnailStripRef.current ||
      slides.length <= 1
    ) {
      return;
    }

    const strip = thumbnailStripRef.current;
    const nextScrollLeft = getThumbnailStripScrollLeft(
      activeSlideIndex,
      strip.clientWidth,
      slides.length,
    );

    strip.scrollTo({
      left: nextScrollLeft,
      behavior: "smooth",
    });

    if (programmaticThumbnailTimeoutRef.current !== null) {
      clearTimeout(programmaticThumbnailTimeoutRef.current);
    }

    programmaticThumbnailTimeoutRef.current = setTimeout(() => {
      programmaticThumbnailScrollRef.current = false;
      programmaticThumbnailTimeoutRef.current = null;
    }, 220);
  }, [activeSlideIndex, slides.length]);

  useEffect(() => {
    return () => {
      if (programmaticThumbnailTimeoutRef.current !== null) {
        clearTimeout(programmaticThumbnailTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative h-full overflow-hidden">
      {/* Photo area */}
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
            onContextMenu={(e) => e.preventDefault()}
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
            opacity: 0.35,
          }}
        />

        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-caption font-medium text-[#2a1a1c] shadow-sm">
          <CategoryIcon category={venue.category} />
          {CATEGORY_LABELS[venue.category]}
        </div>

        {slides.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Show previous venue photo"
              className="absolute left-6 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/20 text-white shadow-[0_10px_24px_rgba(15,23,42,0.24)] backdrop-blur-md transition-colors hover:bg-black/32"
              onClick={(e) => { e.stopPropagation(); moveToSlide(activeSlideIndex - 1); }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <ChevronIcon direction="left" />
            </button>
            <button
              type="button"
              aria-label="Show next venue photo"
              className="absolute right-6 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/20 text-white shadow-[0_10px_24px_rgba(15,23,42,0.24)] backdrop-blur-md transition-colors hover:bg-black/32"
              onClick={(e) => { e.stopPropagation(); moveToSlide(activeSlideIndex + 1); }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <ChevronIcon direction="right" />
            </button>
            <div className="absolute right-4 top-4 z-20 rounded-full border border-white/28 bg-black/20 px-3 py-1.5 text-caption font-medium text-white shadow-[0_10px_24px_rgba(15,23,42,0.22)] backdrop-blur-md">
              {activeSlideIndex + 1} / {slides.length}
            </div>
          </>
        ) : null}
      </div>

      {/* Info panel */}
      <div className="space-y-4 p-6" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
        <div className="rounded-[1.5rem] border border-[rgba(208,61,106,0.18)] bg-[rgba(208,61,106,0.05)] p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <div>
                <p className="text-caption font-semibold uppercase tracking-[0.16em] text-[#8a2346]">
                  Venue {cardIndex} of {totalCards}
                </p>
                <h2 className="mt-2 text-[clamp(1.4rem,4vw,2.5rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-[#2a1a1c]">
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
                        venue.openingHours.openNow ? "bg-[#10a37f]" : "bg-[#c2410c]"
                      }`}
                      aria-hidden="true"
                    />
                    {venue.openingHours.openNow ? "Open now" : "Closed"}
                  </InfoPill>
                ) : null}
                <InfoPill>{`Round ${venue.round}`}</InfoPill>
                {ageLabel ? (
                  <span
                    aria-label={`Age restriction: ${ageLabel}`}
                    className="inline-flex items-center rounded-full border border-amber-400 bg-amber-50 px-3 py-1.5 text-caption font-semibold text-amber-700"
                  >
                    {ageLabel}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="sm:hidden">
              <PriceBadge priceLevel={venue.priceLevel} />
            </div>
          </div>
        </div>

        {slides.length > 1 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-caption font-semibold uppercase tracking-[0.16em] text-[#6a4a3a]">
                Venue photos
              </p>
              <div className="flex items-center gap-1.5">
                {slides.map((slide, i) => (
                  <button
                    type="button"
                    key={`${slide}-${i}`}
                    aria-label={`Show photo ${i + 1} of ${slides.length}`}
                    className={`rounded-full transition-all duration-200 ${
                      i === activeSlideIndex ? "h-1.5 w-5 bg-primary" : "h-1.5 w-1.5 bg-muted"
                    }`}
                    onClick={() => moveToSlide(i)}
                  />
                ))}
              </div>
            </div>
            <div
              ref={thumbnailStripRef}
              className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {slides.map((slide, i) => (
                <button
                  type="button"
                  key={`${slide}-thumb-${i}`}
                  aria-label={`Show photo ${i + 1} of ${slides.length}`}
                  className={`relative h-20 min-w-24 overflow-hidden rounded-[1.1rem] border bg-[#f5ebe3] shadow-[0_10px_24px_rgba(45,42,38,0.08)] ${
                    i === activeSlideIndex
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-[#d9c7b5]"
                  }`}
                  onClick={() => moveToSlide(i)}
                >
                  <Image
                    src={slide}
                    alt={`${venue.name} photo ${i + 1}`}
                    fill
                    sizes="96px"
                    className="object-cover"
                    unoptimized
                    onContextMenu={(e) => e.preventDefault()}
                  />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {getDisplayTags(venue.tags).slice(0, 3).map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="rounded-full border border-[rgba(208,61,106,0.3)] bg-[rgba(208,61,106,0.08)] px-3 py-1.5 text-caption font-medium text-[#8a2346]"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Event date / Get Tickets */}
        {hasEventInfo ? (
          <div className="rounded-[1.25rem] border border-[rgba(208,100,61,0.25)] bg-[rgba(208,100,61,0.06)] p-4">
            {venue.scheduledAt ? (
              <div className="flex items-center gap-2">
                <CalendarIcon />
                <span className="text-body font-medium text-[#6a3020]">
                  {formatEventDateTime(venue.scheduledAt)}
                </span>
                {venue.durationMinutes ? (
                  <span className="ml-auto rounded-full border border-[rgba(208,100,61,0.3)] px-2.5 py-1 text-caption text-[#8a4020]">
                    {venue.durationMinutes >= 60
                      ? `${Math.floor(venue.durationMinutes / 60)}h${venue.durationMinutes % 60 ? ` ${venue.durationMinutes % 60}m` : ""}`
                      : `${venue.durationMinutes}m`}
                  </span>
                ) : null}
              </div>
            ) : null}
            {venue.eventUrl ? (
              <a
                href={venue.eventUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#c0392b] text-caption font-semibold text-white transition-colors hover:bg-[#a93226]"
              >
                <TicketIcon />
                Get Tickets
              </a>
            ) : null}
          </div>
        ) : null}

        {venue.whyPicked ? (
          <div className="rounded-[1.25rem] border border-[rgba(208,61,106,0.25)] bg-[rgba(208,61,106,0.08)] p-4">
            <p className="text-caption font-semibold uppercase tracking-[0.16em] text-[#8a2346]">
              Why we picked this
            </p>
            <p className="mt-2 text-body text-[#2a1a1c]">{venue.whyPicked}</p>
          </div>
        ) : null}

        {/* Links: website + Google Maps */}
        {hasLinks ? (
          <div className="flex gap-2">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-[#d9c7b5] bg-white py-2.5 text-caption font-medium text-[#6a4a3a] transition-colors hover:bg-[#f5ebe3]"
            >
              <MapPinIcon />
              Maps
            </a>
            {venue.website ? (
              <a
                href={venue.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-[#d9c7b5] bg-white py-2.5 text-caption font-medium text-[#6a4a3a] transition-colors hover:bg-[#f5ebe3]"
              >
                <GlobeIcon />
                Website
              </a>
            ) : null}
          </div>
        ) : null}

        {/* Opening hours expandable */}
        {hasHours ? (
          <div className="rounded-[1.25rem] border border-[#d9c7b5] bg-white">
            <button
              type="button"
              aria-expanded={showHours}
              aria-controls="venue-hours-panel"
              onClick={(e) => { e.stopPropagation(); setShowHours((v) => !v); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex w-full items-center justify-between px-4 py-3 text-caption font-medium text-[#6a4a3a]"
            >
              <span className="flex items-center gap-2">
                <ClockIcon />
                Hours
              </span>
              <ChevronIcon direction={showHours ? "up" : "down"} />
            </button>
            {showHours ? (
              <div id="venue-hours-panel" className="border-t border-[#ede0d4] px-4 pb-3 pt-2 space-y-1">
                {(venue.openingHours?.weekdayText ?? []).map((line, i) => (
                  <p key={i} className="text-caption text-[#6a4a3a]">{line}</p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onSwipe(false)}
            disabled={submitting || isAnimating}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-[#dc3545] bg-[#dc3545] text-body font-semibold text-white transition-all duration-200 hover:bg-[#c42a3c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PassIcon />
            Pass
          </button>
          <button
            type="button"
            onClick={() => onSwipe(true)}
            disabled={submitting || isAnimating}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-[#10a37f] bg-[#10a37f] text-body font-semibold text-white transition-all duration-200 hover:bg-[#0e8e6f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <HeartIcon />
            Like
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared icons ─────────────────────────────────────────────────────────────

function InfoPill({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(208,61,106,0.25)] bg-white px-3 py-1.5 text-caption font-medium text-[#8a2346]">
      {children}
    </div>
  );
}

export function StarIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.75 14.78 9l5.72.78-4.13 4 1 5.72L12 16.98 6.63 19.5l1-5.72-4.13-4L9.22 9 12 3.75Z" />
    </svg>
  );
}

function PassIcon() {
  return (
    <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9.25" />
      <path d="M8.5 8.5 15.5 15.5" />
      <path d="M15.5 8.5 8.5 15.5" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20.5c-.5 0-.98-.19-1.35-.53-2.5-2.3-4.6-4.2-6.07-6.08C3.14 12.04 2.5 10.4 2.5 8.75c0-2.9 2.24-5.25 5-5.25 1.77 0 3.38.92 4.25 2.33.87-1.41 2.48-2.33 4.25-2.33 2.76 0 5 2.35 5 5.25 0 1.65-.64 3.29-2.08 5.14-1.47 1.88-3.57 3.78-6.07 6.08-.37.34-.85.53-1.35.53Z" />
    </svg>
  );
}

function ChevronIcon({ direction }: { readonly direction: "left" | "right" | "up" | "down" }) {
  const paths = {
    left: "m15 18-6-6 6-6",
    right: "m9 18 6-6-6-6",
    up: "m18 15-6-6-6 6",
    down: "m6 9 6 6 6-6",
  };
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[direction]} />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <line x1="9" y1="9" x2="9" y2="15" strokeDasharray="2 2" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
