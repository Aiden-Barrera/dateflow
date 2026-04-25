import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLiveEventCandidates } from "../event-enrichment-service";
import type { Location } from "../../types/preference";
import type { PlaceCandidate } from "../../types/venue";

const mockFetchTicketmaster = vi.fn();

vi.mock("../ticketmaster-api-client", () => ({
  fetchTicketmasterEventCandidates: (...args: unknown[]) =>
    mockFetchTicketmaster(...args),
}));

const midpoint: Location = { lat: 30.2672, lng: -97.7431, label: "Austin, TX" };

function makeEvent(id: string, lat: number, lng: number): PlaceCandidate {
  return {
    placeId: `ticketmaster:${id}`,
    name: `Event ${id}`,
    address: "123 Main St, Austin, TX",
    location: { lat, lng, label: `Venue ${id}` },
    types: ["event"],
    primaryType: "event",
    priceLevel: 0,
    rating: 0,
    reviewCount: 0,
    sourceType: "ticketmaster",
    scheduledAt: new Date("2026-05-15T20:00:00Z"),
    eventUrl: `https://example.com/${id}`,
  };
}

describe("fetchLiveEventCandidates", () => {
  beforeEach(() => {
    mockFetchTicketmaster.mockReset();
  });

  it("returns Ticketmaster candidates", async () => {
    const event1 = makeEvent("t1", 30.2676, -97.7407);
    const event2 = makeEvent("t2", 30.2650, -97.7450);
    mockFetchTicketmaster.mockResolvedValueOnce([event1, event2]);

    const result = await fetchLiveEventCandidates(midpoint, 5000);

    expect(result).toHaveLength(2);
    expect(result.every((c) => c.sourceType === "ticketmaster")).toBe(true);
  });

  it("returns empty array when Ticketmaster returns nothing", async () => {
    mockFetchTicketmaster.mockResolvedValueOnce([]);

    const result = await fetchLiveEventCandidates(midpoint, 5000);

    expect(result).toEqual([]);
  });

  it("forwards location and radius to Ticketmaster", async () => {
    mockFetchTicketmaster.mockResolvedValueOnce([]);

    await fetchLiveEventCandidates(midpoint, 8000);

    expect(mockFetchTicketmaster).toHaveBeenCalledWith(midpoint, 8000);
  });

  it("propagates errors from Ticketmaster (caller handles failure)", async () => {
    mockFetchTicketmaster.mockRejectedValueOnce(new Error("TM down"));

    await expect(fetchLiveEventCandidates(midpoint, 5000)).rejects.toThrow("TM down");
  });
});
