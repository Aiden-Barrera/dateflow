import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRegister = vi.fn();
const mockLinkSessionToAccount = vi.fn();

vi.mock("../../../../../../src/lib/services/account-service", () => ({
  register: (...args: unknown[]) => mockRegister(...args),
}));

vi.mock("../../../../../../src/lib/services/session-history-service", () => ({
  linkSessionToAccount: (...args: unknown[]) => mockLinkSessionToAccount(...args),
}));

import { POST } from "../route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegister.mockResolvedValue({
      token: "token-123",
      account: {
        id: "account-1",
        email: "alex@example.com",
        createdAt: new Date("2026-04-13T20:00:00Z"),
      },
    });
    mockLinkSessionToAccount.mockResolvedValue(undefined);
  });

  it("returns 201 with the created account and token", async () => {
    const response = await POST(
      makeRequest({
        email: "alex@example.com",
        password: "supersecret",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(mockRegister).toHaveBeenCalledWith(
      "alex@example.com",
      "supersecret",
    );
    expect(body).toEqual({
      account: {
        id: "account-1",
        email: "alex@example.com",
        createdAt: "2026-04-13T20:00:00.000Z",
      },
      token: "token-123",
    });
  });

  it("returns 400 when email is invalid", async () => {
    const response = await POST(
      makeRequest({
        email: "not-an-email",
        password: "supersecret",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("email must be a valid email address");
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("returns 400 when password is too short", async () => {
    const response = await POST(
      makeRequest({
        email: "alex@example.com",
        password: "short",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("password must be at least 8 characters");
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("returns 409 for duplicate email", async () => {
    mockRegister.mockRejectedValue(new Error("Email already registered"));

    const response = await POST(
      makeRequest({
        email: "alex@example.com",
        password: "supersecret",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("Email already registered");
  });

  it("links a finished anonymous session when linkSessionId and linkRole are provided", async () => {
    const response = await POST(
      makeRequest({
        email: "alex@example.com",
        password: "supersecret",
        linkSessionId: "session-1",
        linkRole: "b",
      }),
    );

    expect(response.status).toBe(201);
    expect(mockLinkSessionToAccount).toHaveBeenCalledWith(
      "session-1",
      "account-1",
      "b",
    );
  });

  it("returns 400 when linkSessionId is present without linkRole", async () => {
    const response = await POST(
      makeRequest({
        email: "alex@example.com",
        password: "supersecret",
        linkSessionId: "session-1",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe(
      "linkRole is required when linkSessionId is provided",
    );
    expect(mockRegister).not.toHaveBeenCalled();
  });
});
