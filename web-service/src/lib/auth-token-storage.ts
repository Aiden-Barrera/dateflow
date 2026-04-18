export const DATEFLOW_AUTH_TOKEN_KEY = "dateflow:auth-token";
export const DATEFLOW_ACCOUNT_SUMMARY_KEY = "dateflow:account-summary";

export type StoredAccountSummary = {
  readonly email: string;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function setStoredAuthToken(storage: StorageLike, token: string): void {
  storage.setItem(DATEFLOW_AUTH_TOKEN_KEY, token);
}

export function getStoredAuthToken(storage: StorageLike): string | null {
  return storage.getItem(DATEFLOW_AUTH_TOKEN_KEY);
}

export function clearStoredAuthToken(storage: StorageLike): void {
  storage.removeItem(DATEFLOW_AUTH_TOKEN_KEY);
}

export function setStoredAccountSummary(
  storage: StorageLike,
  summary: StoredAccountSummary,
): void {
  storage.setItem(DATEFLOW_ACCOUNT_SUMMARY_KEY, JSON.stringify(summary));
}

export function getStoredAccountSummary(
  storage: StorageLike,
): StoredAccountSummary | null {
  const raw = storage.getItem(DATEFLOW_ACCOUNT_SUMMARY_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);

    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.email === "string"
    ) {
      return { email: parsed.email };
    }
  } catch {
    storage.removeItem(DATEFLOW_ACCOUNT_SUMMARY_KEY);
    return null;
  }

  storage.removeItem(DATEFLOW_ACCOUNT_SUMMARY_KEY);
  return null;
}

export function clearStoredAccountSummary(storage: StorageLike): void {
  storage.removeItem(DATEFLOW_ACCOUNT_SUMMARY_KEY);
}
