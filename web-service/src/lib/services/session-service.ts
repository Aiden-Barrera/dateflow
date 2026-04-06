import { getSupabaseServerClient } from "../supabase-server";
import { toSession, type Session, type SessionRow } from "../types/session";
import { isExpired } from "./session-helpers";

/** Supabase error code when .single() finds no matching row */
const NOT_FOUND_CODE = "PGRST116";

const MAX_DISPLAY_NAME_LENGTH = 50;
const HTML_TAG_PATTERN = /<[^>]*>/;

/**
 * Validates and sanitizes the creator display name.
 * Throws with a descriptive message if invalid.
 */
function validateDisplayName(raw: string): string {
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    throw new Error("Display name is required");
  }

  if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    throw new Error(
      `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer`
    );
  }

  if (HTML_TAG_PATTERN.test(trimmed)) {
    throw new Error("Display name must not contain HTML tags");
  }

  return trimmed;
}

export function sanitizeDisplayName(raw: string): string {
  return validateDisplayName(raw);
}

/**
 * Creates a new planning session.
 *
 * Inserts a row into the sessions table with status "pending_b" and a 48h
 * expiry (both set by database defaults). Returns the fully-mapped Session.
 */
export async function createSession(
  creatorDisplayName: string
): Promise<Session> {
  const name = validateDisplayName(creatorDisplayName);

  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("sessions")
    .insert({ creator_display_name: name })
    .select()
    .single<SessionRow>();

  if (error) {
    throw new Error(error.message);
  }

  return toSession(data);
}

export async function setInviteeDisplayName(
  sessionId: string,
  inviteeDisplayName: string,
): Promise<void> {
  const name = validateDisplayName(inviteeDisplayName);
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from("sessions")
    .update({ invitee_display_name: name })
    .eq("id", sessionId);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Retrieves a session by ID.
 *
 * Returns null if the session doesn't exist. Throws on unexpected DB errors.
 */
export async function getSession(id: string): Promise<Session | null> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("sessions")
    .select()
    .eq("id", id)
    .single<SessionRow>();

  if (error) {
    if (error.code === NOT_FOUND_CODE) {
      return null;
    }
    throw new Error(error.message);
  }

  return toSession(data);
}

/**
 * Retrieves a session and validates it's joinable by Person B.
 *
 * Throws if: session not found, status is not pending_b, or session is
 * past its expiresAt (even if pg_cron hasn't updated the status yet).
 */
export async function validateSessionForJoin(id: string): Promise<Session> {
  const session = await getSession(id);

  if (!session) {
    throw new Error("Session not found");
  }

  if (session.status !== "pending_b") {
    throw new Error("Session is not available to join");
  }

  if (isExpired(session)) {
    throw new Error("Session has expired");
  }

  return session;
}

/**
 * Marks all sessions past their expiresAt as "expired".
 *
 * Intended to be called on a schedule (e.g. pg_cron hourly). Skips sessions
 * that are already in a terminal state. Returns the number of rows updated.
 */
export async function expireStaleSessions(): Promise<number> {
  const supabase = getSupabaseServerClient();

  const { error, count } = await supabase
    .from("sessions")
    .update({ status: "expired" }, { count: "exact" })
    .neq("status", "expired")
    .neq("status", "matched")
    .lte("expires_at", new Date().toISOString());

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}
