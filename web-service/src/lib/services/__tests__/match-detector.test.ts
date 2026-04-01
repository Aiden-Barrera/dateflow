import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkAndRecordMatch } from "../match-detector";

const mockRpc = vi.fn();

vi.mock("../../supabase-server", () => ({
  getSupabaseServerClient: () => ({ rpc: mockRpc }),
}));

describe("checkAndRecordMatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the swipe RPC with the expected parameter names", async () => {
    mockRpc.mockResolvedValue({
      data: [{ matched: false, venue_id: null }],
      error: null,
    });

    await checkAndRecordMatch("session-123", "venue-456", "a", true);

    expect(mockRpc).toHaveBeenCalledWith("record_swipe_and_check_match", {
      input_session_id: "session-123",
      input_venue_id: "venue-456",
      input_role: "a",
      input_liked: true,
    });
  });

  it("maps a matched RPC response into the app-level result", async () => {
    mockRpc.mockResolvedValue({
      data: [{ matched: true, venue_id: "venue-456" }],
      error: null,
    });

    const result = await checkAndRecordMatch("session-123", "venue-456", "b", true);

    expect(result).toEqual({
      matched: true,
      venueId: "venue-456",
    });
  });

  it("maps an unmatched RPC response into the app-level result", async () => {
    mockRpc.mockResolvedValue({
      data: [{ matched: false, venue_id: null }],
      error: null,
    });

    const result = await checkAndRecordMatch(
      "session-123",
      "venue-456",
      "b",
      false,
    );

    expect(result).toEqual({
      matched: false,
      venueId: null,
    });
  });

  it("throws when the RPC returns an error", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "rpc failed" },
    });

    await expect(
      checkAndRecordMatch("session-123", "venue-456", "a", true),
    ).rejects.toThrow("rpc failed");
  });
});
