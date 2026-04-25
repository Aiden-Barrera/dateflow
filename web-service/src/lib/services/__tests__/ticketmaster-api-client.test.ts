import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchTicketmasterEventCandidates } from "../ticketmaster-api-client";
import type { Location } from "../../types/preference";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
const mockConsoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

afterAll(() => {
  mockConsoleWarn.mockRestore();
  mockConsoleError.mockRestore();
});

const midpoint: Location = { lat: 30.2672, lng: -97.7431, label: "Austin, TX" };

function makeTmEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "tm-event-1",
    name: "The Comedy Show",
    url: "https://www.ticketmaster.com/event/tm-event-1",
    dates: {
      start: {
        dateTime: "2026-05-15T20:00:00Z",
      },
    },
    classifications: [
      {
        segment: { id: "KZFzniwnSyZfZ7v7nJ", name: "Arts & Theatre" },
        genre: { id: "KnvZfZ7v7lJ", name: "Comedy" },
      },
    ],
    _embedded: {
      venues: [
        {
          name: "Esther's Follies",
          address: { line1: "525 E 6th St" },
          city: { name: "Austin" },
          state: { stateCode: "TX" },
          location: { latitude: "30.2676", longitude: "-97.7407" },
        },
      ],
    },
    popularity: 0.72,
    ...overrides,
  };
}

function makeTmResponse(events: unknown[]) {
  return {
    ok: true,
    json: async () => ({
      _embedded: { events },
      page: { totalElements: events.length, number: 0, size: 20, totalPages: 1 },
    }),
  };
}

describe("fetchTicketmasterEventCandidates", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockConsoleWarn.mockClear();
    mockConsoleError.mockClear();
    vi.unstubAllEnvs();
  });

  it("returns empty array and warns when TICKETMASTER_API_KEY is missing", async () => {
    const result = await fetchTicketmasterEventCandidates(midpoint, 5000);

    expect(result).toEqual([]);
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      "[fetchTicketmasterEventCandidates] TICKETMASTER_API_KEY not set — skipping",
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("maps a Ticketmaster event to a PlaceCandidate with sourceType ticketmaster", async () => {
    vi.stubEnv("TICKETMASTER_API_KEY", "test-key");
    mockFetch.mockResolvedValueOnce(makeTmResponse([makeTmEvent()]));

    const result = await fetchTicketmasterEventCandidates(midpoint, 5000);

    expect(result).toHaveLength(1);
    const candidate = result[0];
    expect(candidate).toBeDefined();
    expect(candidate!.sourceType).toBe("ticketmaster");
    expect(candidate!.placeId).toBe("ticketmaster:tm-event-1");
    expect(candidate!.name).toBe("The Comedy Show");
    expect(candidate!.location.lat).toBe(30.2676);
    expect(candidate!.location.lng).toBe(-97.7407);
    expect(candidate!.eventUrl).toBe("https://www.ticketmaster.com/event/tm-event-1");
    expect(candidate!.attendanceSignal).toBe(0.72);
    expect(candidate!.scheduledAt).toBeInstanceOf(Date);
    expect(candidate!.types).toContain("event");
  });

  it("skips events that have no venue location", async () => {
    vi.stubEnv("TICKETMASTER_API_KEY", "test-key");
    const noVenueEvent = makeTmEvent({ _embedded: { venues: [] } });
    const noLocationEvent = makeTmEvent({
      id: "tm-event-no-loc",
      _embedded: { venues: [{ name: "Unknown", address: {}, city: {}, state: {} }] },
    });
    const validEvent = makeTmEvent({ id: "tm-event-valid" });
    mockFetch.mockResolvedValueOnce(makeTmResponse([noVenueEvent, noLocationEvent, validEvent]));

    const result = await fetchTicketmasterEventCandidates(midpoint, 5000);

    expect(result).toHaveLength(1);
    expect(result[0]!.placeId).toBe("ticketmaster:tm-event-valid");
  });

  it("NEVER sends music segment IDs in the request", async () => {
    vi.stubEnv("TICKETMASTER_API_KEY", "test-key");
    mockFetch.mockResolvedValueOnce(makeTmResponse([]));

    await fetchTicketmasterEventCandidates(midpoint, 5000);

    const [url] = mockFetch.mock.calls[0] as [string];
    // KZFzniwnSyZfZ7v7nE is the Ticketmaster Music segment ID
    expect(url).not.toContain("KZFzniwnSyZfZ7v7nE");
    // Should contain arts & theatre segment ID
    expect(url).toContain("KZFzniwnSyZfZ7v7nJ");
  });

  it("returns empty array and logs error when API call fails", async () => {
    vi.stubEnv("TICKETMASTER_API_KEY", "test-key");
    mockFetch.mockRejectedValueOnce(new Error("Network timeout"));

    const result = await fetchTicketmasterEventCandidates(midpoint, 5000);

    expect(result).toEqual([]);
    expect(mockConsoleError).toHaveBeenCalledWith(
      "[fetchTicketmasterEventCandidates] failed",
      expect.any(Error),
    );
  });

  it("sends correct lat/lng/radius in the query string", async () => {
    vi.stubEnv("TICKETMASTER_API_KEY", "test-key");
    mockFetch.mockResolvedValueOnce(makeTmResponse([]));

    await fetchTicketmasterEventCandidates(midpoint, 10000);

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain("latlong=30.2672%2C-97.7431");
    expect(url).toContain("radius=10"); // km
  });
});
