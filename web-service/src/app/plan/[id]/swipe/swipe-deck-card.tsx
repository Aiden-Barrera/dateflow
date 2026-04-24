"use client";

import type { Venue } from "../../../../lib/types/venue";
import { SwipeCardCanvas } from "./swipe-card-canvas";

// Re-export helpers so existing tests (which import from this file) keep working
export {
  getDisplayTags,
  getVenueSlides,
  clampSlideIndex,
} from "./venue-card-content";

// ─── Component ────────────────────────────────────────────────────────────────

type SwipeDeckCardProps = {
  readonly venue: Venue;
  readonly nextVenue: Venue | null;
  readonly cardIndex: number;
  readonly totalCards: number;
  readonly submitting: boolean;
  readonly onSwipe: (liked: boolean) => Promise<void>;
  readonly venues?: readonly Venue[];
};

export function SwipeDeckCard({
  venue,
  nextVenue,
  cardIndex,
  totalCards,
  submitting,
  onSwipe,
  venues,
}: SwipeDeckCardProps) {
  const thirdVenue = venues?.[2] ?? null;

  return (
    <SwipeCardCanvas
      venue={venue}
      nextVenue={nextVenue}
      thirdVenue={thirdVenue}
      cardIndex={cardIndex}
      totalCards={totalCards}
      submitting={submitting}
      onSwipe={onSwipe}
    />
  );
}
