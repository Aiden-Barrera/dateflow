import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLiveEventCandidates } from "../event-enrichment-service";
import type { Location } from "../../types/preference";
import type { PlaceCandidate } from "../../types/venue";

const mockFetchMeetup = vi.fn();
const mockFetchTicketmaster = vi.fn();

vi.mock("../meetup-api-client", () => ({
  fetchMeetupEventCandidates: (...args: unknown[]) => mockFetchMeetup(...args),
}));

vi.mock("../ticketmaster-api-client", () => ({
  fetchTicketmasterEventCandidates: (...args: unknown[]) =>
    mockFetchTicketmaster(...args),
}));

const midpoint: Location = { lat: 30.2672, lng: -97.7431, label: "Austin, TX" };

function makeEvent(
  source: "meetup" | "ticketmaster",
  id: string,
  lat: number,
  lng: number,
): PlaceCandidate {
  return {
    placeId: `${source}:${id}`,
    name: `Event ${id}`,
    address: "123 Main St, Austin, TX",
    location: { lat, lng, label: `Venue ${id}` },
    types: ["event"],
    primaryType: "event",
    priceLevel: 0,
    rating: 0,
    reviewCount: 0,
    sourceType: source,
    scheduledAt: new Date("2026-05-15T20:00:00Z"),
    eventUrl: `https://example.com/${id}`,
  };
}

describe("fetchLiveEventCandidates", () => {
  beforeEach(() => {
    mockFetchMeetup.mockReset();
    mockFetchTicketmaster.mockReset();
  });

  it("returns combined results from both sources", async () => {
    const meetupEvent = makeEvent("meetup", "m1", 30.2676, -97.7407);
    const tmEvent = makeEvent("ticketmaster", "t1", 30.2650, -97.7450);

    mockFetchMeetup.mockResolvedValueOnce([meetupEvent]);
    mockFetchTicketmaster.mockResolvedValueOnce([tmEvent]);

    const result = await fetchLiveEventCandidates(midpoint, 5000);

    expect(result).toHaveLength(2);
    const sourceTypes = result.map((c) => c.sourceType);
    expect(sourceTypes).toContain("meetup");
    expect(sourceTypes).toContain("ticketmaster");
  });

  it("deduplicates events at the same venue (within 100m)", async () => {
    // Same venue, slightly different coordinates from two sources
    const meetupEvent = makeEvent("meetup", "m1", 30.2676, -97.7407);
    const tmEventSameVenue = makeEvent("ticketmaster", "t1", 30.26762, -97.74072);

    mockFetchMeetup.mockResolvedValueOnce([meetupEvent]);
    mockFetchTicketmaster.mockResolvedValueOnce([tmEventSameVenue]);

    const result = await fetchLiveEventCandidates(midpoint, 5000);

    expect(result).toHaveLength(1);
  });

  it("keeps events at different venues even if close", async () => {
    const event1 = makeEvent("meetup", "m1", 30.2676, -97.7407);
    // ~200m away — distinct venue
    const event2 = makeEvent("ticketmaster", "t1", 30.2694, -97.7407);

    mockFetchMeetup.mockResolvedValueOnce([event1]);
    mockFetchTicketmaster.mockResolvedValueOnce([event2]);

    const result = await fetchLiveEventCandidates(midpoint, 5000);

    expect(result).toHaveLength(2);
  });

  it("returns empty array when both sources fail", async () => {
    mockFetchMeetup.mockRejectedValueOnce(new Error("Meetup down"));
    mockFetchTicketmaster.mockRejectedValueOnce(new Error("TM down"));

    const result = await fetchLiveEventCandidates(midpoint, 5000);

    expect(result).toEqual([]);
  });

  it("returns partial results when one source fails", async () => {
    const tmEvent = makeEvent("ticketmaster", "t1", 30.2650, -97.7450);

    mockFetchMeetup.mockRejectedValueOnce(new Error("Meetup down"));
    mockFetchTicketmaster.mockResolvedValueOnce([tmEvent]);

    const result = await fetchLiveEventCandidates(midpoint, 5000);

    expect(result).toHaveLength(1);
    expect(result[0]!.sourceType).toBe("ticketmaster");
  });

  it("calls both sources with the same location and radius", async () => {
    mockFetchMeetup.mockResolvedValueOnce([]);
    mockFetchTicketmaster.mockResolvedValueOnce([]);

    await fetchLiveEventCandidates(midpoint, 8000);

    expect(mockFetchMeetup).toHaveBeenCalledWith(midpoint, 8000);
    expect(mockFetchTicketmaster).toHaveBeenCalledWith(midpoint, 8000);
  });
});
