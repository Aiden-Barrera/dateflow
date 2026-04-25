import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchMeetupEventCandidates } from "../meetup-api-client";
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

function makeMeetupEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-1",
    title: "Improv Night at Coldtowne Theater",
    dateTime: "2026-05-10T19:00:00",
    endTime: "2026-05-10T21:00:00",
    eventUrl: "https://www.meetup.com/atx-comedy/events/event-1/",
    description: "Fun improv comedy show with audience participation.",
    going: 34,
    venue: {
      name: "Coldtowne Theater",
      address: "4307 Airport Blvd, Austin, TX",
      lat: 30.3011,
      lng: -97.7107,
    },
    ...overrides,
  };
}

function makeMeetupResponse(events: unknown[]) {
  return {
    ok: true,
    json: async () => ({
      data: {
        keywordSearch: {
          edges: events.map((event) => ({ node: event })),
        },
      },
    }),
  };
}

describe("fetchMeetupEventCandidates", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockConsoleWarn.mockClear();
    mockConsoleError.mockClear();
    vi.unstubAllEnvs();
  });

  it("returns empty array and warns when MEETUP_API_KEY is missing", async () => {
    const result = await fetchMeetupEventCandidates(midpoint, 5000);

    expect(result).toEqual([]);
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      "[fetchMeetupEventCandidates] MEETUP_API_KEY not set — skipping",
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("maps a Meetup event to a PlaceCandidate with sourceType meetup", async () => {
    vi.stubEnv("MEETUP_API_KEY", "test-key");
    mockFetch.mockResolvedValueOnce(makeMeetupResponse([makeMeetupEvent()]));

    const result = await fetchMeetupEventCandidates(midpoint, 5000);

    expect(result).toHaveLength(1);
    const candidate = result[0];
    expect(candidate).toBeDefined();
    expect(candidate!.sourceType).toBe("meetup");
    expect(candidate!.placeId).toBe("meetup:event-1");
    expect(candidate!.name).toBe("Improv Night at Coldtowne Theater");
    expect(candidate!.location.lat).toBe(30.3011);
    expect(candidate!.location.lng).toBe(-97.7107);
    expect(candidate!.eventUrl).toBe("https://www.meetup.com/atx-comedy/events/event-1/");
    expect(candidate!.attendanceSignal).toBe(34);
    expect(candidate!.types).toContain("event");
    expect(candidate!.durationMinutes).toBe(120);
    expect(candidate!.scheduledAt).toBeInstanceOf(Date);
    expect(candidate!.eventDescription).toBe("Fun improv comedy show with audience participation.");
  });

  it("skips events that have no venue", async () => {
    vi.stubEnv("MEETUP_API_KEY", "test-key");
    const noVenueEvent = makeMeetupEvent({ venue: null });
    const validEvent = makeMeetupEvent({ id: "event-2", title: "Valid Event" });
    mockFetch.mockResolvedValueOnce(makeMeetupResponse([noVenueEvent, validEvent]));

    const result = await fetchMeetupEventCandidates(midpoint, 5000);

    expect(result).toHaveLength(1);
    expect(result[0]!.placeId).toBe("meetup:event-2");
  });

  it("returns empty array and logs error when API call fails", async () => {
    vi.stubEnv("MEETUP_API_KEY", "test-key");
    mockFetch.mockRejectedValueOnce(new Error("Network failure"));

    const result = await fetchMeetupEventCandidates(midpoint, 5000);

    expect(result).toEqual([]);
    expect(mockConsoleError).toHaveBeenCalledWith(
      "[fetchMeetupEventCandidates] failed",
      expect.any(Error),
    );
  });

  it("sends correct GraphQL query with lat/lng and radius", async () => {
    vi.stubEnv("MEETUP_API_KEY", "test-key");
    mockFetch.mockResolvedValueOnce(makeMeetupResponse([]));

    await fetchMeetupEventCandidates(midpoint, 8000);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.meetup.com/gql");
    const body = JSON.parse(String(init.body)) as { variables: { lat: number; lon: number; radius: number } };
    expect(body.variables.lat).toBe(30.2672);
    expect(body.variables.lon).toBe(-97.7431);
    expect(body.variables.radius).toBe(8); // km
  });
});
