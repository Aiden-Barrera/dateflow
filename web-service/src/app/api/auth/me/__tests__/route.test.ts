import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetAccountByAccessToken = vi.fn();
const mockDeleteAccountByAccessToken = vi.fn();

vi.mock("../../../../../lib/services/account-service", () => ({
  deleteAccountByAccessToken: (...args: unknown[]) =>
    mockDeleteAccountByAccessToken(...args),
  getAccountByAccessToken: (...args: unknown[]) =>
    mockGetAccountByAccessToken(...args),
}));

import { DELETE, GET } from "../route";

function makeRequest(token = "token-123"): Request {
  return new Request("http://localhost:3000/api/auth/me", {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAccountByAccessToken.mockResolvedValue({
      id: "account-1",
      email: "alex@example.com",
      createdAt: new Date("2026-04-13T20:00:00Z"),
    });
    mockDeleteAccountByAccessToken.mockResolvedValue(undefined);
  });

  it("returns the authenticated account", async () => {
    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetAccountByAccessToken).toHaveBeenCalledWith("token-123");
    expect(body).toEqual({
      account: {
        id: "account-1",
        email: "alex@example.com",
        createdAt: "2026-04-13T20:00:00.000Z",
      },
    });
  });

  it("returns 401 when the authorization header is missing", async () => {
    const response = await GET(makeRequest(""));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authorization header is required");
    expect(mockGetAccountByAccessToken).not.toHaveBeenCalled();
  });

  it("returns 401 when the token is invalid", async () => {
    mockGetAccountByAccessToken.mockRejectedValue(new Error("Invalid token"));

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Invalid token");
  });
});

describe("DELETE /api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteAccountByAccessToken.mockResolvedValue(undefined);
  });

  it("deletes the authenticated account", async () => {
    const response = await DELETE(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ deleted: true });
    expect(mockDeleteAccountByAccessToken).toHaveBeenCalledWith("token-123");
  });

  it("returns 401 when the token is invalid", async () => {
    mockDeleteAccountByAccessToken.mockRejectedValue(new Error("Invalid token"));

    const response = await DELETE(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Invalid token");
  });
});
