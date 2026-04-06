import { describe, it, expect } from "vitest";
import { toSession } from "../session";
import type { SessionRow } from "../session";

describe("toSession", () => {
  const baseRow: SessionRow = {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    status: "pending_b",
    creator_display_name: "Alex",
    invitee_display_name: null,
    created_at: "2026-03-27T12:00:00Z",
    expires_at: "2026-03-29T12:00:00Z",
    matched_venue_id: null,
    matched_at: null,
  };

  it("maps snake_case row fields to camelCase Session fields", () => {
    const session = toSession(baseRow);

    expect(session.id).toBe(baseRow.id);
    expect(session.status).toBe(baseRow.status);
    expect(session.creatorDisplayName).toBe(baseRow.creator_display_name);
    expect(session.inviteeDisplayName).toBeNull();
    expect(session.matchedVenueId).toBe(baseRow.matched_venue_id);
  });

  it("converts ISO date strings to Date objects", () => {
    const session = toSession(baseRow);

    expect(session.createdAt).toBeInstanceOf(Date);
    expect(session.expiresAt).toBeInstanceOf(Date);
    expect(session.createdAt.toISOString()).toBe("2026-03-27T12:00:00.000Z");
    expect(session.expiresAt.toISOString()).toBe("2026-03-29T12:00:00.000Z");
  });

  it("preserves null matchedVenueId", () => {
    const session = toSession(baseRow);

    expect(session.matchedVenueId).toBeNull();
  });

  it("passes through a non-null matchedVenueId", () => {
    const rowWithVenue: SessionRow = {
      ...baseRow,
      matched_venue_id: "venue-abc-123",
      matched_at: "2026-03-28T13:00:00Z",
    };
    const session = toSession(rowWithVenue);

    expect(session.matchedVenueId).toBe("venue-abc-123");
    expect(session.matchedAt?.toISOString()).toBe("2026-03-28T13:00:00.000Z");
  });

  it("passes through a non-null invitee display name", () => {
    const session = toSession({
      ...baseRow,
      invitee_display_name: "Jordan",
    });

    expect(session.inviteeDisplayName).toBe("Jordan");
  });
});
