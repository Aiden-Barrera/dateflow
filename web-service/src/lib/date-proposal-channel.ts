/**
 * Client-safe channel helpers for the date-proposal realtime flow (DS-07D).
 *
 * Contains only types and the channel-name helper — no server-only imports.
 * Safe to import from client components and server code alike.
 *
 * Server-only operations (writing to the DB) live in:
 *   src/lib/services/date-proposal-service.ts
 */

// ─── Channel event shapes ─────────────────────────────────────────────────────

/** Broadcast when one user proposes a meeting time. */
export type DateProposedEvent = {
  readonly type: "date_proposed";
  /** Which role proposed ("a" | "b"). */
  readonly proposedBy: "a" | "b";
  /** ISO 8601 string for the proposed date/time. */
  readonly dateTime: string;
};

/** Broadcast when both users have confirmed the same time. */
export type DateConfirmedEvent = {
  readonly type: "date_confirmed";
  /** ISO 8601 string for the confirmed date/time. */
  readonly confirmedAt: string;
};

export type DateProposalChannelEvent = DateProposedEvent | DateConfirmedEvent;

// ─── Channel name helper ──────────────────────────────────────────────────────

export function getDateProposalChannelName(sessionId: string): string {
  return `session-date-proposal:${sessionId}`;
}
