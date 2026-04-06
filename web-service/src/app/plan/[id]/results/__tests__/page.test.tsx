import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCookieGet = vi.fn();
const mockNotFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

const matchedSessionRow = {
  id: "session-1",
  status: "matched",
  creator_display_name: "Alex",
  invitee_display_name: "Jordan",
  created_at: "2026-04-02T18:30:00Z",
  expires_at: "2026-04-04T18:30:00Z",
  matched_venue_id: "venue-12",
  matched_at: "2026-04-02T18:30:00Z",
};

const matchedVenueRow = {
  id: "venue-12",
  session_id: "session-1",
  place_id: "place-12",
  name: "Cafe Blue",
  category: "RESTAURANT",
  address: "12 Main St, Austin, TX",
  lat: 30.26,
  lng: -97.74,
  price_level: 2,
  rating: 4.6,
  photo_urls: [
    "https://example.com/cafe-blue.jpg",
    "https://example.com/cafe-blue-2.jpg",
  ],
  photo_url: "https://example.com/cafe-blue.jpg",
  tags: ["cozy patio", "walkable"],
  round: 1,
  position: 1,
  score_category_overlap: 0.9,
  score_distance_to_midpoint: 0.8,
  score_first_date_suitability: 0.95,
  score_quality_signal: 0.85,
  score_time_of_day_fit: 0.75,
};

vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.test");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === "sessions") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: matchedSessionRow,
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === "venues") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({
                  data: matchedVenueRow,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

vi.mock("../../../../../../lib/session-role-access", () => ({
  getBoundSessionRole: () => "a",
  getSessionRoleCookieName: () => "test-cookie",
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (...args: unknown[]) => mockCookieGet(...args),
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
}));

describe("/plan/[id]/results page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue({ value: "a.test" });
  });

  it("renders the matched venue reveal with the primary actions", async () => {
    const { default: ResultPage } = await import("../page");
    const page = await ResultPage({
      params: Promise.resolve({ id: "session-1" }),
    });

    const html = renderToStaticMarkup(page);

    expect(html).toContain("It’s a match");
    expect(html).toContain("Cafe Blue");
    expect(html).toContain("both liked this spot");
    expect(html).toContain("12 Main St, Austin, TX");
    expect(html).toContain("Get directions");
    expect(html).toContain("Add to calendar");
  });

  it("builds result-page metadata from the matched venue", async () => {
    const { generateMetadata } = await import("../page");
    const metadata = await generateMetadata({
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(metadata.title).toBe("Alex matched on Cafe Blue");
    expect(metadata.description).toContain("Get directions");
    expect(metadata.openGraph?.images).toEqual([
      {
        url: "https://example.com/cafe-blue.jpg",
        alt: "Cafe Blue",
      },
      {
        url: "https://example.com/cafe-blue-2.jpg",
        alt: "Cafe Blue",
      },
    ]);
  });
});
