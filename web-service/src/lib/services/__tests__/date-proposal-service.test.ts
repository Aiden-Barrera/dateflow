import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Supabase mock ────────────────────────────────────────────────────────────

const mockUpdate = vi.fn();
const mockEq = vi.fn(() => ({ error: null }));
mockUpdate.mockReturnValue({ eq: mockEq });

const mockFrom = vi.fn(() => ({ update: mockUpdate }));

vi.mock("../../supabase-server", () => ({
  getSupabaseServerClient: () => ({ from: mockFrom }),
}));

import {
  confirmDate,
  type DateProposedEvent,
  type DateConfirmedEvent,
} from "../date-proposal-service";

describe("date-proposal-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ error: null });
    mockFrom.mockReturnValue({ update: mockUpdate });
  });

  describe("confirmDate", () => {
    it("writes confirmed_date_time to the sessions table", async () => {
      const confirmedAt = new Date("2026-05-04T20:00:00Z");

      await confirmDate("session-abc", confirmedAt);

      expect(mockFrom).toHaveBeenCalledWith("sessions");
      expect(mockUpdate).toHaveBeenCalledWith({
        confirmed_date_time: confirmedAt.toISOString(),
      });
      expect(mockEq).toHaveBeenCalledWith("id", "session-abc");
    });

    it("throws when the DB update fails", async () => {
      mockEq.mockReturnValue({ error: { message: "DB error" } });

      await expect(
        confirmDate("session-abc", new Date("2026-05-04T20:00:00Z")),
      ).rejects.toThrow("DB error");
    });
  });

  describe("event type shapes", () => {
    it("DateProposedEvent has correct type literal and fields", () => {
      const event: DateProposedEvent = {
        type: "date_proposed",
        proposedBy: "a",
        dateTime: "2026-05-04T20:00:00Z",
      };
      expect(event.type).toBe("date_proposed");
      expect(event.proposedBy).toBe("a");
    });

    it("DateConfirmedEvent has correct type literal and field", () => {
      const event: DateConfirmedEvent = {
        type: "date_confirmed",
        confirmedAt: "2026-05-04T20:00:00Z",
      };
      expect(event.type).toBe("date_confirmed");
    });
  });
});
