import { beforeEach, describe, expect, it, vi } from "vitest";

const mockExpireStaleSessions = vi.fn();

vi.mock("../../../../../lib/services/session-service", () => ({
  expireStaleSessions: (...args: unknown[]) => mockExpireStaleSessions(...args),
}));

import { GET } from "../route";

function makeRequest(token?: string): Request {
  return new Request("http://localhost:3000/api/cron/expire-sessions", {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
}

describe("GET /api/cron/expire-sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-secret";
    mockExpireStaleSessions.mockResolvedValue(3);
  });

  it("rejects requests without the cron bearer token", async () => {
    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(mockExpireStaleSessions).not.toHaveBeenCalled();
  });

  it("expires stale sessions when the cron bearer token is valid", async () => {
    const response = await GET(makeRequest("cron-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ expiredCount: 3 });
    expect(mockExpireStaleSessions).toHaveBeenCalledTimes(1);
  });
});
