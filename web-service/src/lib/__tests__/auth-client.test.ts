import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCurrentAccount } from "../auth-client";

const mockFetch = vi.fn();

describe("auth-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
  });

  it("fetches the current account with the bearer token", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        account: {
          id: "account-1",
          email: "alex@example.com",
          createdAt: "2026-04-13T20:00:00.000Z",
        },
      }),
    });

    const result = await fetchCurrentAccount("token-123");

    expect(mockFetch).toHaveBeenCalledWith("/api/auth/me", {
      headers: {
        Authorization: "Bearer token-123",
      },
    });
    expect(result).toEqual({
      id: "account-1",
      email: "alex@example.com",
      createdAt: "2026-04-13T20:00:00.000Z",
    });
  });

  it("surfaces auth route errors as exceptions", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "Invalid token",
      }),
    });

    await expect(fetchCurrentAccount("bad-token")).rejects.toThrow(
      "Invalid token",
    );
  });
});
