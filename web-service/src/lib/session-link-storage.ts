import type { Role } from "./types/preference";

export const DATEFLOW_SESSION_LINK_KEY = "dateflow:session-link";

export type StoredSessionLink = {
  readonly sessionId: string;
  readonly role: Role;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function persistSessionLink(
  storage: StorageLike,
  value: StoredSessionLink,
): void {
  storage.setItem(DATEFLOW_SESSION_LINK_KEY, JSON.stringify(value));
}

export function loadStoredSessionLink(
  storage: StorageLike,
): StoredSessionLink | null {
  const raw = storage.getItem(DATEFLOW_SESSION_LINK_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);

    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.sessionId === "string" &&
      (parsed.role === "a" || parsed.role === "b")
    ) {
      return {
        sessionId: parsed.sessionId,
        role: parsed.role,
      };
    }
  } catch {
    storage.removeItem(DATEFLOW_SESSION_LINK_KEY);
    return null;
  }

  storage.removeItem(DATEFLOW_SESSION_LINK_KEY);
  return null;
}

export function clearStoredSessionLink(storage: StorageLike): void {
  storage.removeItem(DATEFLOW_SESSION_LINK_KEY);
}
