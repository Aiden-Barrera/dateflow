import type { Venue } from "../types/venue";

export type Platform = "ios" | "android" | "desktop";

export function detectPlatform(userAgent: string): Platform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return "ios";
  }

  if (/Macintosh/i.test(userAgent) && /Mobile/i.test(userAgent)) {
    return "ios";
  }

  if (/Android/i.test(userAgent)) {
    return "android";
  }

  return "desktop";
}

export function generateDirectionsUrl(
  venue: Pick<Venue, "lat" | "lng">,
  platform: Platform,
): string {
  const destination = `${venue.lat},${venue.lng}`;

  if (platform === "ios") {
    return `https://maps.apple.com/?daddr=${destination}`;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}
