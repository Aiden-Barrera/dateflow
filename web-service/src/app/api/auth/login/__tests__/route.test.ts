import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLogin = vi.fn();
const mockBeginGoogleOAuth = vi.fn();

vi.mock("../../../../../../src/lib/services/account-service", () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  beginGoogleOAuth: (...args: unknown[]) => mockBeginGoogleOAuth(...args),
}));

import { POST } from "../route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockResolvedValue({
      token: "token-456",
      account: {
        id: "account-1",
        email: "alex@example.com",
        createdAt: new Date("2026-04-13T20:00:00Z"),
      },
    });
    mockBeginGoogleOAuth.mockResolvedValue(
      "https://supabase.test/auth/v1/authorize?provider=google",
    );
  });

  it("returns 200 with the account and token", async () => {
    const response = await POST(
      makeRequest({
        email: "alex@example.com",
        password: "supersecret",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockLogin).toHaveBeenCalledWith(
      "alex@example.com",
      "supersecret",
    );
    expect(body).toEqual({
      account: {
        id: "account-1",
        email: "alex@example.com",
        createdAt: "2026-04-13T20:00:00.000Z",
      },
      token: "token-456",
    });
  });

  it("returns 400 when password is missing", async () => {
    const response = await POST(
      makeRequest({
        email: "alex@example.com",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("password is required and must be a string");
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("returns 401 when credentials are invalid", async () => {
    mockLogin.mockRejectedValue(new Error("Invalid credentials"));

    const response = await POST(
      makeRequest({
        email: "alex@example.com",
        password: "wrongpass",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Invalid credentials");
  });

  it("returns a redirect url when provider google is requested", async () => {
    const response = await POST(
      makeRequest({
        provider: "google",
        redirectTo: "http://localhost:3000/history",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockBeginGoogleOAuth).toHaveBeenCalledWith(
      "http://localhost:3000/history",
    );
    expect(body).toEqual({
      url: "https://supabase.test/auth/v1/authorize?provider=google",
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });
});
