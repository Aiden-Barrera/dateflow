import type { Role } from "./preference";

/**
 * A persisted like/pass decision for one venue in one session.
 * Each role can swipe once per venue; re-swipes update the same record.
 */
export type Swipe = {
  readonly id: string;
  readonly sessionId: string;
  readonly venueId: string;
  readonly role: Role;
  readonly liked: boolean;
  readonly createdAt: Date;
};

/**
 * Raw Supabase row shape for the swipes table.
 */
export type SwipeRow = {
  readonly id: string;
  readonly session_id: string;
  readonly venue_id: string;
  readonly role: Role;
  readonly liked: boolean;
  readonly created_at: string;
};

/**
 * Converts a raw swipes row into the app-level Swipe type.
 */
export function toSwipe(row: SwipeRow): Swipe {
  return {
    id: row.id,
    sessionId: row.session_id,
    venueId: row.venue_id,
    role: row.role,
    liked: row.liked,
    createdAt: new Date(row.created_at),
  };
}
