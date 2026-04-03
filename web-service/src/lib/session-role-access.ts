import { createHmac, timingSafeEqual } from "node:crypto";
import type { Role } from "./types/preference";

const VALID_ROLES: readonly Role[] = ["a", "b"];
const FALLBACK_COOKIE_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSessionRoleCookieSecret(): string | null {
  return process.env.SESSION_ROLE_COOKIE_SECRET ?? FALLBACK_COOKIE_SECRET ?? null;
}

function signSessionRole(sessionId: string, role: Role): string | null {
  const secret = getSessionRoleCookieSecret();

  if (!secret) {
    return null;
  }

  return createHmac("sha256", secret)
    .update(`${sessionId}:${role}`)
    .digest("base64url");
}

export function getSessionRoleCookieName(sessionId: string): string {
  return `dateflow_session_role_${encodeURIComponent(sessionId)}`;
}

export function buildSessionRoleCookieValue(
  sessionId: string,
  role: Role,
): string {
  const secureAttribute =
    process.env.NODE_ENV === "production" ? "; Secure" : "";
  const signature = signSessionRole(sessionId, role);

  if (!signature) {
    throw new Error("Session role cookie secret is not configured");
  }

  return `${getSessionRoleCookieName(sessionId)}=${role}.${signature}; Path=/; HttpOnly; SameSite=Lax${secureAttribute}`;
}

export function getBoundSessionRole(
  sessionId: string,
  value: string | undefined,
): Role | null {
  if (!value) {
    return null;
  }

  const [roleValue, signature] = value.split(".");
  if (!signature || !VALID_ROLES.includes(roleValue as Role)) {
    return null;
  }

  const expectedSignature = signSessionRole(sessionId, roleValue as Role);
  if (!expectedSignature) {
    return null;
  }

  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length) {
    return null;
  }

  if (!timingSafeEqual(received, expected)) {
    return null;
  }

  return roleValue as Role;
}

export function readBoundSessionRole(
  sessionId: string,
  cookieHeader: string | null,
): Role | null {
  if (!cookieHeader) {
    return null;
  }

  const cookieName = getSessionRoleCookieName(sessionId);
  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const [rawName, ...rawValueParts] = cookie.trim().split("=");

    if (rawName !== cookieName) {
      continue;
    }

    const value = rawValueParts.join("=");
    return getBoundSessionRole(sessionId, value);
  }

  return null;
}
