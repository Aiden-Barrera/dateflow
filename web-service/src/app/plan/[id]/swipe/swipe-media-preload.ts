import type { Venue } from "../../../../lib/types/venue";

function getVenueSlidesForPreload(venue: Venue): readonly string[] {
  if (venue.photoUrls.length > 0) {
    return venue.photoUrls;
  }

  return venue.photoUrl ? [venue.photoUrl] : [];
}

export function getRoundPhotoPreloadUrls(
  venues: readonly Venue[],
  currentIndex: number,
): readonly string[] {
  if (venues.length === 0) {
    return [];
  }

  const prioritizedVenueIndexes = [
    currentIndex,
    currentIndex + 1,
    currentIndex + 2,
    ...venues.map((_, index) => index),
  ].filter((index, position, list) => (
    index >= 0 &&
    index < venues.length &&
    list.indexOf(index) === position
  ));

  const orderedUrls: string[] = [];
  const seenUrls = new Set<string>();

  for (const venueIndex of prioritizedVenueIndexes) {
    const venue = venues[venueIndex];

    if (!venue) {
      continue;
    }

    for (const url of getVenueSlidesForPreload(venue)) {
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        orderedUrls.push(url);
      }
    }
  }

  return orderedUrls;
}

export function preloadImageUrls(
  urls: readonly string[],
  seenUrls: Set<string>,
): void {
  if (typeof window === "undefined") {
    return;
  }

  for (const url of urls) {
    if (!url || seenUrls.has(url)) {
      continue;
    }

    seenUrls.add(url);

    const image = new window.Image();
    image.decoding = "async";
    image.src = url;

    if (typeof image.decode === "function") {
      void image.decode().catch(() => {
        // Ignore decode failures so a single bad asset does not block the rest.
      });
    }
  }
}
