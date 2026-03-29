import type { Session, SessionStatus } from "../types/session";

/**
 * JSON-safe version of Session — Dates become ISO strings.
 * This is the shape the API returns and the frontend receives.
 */
export type SerializedSession = {
  readonly id: string;
  readonly status: SessionStatus;
  readonly creatorDisplayName: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly matchedVenueId: string | null;
};

/**
 * Converts a Session (with Date objects) into a JSON-safe format
 * (with ISO strings). Call this before returning a session from an API route.
 */
export function serializeSession(session: Session): SerializedSession {
  return {
    id: session.id,
    status: session.status,
    creatorDisplayName: session.creatorDisplayName,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    matchedVenueId: session.matchedVenueId,
  };
}
