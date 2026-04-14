import type { SessionHistoryPage } from "./services/session-history-service";

type FetchHistoryOptions = {
  readonly includeAll?: boolean;
  readonly page?: number;
  readonly pageSize?: number;
};

export async function fetchHistory(
  token: string,
  options: FetchHistoryOptions = {},
): Promise<SessionHistoryPage> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 10;
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (options.includeAll) {
    query.set("includeAll", "true");
  }

  const response = await fetch(`/api/sessions/history?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = (await response.json()) as SessionHistoryPage & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to load history");
  }

  return payload;
}
