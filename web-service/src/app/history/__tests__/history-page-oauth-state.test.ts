import { describe, expect, it } from "vitest";
import {
  extractOAuthAccessToken,
  shouldShowLoadMore,
} from "../history-page-state";

describe("history-page oauth and pagination state", () => {
  it("extracts an access token from an OAuth hash fragment", () => {
    expect(
      extractOAuthAccessToken(
        "https://dateflow.app/history#access_token=token-123&refresh_token=token-456",
      ),
    ).toBe("token-123");
  });

  it("returns null when no access token is present in the URL", () => {
    expect(
      extractOAuthAccessToken("https://dateflow.app/history?foo=bar"),
    ).toBeNull();
  });

  it("shows load more only when another page exists", () => {
    expect(shouldShowLoadMore({ page: 1, totalPages: 3 })).toBe(true);
    expect(shouldShowLoadMore({ page: 3, totalPages: 3 })).toBe(false);
  });
});
