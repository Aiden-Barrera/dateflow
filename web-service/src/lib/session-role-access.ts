import type { Role } from "./types/preference";

const VALID_ROLES: readonly Role[] = ["a", "b"];

export function getSessionRoleCookieName(sessionId: string): string {
  return `dateflow_session_role_${encodeURIComponent(sessionId)}`;
}

export function buildSessionRoleCookieValue(
  sessionId: string,
  role: Role,
): string {
  return `${getSessionRoleCookieName(sessionId)}=${role}; Path=/; HttpOnly; SameSite=Lax`;
}

export function normalizeSessionRole(value: string | undefined): Role | null {
  if (VALID_ROLES.includes(value as Role)) {
    return value as Role;
  }

  return null;
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
    return normalizeSessionRole(value);
  }

  return null;
}
