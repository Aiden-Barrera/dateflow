/**
 * Server-only date-proposal service (DS-07D).
 *
 * Exposes `confirmDate` which writes `confirmed_date_time` to the sessions table.
 * This module imports `getSupabaseServerClient` and must NEVER be imported by
 * client components.
 *
 * Shared types and the channel-name helper live in the client-safe module:
 *   src/lib/date-proposal-channel.ts
 */

import { getSupabaseServerClient } from "../supabase-server";

// Re-export the shared types so server-side callers can import from one place.
export type {
  DateProposedEvent,
  DateConfirmedEvent,
  DateProposalChannelEvent,
} from "../date-proposal-channel";
export { getDateProposalChannelName } from "../date-proposal-channel";

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
