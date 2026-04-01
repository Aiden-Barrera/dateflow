import { describe, expect, it } from "vitest";
import { toSwipe } from "../swipe";
import type { SwipeRow } from "../swipe";

describe("toSwipe", () => {
  const baseRow: SwipeRow = {
    id: "swipe-abc-123",
    session_id: "session-xyz-456",
    venue_id: "venue-def-789",
    role: "a",
    liked: true,
    created_at: "2026-04-01T14:30:00Z",
  };

  it("maps snake_case row fields to camelCase Swipe fields", () => {
    const swipe = toSwipe(baseRow);

    expect(swipe.id).toBe(baseRow.id);
    expect(swipe.sessionId).toBe(baseRow.session_id);
    expect(swipe.venueId).toBe(baseRow.venue_id);
    expect(swipe.role).toBe(baseRow.role);
    expect(swipe.liked).toBe(baseRow.liked);
  });

  it("converts created_at string to a Date object", () => {
    const swipe = toSwipe(baseRow);

    expect(swipe.createdAt).toBeInstanceOf(Date);
    expect(swipe.createdAt.toISOString()).toBe("2026-04-01T14:30:00.000Z");
  });
});
