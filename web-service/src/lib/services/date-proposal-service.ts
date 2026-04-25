/**
 * Date/time proposal and confirmation service (DS-07D).
 *
 * Handles the real-time coordination when both users agree on a meeting time
 * for a static venue match. Live events (Ticketmaster) already have a known
 * scheduledAt and do not need this flow.
 *
 * Real-time channel message types:
 *   DateProposedEvent  — Person A (or B) proposes a time
 *   DateConfirmedEvent — Both have agreed; written to the DB
 *
 * The channel name follows the same convention as session-status-sync:
 *   `session-date-proposal:<sessionId>`
 */

import { getSupabaseServerClient } from "../supabase-server";

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

// ─── Server-side: write confirmation to DB ───────────────────────────────────

/**
 * Writes `confirmed_date_time` to the sessions table.
 * Called server-side after both users agree on a time.
 */
export async function confirmDate(
  sessionId: string,
  confirmedAt: Date,
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("sessions")
    .update({ confirmed_date_time: confirmedAt.toISOString() })
    .eq("id", sessionId);

  if (error) {
    throw new Error(error.message);
  }
}
