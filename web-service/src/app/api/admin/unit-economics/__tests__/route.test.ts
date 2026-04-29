import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUnitEconomicsSnapshot = vi.fn();
const mockListUnitEconomicsSnapshots = vi.fn();

vi.mock("/src/lib/services/unit-economics-service", () => ({
  getUnitEconomicsSnapshot: (...args: unknown[]) => mockGetUnitEconomicsSnapshot(...args),
  listUnitEconomicsSnapshots: (...args: unknown[]) => mockListUnitEconomicsSnapshots(...args),
}));

import { GET } from "../route";

function makeRequest(search = "", token?: string): Request {
  return new Request(`http://localhost:3000/api/admin/unit-economics${search}`, {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
}

describe("GET /api/admin/unit-economics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-secret";
    mockGetUnitEconomicsSnapshot.mockResolvedValue({
      sessionId: "session-1",
      placesSearchRequests: 1,
      placesPhotoRequests: 2,
      aiRequests: 0,
      placesSearchCostCents: 2,
      placesPhotoCostCents: 2,
      aiCostCents: 0,
      infraCostCents: 1,
      acquisitionCostCents: null,
      revenueCents: 0,
      grossMarginCents: -5,
      lastComputedAt: "2026-04-29T00:00:00.000Z",
    });
    mockListUnitEconomicsSnapshots.mockResolvedValue([]);
  });

  it("rejects unauthenticated requests", async () => {
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
  });

  it("returns a single snapshot when sessionId is provided", async () => {
    const response = await GET(makeRequest("?sessionId=session-1", "cron-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetUnitEconomicsSnapshot).toHaveBeenCalledWith("session-1");
    expect(body.snapshot.sessionId).toBe("session-1");
  });

  it("returns a recent snapshot list when sessionId is absent", async () => {
    mockListUnitEconomicsSnapshots.mockResolvedValueOnce([
      {
        sessionId: "session-2",
        placesSearchRequests: 0,
        placesPhotoRequests: 1,
        aiRequests: 0,
        placesSearchCostCents: 0,
        placesPhotoCostCents: 1,
        aiCostCents: 0,
        infraCostCents: 1,
        acquisitionCostCents: null,
        revenueCents: 0,
        grossMarginCents: -2,
        lastComputedAt: "2026-04-29T00:00:00.000Z",
      },
    ]);

    const response = await GET(makeRequest("", "cron-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.snapshots).toHaveLength(1);
    expect(body.snapshots[0].sessionId).toBe("session-2");
  });
});
