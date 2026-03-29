import type { ShareLink } from "../types/session";
import { validateSessionForJoin } from "./session-service";

/**
 * Constructs a ShareLink from a session ID and the app's base URL
 * (read from process.env.NEXT_PUBLIC_APP_URL).
 *
 * This is a pure function — no database call, no async. The URL format
 * is: {NEXT_PUBLIC_APP_URL}/plan/{sessionId}, which maps to the Next.js page where
 * Person B lands and enters their preferences.
 */
export function generateShareLink(
  sessionId: string,
  expiresAt: Date
): ShareLink {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_APP_URL — add it to .env.local (see .env.example)"
    );
  }

  return {
    sessionId,
    url: `${appUrl}/plan/${sessionId}`,
    expiresAt,
  };
}

/**
 * Checks whether a share link's session is still joinable.
 *
 * Returns true if the session exists, is in pending_b status, and hasn't
 * expired. Returns false for any other case (not found, wrong status, expired).
 */
export async function validateShareLink(sessionId: string): Promise<boolean> {
  try {
    await validateSessionForJoin(sessionId);
    return true;
  } catch {
    return false;
  }
}
