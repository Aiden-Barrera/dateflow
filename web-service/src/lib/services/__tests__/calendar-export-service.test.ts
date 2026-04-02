import { describe, expect, it } from "vitest";
import { generateICS } from "../calendar-export-service";
import type { MatchResult } from "../../types/match-result";

const matchResult: MatchResult = {
  sessionId: "session-1",
  matchedAt: new Date("2026-04-02T18:30:00Z"),
  venue: {
    id: "venue-12",
    sessionId: "session-1",
    placeId: "place-12",
    name: "Cafe Blue",
    category: "RESTAURANT",
    address: "12 Main St, Austin, TX",
    lat: 30.26,
    lng: -97.74,
    priceLevel: 2,
    rating: 4.6,
    photoUrl: "https://example.com/photo.jpg",
    tags: ["cozy", "patio"],
    round: 3,
    position: 4,
    score: {
      categoryOverlap: 0.9,
      distanceToMidpoint: 0.8,
      firstDateSuitability: 0.95,
      qualitySignal: 0.85,
      timeOfDayFit: 0.75,
      composite: 0.875,
    },
  },
};

describe("calendar-export-service", () => {
  it("generates ICS content for an explicit date and time", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    const ics = generateICS(matchResult, new Date("2026-04-05T19:30:00Z"));

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:session-1@dateflow.app");
    expect(ics).toContain("DTSTAMP:20260402T183000Z");
    expect(ics).toContain("SUMMARY:Date at Cafe Blue");
    expect(ics).toContain("LOCATION:12 Main St\\, Austin\\, TX");
    expect(ics).toContain(
      "DESCRIPTION:Planned with Dateflow - http://localhost:3000/plan/session-1/results",
    );
    expect(ics).toContain("DTSTART:20260405T193000Z");
    expect(ics).toContain("DTEND:20260405T213000Z");
  });

  it("defaults to 7:00 PM the next day when no dateTime is provided", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    const ics = generateICS(matchResult);

    expect(ics).toContain("DTSTART:20260403T190000Z");
    expect(ics).toContain("DTEND:20260403T210000Z");
  });
});
