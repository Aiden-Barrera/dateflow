import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchHistory } from "../history-client";

const mockFetch = vi.fn();

describe("history-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
  });

  it("fetches the default matched-history view with the bearer token", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        sessions: [],
        page: 1,
        pageSize: 10,
        totalCount: 0,
        totalPages: 0,
      }),
    });

    const result = await fetchHistory("token-123");

    expect(mockFetch).toHaveBeenCalledWith("/api/sessions/history?page=1&pageSize=10", {
      headers: {
        Authorization: "Bearer token-123",
      },
    });
    expect(result.totalCount).toBe(0);
  });

  it("adds includeAll when requesting the broader history filter", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        sessions: [],
        page: 1,
        pageSize: 10,
        totalCount: 0,
        totalPages: 0,
      }),
    });

    await fetchHistory("token-123", { includeAll: true, page: 2, pageSize: 5 });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/sessions/history?page=2&pageSize=5&includeAll=true",
      {
        headers: {
          Authorization: "Bearer token-123",
        },
      },
    );
  });
});
