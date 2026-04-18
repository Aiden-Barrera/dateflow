import { beforeEach, describe, expect, it, vi } from "vitest";
import { linkSessionToAccount } from "../session-history-service";

const mockInsert = vi.fn();
const mockFrom = vi.fn(() => ({ insert: mockInsert }));

vi.mock("../../supabase-server", () => ({
  getSupabaseServerClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

describe("session-history-service linkSessionToAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
  });

  it("creates a session_accounts row for the authenticated account", async () => {
    await linkSessionToAccount("session-1", "account-1", "b");

    expect(mockFrom).toHaveBeenCalledWith("session_accounts");
    expect(mockInsert).toHaveBeenCalledWith({
      session_id: "session-1",
      account_id: "account-1",
      role: "b",
    });
  });

  it("throws when the join insert fails", async () => {
    mockInsert.mockResolvedValue({
      error: { message: "insert failed" },
    });

    await expect(
      linkSessionToAccount("session-1", "account-1", "a"),
    ).rejects.toThrow("insert failed");
  });
});
