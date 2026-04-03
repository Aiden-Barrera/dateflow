import {
  detectPlatform,
  generateDirectionsUrl,
} from "../../../../lib/services/directions-service";

export type ResultRevealMode = "confetti" | "fade";

export function getResultDirectionsHref(
  venue: { readonly address: string },
  userAgent: string,
): string {
  return generateDirectionsUrl(venue, detectPlatform(userAgent));
}

export function getResultRevealMode(
  prefersReducedMotion: boolean,
): ResultRevealMode {
  return prefersReducedMotion ? "fade" : "confetti";
}
