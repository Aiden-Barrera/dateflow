"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { CategoryIcon } from "../../../../components/category-icon";
import type { Category } from "../../../../lib/types/preference";
import type { Venue } from "../../../../lib/types/venue";

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

type VenueTagGroup = {
  readonly id: string;
  readonly tags: readonly string[];
};

type VenueUtilityChip = {
  readonly id: string;
  readonly label: string;
  readonly href?: string;
  readonly detail?: string;
  readonly tone?: "neutral" | "success";
};

type VenuePhotoTag = {
  readonly id: string;
  readonly label: string;
  readonly href?: string;
  readonly icon?: "category" | "map" | "website" | "status";
  readonly detail?: string;
};

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

function titleCaseTag(tag: string): string {
  return tag
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildCategoryTag(category: Category): string {
  switch (category) {
    case "RESTAURANT":
      return "Dinner-worthy";
    case "BAR":
      return "Cocktail pick";
    case "ACTIVITY":
      return "Easy icebreaker";
    case "EVENT":
      return "Planned night out";
  }
}

function formatAddressTag(address: string): string | null {
  const trimmed = address.trim();
  if (!trimmed) return null;
  const primary = trimmed.split("·")[0]?.split(",")[0]?.trim();
  return primary ? `Near ${primary}` : null;
}

function formatHoursTag(venue: Venue): string | null {
  if (!venue.openingHours) return null;
  return venue.openingHours.openNow ? "Open now" : "Closed for now";
}

function formatHoursDetail(venue: Venue): string | null {
  const lines = venue.openingHours?.weekdayText ?? [];
  if (lines.length === 0) return null;
  const firstLine = lines[0]?.split(":")?.slice(1)?.join(":")?.trim();
  return firstLine && firstLine.length > 0 ? firstLine : null;
}

function formatScheduleTag(venue: Venue): string | null {
  if (!venue.scheduledAt) return null;
  return formatEventDateTime(venue.scheduledAt);
}

function buildVenueTagGroups(venue: Venue): readonly VenueTagGroup[] {
  const displayTags = getDisplayTags(venue.tags).map(titleCaseTag);
  const categoryFlavor = displayTags[0] ?? buildCategoryTag(venue.category);
  const tasteSignal =
    displayTags[1] ??
    (venue.whyPicked ? titleCaseTag(venue.whyPicked.split(/[.!?]/)[0] ?? "") : null) ??
    "Legendary spot";

  const groups: VenueTagGroup[] = [
    {
      id: "intro",
      tags: [
        CATEGORY_LABELS[venue.category],
        typeof venue.distanceMeters === "number"
          ? formatDistance(venue.distanceMeters)
          : categoryFlavor,
      ].filter(Boolean),
    },
    {
      id: "social-proof",
      tags: [
        formatRatingWithCount(venue.rating, venue.userRatingCount),
        formatHoursTag(venue) ?? categoryFlavor,
      ].filter(Boolean),
    },
    {
      id: "location",
      tags: [formatAddressTag(venue.address), venue.website ? "Website ready" : "Open in maps"]
        .filter(Boolean) as string[],
    },
    {
      id: "taste",
      tags: [
        tasteSignal,
        venue.editorialSummary ? titleCaseTag(venue.editorialSummary) : null,
      ]
        .filter((tag): tag is string => Boolean(tag && tag.length <= 48))
        .slice(0, 2),
    },
  ];

  if (venue.sourceType === "ticketmaster") {
    groups[1] = {
      id: "event-proof",
      tags: [formatScheduleTag(venue), venue.durationMinutes ? `${venue.durationMinutes} min` : null]
        .filter(Boolean) as string[],
    };
  }

  return groups.filter((group) => group.tags.length > 0);
}

function getSlideTagGroup(
  venue: Venue,
  slideIndex: number,
): VenueTagGroup | null {
  const groups = buildVenueTagGroups(venue);
  if (groups.length === 0) return null;
  return groups[Math.min(slideIndex, groups.length - 1)] ?? groups[0] ?? null;
}

function getDeckLabel(cardIndex: number, totalCards: number): string {
  return `${cardIndex} of ${totalCards}`;
}

function getUtilityChips(
  venue: Venue,
  mapsUrl: string,
): readonly VenueUtilityChip[] {
  const chips: VenueUtilityChip[] = [
    { id: "maps", label: "Maps", href: mapsUrl },
  ];

  if (venue.website) {
    chips.push({ id: "website", label: "Website", href: venue.website });
  }

  const hoursLabel = formatHoursTag(venue);
  if (hoursLabel) {
    chips.push({
      id: "hours",
      label: hoursLabel,
      detail: formatHoursDetail(venue) ?? undefined,
      tone: venue.openingHours?.openNow ? "success" : "neutral",
    });
  } else if (typeof venue.distanceMeters === "number") {
    chips.push({ id: "distance", label: formatDistance(venue.distanceMeters) });
  } else {
    chips.push({ id: "rating", label: formatRatingWithCount(venue.rating, venue.userRatingCount) });
  }

  return chips.slice(0, 3);
}

function buildPhotoTagSets(
  venue: Venue,
  mapsUrl: string,
): readonly (readonly VenuePhotoTag[])[] {
  const displayTags = getDisplayTags(venue.tags).map(titleCaseTag);
  const tagSets: VenuePhotoTag[][] = [];

  tagSets.push(
    [
      {
        id: "category",
        label: CATEGORY_LABELS[venue.category],
        icon: "category",
      },
      typeof venue.distanceMeters === "number"
        ? {
            id: "distance",
            label: formatDistance(venue.distanceMeters),
          }
        : displayTags[0]
          ? {
              id: "taste-intro",
              label: displayTags[0],
            }
          : null,
    ].filter((tag): tag is VenuePhotoTag => Boolean(tag)),
  );

  const socialProofTags: VenuePhotoTag[] = [
    {
      id: "rating",
      label: formatRatingWithCount(venue.rating, venue.userRatingCount),
    },
  ];
  if (formatHoursTag(venue)) {
    socialProofTags.push({
      id: "hours",
      label: formatHoursTag(venue)!,
      detail: formatHoursDetail(venue) ?? undefined,
      icon: "status",
    });
  }
  tagSets.push(socialProofTags);

  const locationTags: VenuePhotoTag[] = [
    {
      id: "maps",
      label: "Maps",
      href: mapsUrl,
      icon: "map",
    },
  ];
  if (formatAddressTag(venue.address)) {
    locationTags.push({
      id: "address",
      label: formatAddressTag(venue.address)!,
    });
  }
  tagSets.push(locationTags);

  if (venue.website) {
    const websiteTags: VenuePhotoTag[] = [
      {
        id: "website",
        label: "Website",
        href: venue.website,
        icon: "website",
      },
    ];
    if (displayTags[1]) {
      websiteTags.push({
        id: "taste-site",
        label: displayTags[1],
      });
    } else if (venue.editorialSummary) {
      websiteTags.push({
        id: "summary",
        label: titleCaseTag(venue.editorialSummary),
      });
    }
    tagSets.push(websiteTags);
  }

  if (displayTags.length > 0 || venue.whyPicked) {
    const tasteTags: VenuePhotoTag[] = [];
    if (displayTags[0]) {
      tasteTags.push({
        id: "taste-1",
        label: displayTags[0],
      });
    }
    if (displayTags[1]) {
      tasteTags.push({
        id: "taste-2",
        label: displayTags[1],
      });
    } else if (venue.whyPicked) {
      tasteTags.push({
        id: "why-picked",
        label: titleCaseTag(venue.whyPicked.split(/[.!?]/)[0] ?? ""),
      });
    }
    if (tasteTags.length > 0) {
      tagSets.push(tasteTags);
    }
  }

  const filtered = tagSets.filter((set) => set.length > 0);
  return filtered.length > 0 ? filtered : [[{ id: "category-fallback", label: CATEGORY_LABELS[venue.category], icon: "category" }]];
}

function getPhotoTags(
  venue: Venue,
  activeSlideIndex: number,
  mapsUrl: string,
): readonly VenuePhotoTag[] {
  const sets = buildPhotoTagSets(venue, mapsUrl);
  const safeIndex = activeSlideIndex % sets.length;
  return sets[safeIndex] ?? sets[0] ?? [];
}

export function PreviewVenueCard({
  venue,
}: {
  readonly venue: Venue;
}) {
  const slides = getVenueSlides(venue);
  const previewSlide = slides[0] ?? null;
  const previewTags = getPhotoTags(venue, 0, buildGoogleMapsUrl(venue)).slice(0, 2);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#f4efe9]">
      <div className="absolute inset-0">
        {previewSlide ? (
          <Image
            src={previewSlide}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 480px"
            className="object-cover"
            unoptimized
            onContextMenu={(e) => e.preventDefault()}
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.88),_transparent_36%),linear-gradient(160deg,#d7c7b6_0%,#8d6f62_100%)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,13,12,0.06)_0%,rgba(15,13,12,0.16)_44%,rgba(15,13,12,0.76)_100%)]" />
      </div>

      <div className="relative flex h-full flex-col justify-between p-5 text-white">
        <div className="flex gap-2">
          {Array.from({ length: Math.max(slides.length, 3) }, (_, index) => (
            <span
              key={index}
              className={`h-1 flex-1 rounded-full ${
                index === 0 ? "bg-white/92" : "bg-white/28"
              }`}
            />
          ))}
        </div>

        <div className="space-y-3">
          <p className="text-[1.65rem] font-semibold leading-[0.96] tracking-[-0.05em]">
            {venue.name}
          </p>
          <div className="flex max-w-[14rem] flex-wrap items-start gap-2">
            {previewTags.map((tag) => (
              <TagChip key={tag.id} tag={tag} venue={venue} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const slides = getVenueSlides(venue);
  const activeSlide = slides[activeSlideIndex] ?? null;
  const mapsUrl = buildGoogleMapsUrl(venue);
  const photoTags = useMemo(
    () => getPhotoTags(venue, activeSlideIndex, mapsUrl),
    [activeSlideIndex, mapsUrl, venue],
  );
  const visibleSlideCount = slides.length > 0 ? slides.length : 4;
  const progressLabels = useMemo(
    () => Array.from({ length: visibleSlideCount }, (_, index) => `Show photo ${index + 1} of ${visibleSlideCount}`),
    [visibleSlideCount],
  );
  function moveToSlide(nextIndex: number) {
    if (slides.length <= 1) return;
    setActiveSlideIndex(getWrappedSlideIndex(nextIndex, slides.length));
  }

  return (
    <div className="flex h-full flex-col bg-[#f7f3ee]">
      <div className="relative min-h-[720px] flex-1 overflow-hidden bg-[#dccfc4]">
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_transparent_36%),linear-gradient(160deg,#d7c7b6_0%,#8d6f62_100%)]" />
        )}

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,13,12,0.08)_0%,rgba(15,13,12,0.12)_20%,rgba(15,13,12,0.34)_56%,rgba(15,13,12,0.88)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_center,rgba(255,255,255,0.22),transparent_42%)]" />
        {slides.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Show previous venue photo"
              className="absolute left-0 top-0 z-20 h-[72%] w-[38%]"
              onClick={(e) => {
                e.stopPropagation();
                moveToSlide(activeSlideIndex - 1);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              aria-label="Show next venue photo"
              className="absolute right-0 top-0 z-20 h-[72%] w-[38%]"
              onClick={(e) => {
                e.stopPropagation();
                moveToSlide(activeSlideIndex + 1);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            />
          </>
        ) : null}

        <div className="relative z-10 flex h-full flex-col p-5 sm:p-6">
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              {Array.from({ length: visibleSlideCount }, (_, index) => (
                <button
                  type="button"
                  key={index}
                  aria-label={progressLabels[index]}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    index === activeSlideIndex ? "bg-white/95" : "bg-white/24"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveToSlide(index);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                />
              ))}
            </div>

            <div className="flex items-start justify-end gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-[rgba(145,124,105,0.44)] px-3 py-2 text-[0.73rem] font-medium tracking-[0.02em] text-white/96 shadow-[0_10px_26px_rgba(10,10,10,0.12)] backdrop-blur-md">
                <span>{getDeckLabel(cardIndex, totalCards)}</span>
              </div>
            </div>
          </div>

          <div className="mt-auto space-y-4 pt-[24rem]">
            <div className="max-w-[84%]">
              <h2 className="text-[clamp(2rem,6.15vw,3.55rem)] font-semibold leading-[0.92] tracking-[-0.078em] text-white [text-wrap:balance]">
                {venue.name}
              </h2>
            </div>

            <div className="flex max-w-[82%] flex-wrap gap-2">
              {photoTags.slice(0, 3).map((tag) => (
                <TagChip key={tag.id} tag={tag} venue={venue} />
              ))}
            </div>

            <div className="flex items-center justify-center gap-5 pt-6">
              <button
                type="button"
                aria-label="Pass venue"
                onClick={() => onSwipe(false)}
                disabled={submitting || isAnimating}
                className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-white text-[#ea4a83] shadow-[0_18px_40px_rgba(16,12,14,0.24)] transition-transform duration-200 hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PassIcon className="h-10 w-10" />
              </button>
              <button
                type="button"
                aria-label="Like venue"
                onClick={() => onSwipe(true)}
                disabled={submitting || isAnimating}
                className="flex h-[98px] w-[98px] items-center justify-center rounded-full bg-[#ef4a84] text-white shadow-[0_22px_44px_rgba(239,74,132,0.42)] transition-transform duration-200 hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <HeartIcon className="h-10 w-10" />
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function OverlayTag({ children }: { readonly children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-[rgba(145,124,105,0.44)] px-4 py-2.5 text-[0.8rem] font-medium text-white shadow-[0_10px_26px_rgba(12,12,12,0.12)] backdrop-blur-md">
      {children}
    </span>
  );
}

function TagChip({
  tag,
  venue,
}: {
  readonly tag: VenuePhotoTag;
  readonly venue: Venue;
}) {
  const content = (
    <>
      {tag.icon === "category" ? <CategoryIcon category={venue.category} /> : null}
      {tag.icon === "map" ? <MapPinIcon /> : null}
      {tag.icon === "website" ? <GlobeIcon /> : null}
      {tag.icon === "status" ? <StatusDot /> : null}
      {tag.detail ? (
        <span className="flex flex-col leading-none">
          <span>{tag.label}</span>
          <span className="mt-1 text-[0.73rem] text-white/74">{tag.detail}</span>
        </span>
      ) : (
        <span>{tag.label}</span>
      )}
    </>
  );

  if (tag.href) {
    return (
      <a
        href={tag.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="inline-flex min-h-[46px] items-center gap-2 rounded-full border border-white/18 bg-[rgba(145,124,105,0.44)] px-4 py-2.5 text-sm font-medium text-white shadow-[0_10px_24px_rgba(12,12,12,0.12)] backdrop-blur-md transition-colors hover:bg-[rgba(145,124,105,0.58)]"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="inline-flex min-h-[46px] items-center gap-2 rounded-full border border-white/18 bg-[rgba(145,124,105,0.44)] px-4 py-2.5 text-sm font-medium text-white shadow-[0_10px_24px_rgba(12,12,12,0.12)] backdrop-blur-md">
      {content}
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

function MapPinIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path
        d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11" r="2.2" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" strokeLinecap="round" />
    </svg>
  );
}

function StatusDot() {
  return (
    <span
      className="h-3.5 w-3.5 rounded-full bg-[#5fd06d] shadow-[0_0_0_4px_rgba(95,208,109,0.16)]"
      aria-hidden="true"
    />
  );
}

function PassIcon({ className = "h-5 w-5" }: { readonly className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" />
    </svg>
  );
}

function HeartIcon({ className = "h-5 w-5" }: { readonly className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 20.4 4.55 13.1a4.75 4.75 0 0 1 6.72-6.7L12 7.13l.73-.73a4.75 4.75 0 0 1 6.72 6.7L12 20.4Z" />
    </svg>
  );
}
