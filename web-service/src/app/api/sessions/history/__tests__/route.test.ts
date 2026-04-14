import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();
const mockGetHistory = vi.fn();

vi.mock("../../../../../lib/supabase", () => ({
  getSupabaseClient: () => ({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  }),
}));

vi.mock("../../../../../lib/services/session-history-service", () => ({
  getHistory: (...args: unknown[]) => mockGetHistory(...args),
}));

import { GET } from "../route";

function makeRequest(query = "", token = "token-123"): Request {
  return new Request(`http://localhost:3000/api/sessions/history${query}`, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

describe("GET /api/sessions/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "account-1" } },
      error: null,
    });
    mockGetHistory.mockResolvedValue({
      sessions: [
        {
          sessionId: "session-1",
          status: "matched",
          createdAt: "2026-04-13T19:00:00.000Z",
          role: "a",
          matchedVenue: {
            name: "Cafe Blue",
            category: "RESTAURANT",
            address: "12 Main St, Austin, TX",
            photoUrl: "https://example.com/photo.jpg",
          },
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 1,
      totalPages: 1,
    });
  });

  it("verifies the bearer token and returns paginated history", async () => {
    const response = await GET(makeRequest("?page=2&pageSize=5"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetUser).toHaveBeenCalledWith("token-123");
    expect(mockGetHistory).toHaveBeenCalledWith("account-1", 2, 5, false);
    expect(body.sessions).toHaveLength(1);
  });

  it("returns 401 when the authorization header is missing", async () => {
    const response = await GET(makeRequest("", ""));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authorization header is required");
    expect(mockGetHistory).not.toHaveBeenCalled();
  });

  it("returns 401 when Supabase rejects the token", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "invalid jwt" },
    });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Invalid token");
  });

  it("returns 400 when pageSize exceeds the maximum", async () => {
    const response = await GET(makeRequest("?pageSize=99"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("pageSize must be between 1 and 50");
    expect(mockGetHistory).not.toHaveBeenCalled();
  });
});
