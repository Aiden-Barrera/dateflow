import type { SessionAccountRole } from "../../lib/types/account";

export function getHistoryRoleLabel(role: SessionAccountRole): string {
  return role === "a" ? "You started this" : "You joined this";
}

export function getHistoryFilterLabel(includeAll: boolean): string {
  return includeAll ? "All activity" : "Matches";
}

export function extractOAuthAccessToken(url: string): string | null {
  const parsed = new URL(url);
  const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
  const params = new URLSearchParams(hash);
  const token = params.get("access_token");

  return token && token.length > 0 ? token : null;
}

export function shouldShowLoadMore(input: {
  readonly page: number;
  readonly totalPages: number;
}): boolean {
  return input.page < input.totalPages;
}
