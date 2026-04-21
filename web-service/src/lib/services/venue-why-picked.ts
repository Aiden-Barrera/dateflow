import type { Category } from "../types/preference";
import type { CuratedVenueCandidate } from "../types/venue";

const MAX_LENGTH = 140;

const CATEGORY_HOOK: Record<Category, string> = {
  RESTAURANT: "a great sit-down spot",
  BAR: "a relaxed spot to share drinks",
  ACTIVITY: "a fun shared activity",
  EVENT: "a memorable shared event",
};

/**
 * Builds a short (<=140 char) "why we picked this" blurb for a venue.
 *
 * Deterministic and explanatory — it references the venue's own strengths
 * (rating, review volume, distance, editorial tagline) rather than generic
 * copy. Returns `undefined` if we have nothing useful to say.
 */
export function buildWhyPicked(
  candidate: CuratedVenueCandidate,
  distanceMeters: number | undefined,
): string | undefined {
  const hook = CATEGORY_HOOK[candidate.category];
  const signals: string[] = [];

  if (candidate.rating >= 4.3 && candidate.reviewCount >= 50) {
    signals.push(
      `rated ${candidate.rating.toFixed(1)} across ${formatCount(candidate.reviewCount)} reviews`,
    );
  } else if (candidate.rating >= 4.0) {
    signals.push(`rated ${candidate.rating.toFixed(1)}`);
  }

  if (typeof distanceMeters === "number" && distanceMeters > 0) {
    signals.push(`close to your midpoint (${formatMiles(distanceMeters)})`);
  }

  if (candidate.editorialSummary) {
    signals.push(candidate.editorialSummary.trim().replace(/\.$/, ""));
  }

  if (signals.length === 0) {
    return undefined;
  }

  const blurb = `Picked as ${hook} — ${signals.slice(0, 2).join(", ")}.`;
  if (blurb.length <= MAX_LENGTH) {
    return blurb;
  }

  const trimmed = blurb.slice(0, MAX_LENGTH - 1).trimEnd();
  return `${trimmed.replace(/[,.;:]$/, "")}…`;
}

function formatCount(count: number): string {
  if (count >= 1_000) {
    const thousands = count / 1_000;
    const rounded = thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10;
    return `${rounded}k`;
  }
  return String(count);
}

function formatMiles(meters: number): string {
  const miles = meters / 1609.344;
  if (miles < 0.1) {
    return "<0.1 mi";
  }
  return `${miles.toFixed(1)} mi`;
}
