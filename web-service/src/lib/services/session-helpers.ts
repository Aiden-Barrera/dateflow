import type { Session } from "../types/session";

/**
 * Application-level expiry check — returns true if the session's expiresAt
 * is at or before the current time.
 *
 * This is the secondary guard behind pg_cron. Even if the database hasn't
 * flipped the status to "expired" yet, this catches it in real time.
 */
export function isExpired(session: Session): boolean {
  return Date.now() >= session.expiresAt.getTime();
}
