import { getSupabaseServerClient } from "../supabase-server";
import type { Category } from "../types/preference";
import type { Venue } from "../types/venue";
import { getBothPreferences } from "./preference-service";
import { getVenues } from "./venue-generation-service";

type DemoVenueSeed = {
  readonly name: string;
  readonly category: Category;
  readonly addressHint: string;
  readonly priceLevel: number;
  readonly rating: number;
  readonly tags: readonly string[];
  readonly score: {
    readonly categoryOverlap: number;
    readonly distanceToMidpoint: number;
    readonly firstDateSuitability: number;
    readonly qualitySignal: number;
    readonly timeOfDayFit: number;
  };
};

const DEMO_SEEDS: readonly DemoVenueSeed[] = [
  {
    name: "Cinder Room",
    category: "RESTAURANT",
    addressHint: "Canal Street",
    priceLevel: 2,
    rating: 4.8,
    tags: ["cozy booths", "good first stop"],
    score: {
      categoryOverlap: 0.96,
      distanceToMidpoint: 0.88,
      firstDateSuitability: 0.92,
      qualitySignal: 0.9,
      timeOfDayFit: 0.84,
    },
  },
  {
    name: "Velvet Hour",
    category: "BAR",
    addressHint: "Wythe Avenue",
    priceLevel: 2,
    rating: 4.7,
    tags: ["low-key cocktails", "easy to talk"],
    score: {
      categoryOverlap: 0.9,
      distanceToMidpoint: 0.84,
      firstDateSuitability: 0.89,
      qualitySignal: 0.87,
      timeOfDayFit: 0.82,
    },
  },
  {
    name: "Frame Gallery",
    category: "ACTIVITY",
    addressHint: "Lafayette Street",
    priceLevel: 1,
    rating: 4.6,
    tags: ["walk-and-talk", "easy icebreaker"],
    score: {
      categoryOverlap: 0.85,
      distanceToMidpoint: 0.86,
      firstDateSuitability: 0.94,
      qualitySignal: 0.8,
      timeOfDayFit: 0.75,
    },
  },
  {
    name: "North Star Cinema",
    category: "EVENT",
    addressHint: "Bedford Avenue",
    priceLevel: 2,
    rating: 4.5,
    tags: ["planned night out", "strong backup"],
    score: {
      categoryOverlap: 0.82,
      distanceToMidpoint: 0.83,
      firstDateSuitability: 0.76,
      qualitySignal: 0.86,
      timeOfDayFit: 0.9,
    },
  },
];

function pickCategory(
  preferredCategories: readonly Category[],
  fallbackCategory: Category,
): Category {
  return preferredCategories.includes(fallbackCategory)
    ? fallbackCategory
    : preferredCategories[0] ?? fallbackCategory;
}

export async function generateDemoVenues(
  sessionId: string,
): Promise<readonly Venue[]> {
  const [preferenceA, preferenceB] = await getBothPreferences(sessionId);
  const supabase = getSupabaseServerClient();
  const preferredCategories = [
    ...new Set([...preferenceA.categories, ...preferenceB.categories]),
  ];
  const midpoint = {
    lat: (preferenceA.location.lat + preferenceB.location.lat) / 2,
    lng: (preferenceA.location.lng + preferenceB.location.lng) / 2,
  };

  const venueRows = Array.from({ length: 12 }, (_, index) => {
    const round = Math.floor(index / 4) + 1;
    const position = (index % 4) + 1;
    const seed = DEMO_SEEDS[index % DEMO_SEEDS.length];
    const category = pickCategory(preferredCategories, seed.category);
    const latOffset = 0.003 + index * 0.0012;
    const lngOffset = 0.002 + index * 0.0011;

    return {
      session_id: sessionId,
      place_id: `demo-${sessionId}-${round}-${position}`,
      name: `${seed.name} ${round}.${position}`,
      category,
      address: `${seed.addressHint} · Demo pick`,
      lat: midpoint.lat + latOffset,
      lng: midpoint.lng - lngOffset,
      price_level: seed.priceLevel,
      rating: seed.rating,
      photo_url: null,
      tags: [...seed.tags, `round ${round}`],
      round,
      position,
      score_category_overlap: seed.score.categoryOverlap,
      score_distance_to_midpoint: seed.score.distanceToMidpoint,
      score_first_date_suitability: seed.score.firstDateSuitability,
      score_quality_signal: seed.score.qualitySignal,
      score_time_of_day_fit: seed.score.timeOfDayFit,
      generation_batch_id: null,
      surfaced_cycle: 1,
    };
  });

  const { error: venueError } = await supabase
    .from("venues")
    .upsert(venueRows, { onConflict: "session_id,round,position" });

  if (venueError) {
    throw new Error(venueError.message);
  }

  const { error: sessionError } = await supabase
    .from("sessions")
    .update({ status: "ready_to_swipe" })
    .eq("id", sessionId)
    .in("status", ["both_ready", "generation_failed", "generating"]);

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  return getVenues(sessionId);
}
