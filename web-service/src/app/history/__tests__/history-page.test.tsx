import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HistoryPage } from "../history-page";

describe("HistoryPage", () => {
  it("renders a sign-in state when no auth token is available", () => {
    const html = renderToStaticMarkup(
      <HistoryPage
        initialTokenState="missing"
        initialHistory={null}
      />,
    );

    expect(html).toContain("Sign in to view your saved dates");
  });

  it("renders an empty state when the account has no saved history yet", () => {
    const html = renderToStaticMarkup(
      <HistoryPage
        initialTokenState="present"
        initialHistory={{
          sessions: [],
          page: 1,
          pageSize: 10,
          totalCount: 0,
          totalPages: 0,
        }}
      />,
    );

    expect(html).toContain("No saved dates yet");
    expect(html).toContain("Matches");
    expect(html).toContain("All activity");
  });

  it("renders populated history cards when sessions exist", () => {
    const html = renderToStaticMarkup(
      <HistoryPage
        initialTokenState="present"
        initialAccountEmail="alex@example.com"
        initialHistory={{
          sessions: [
            {
              sessionId: "session-1",
              status: "matched",
              createdAt: "2026-04-13T19:00:00.000Z",
              role: "a",
              matchedVenue: {
                name: "Cafe Blue",
                category: "RESTAURANT",
                address: "12 Main St, Austin, TX",
                photoUrl: "https://example.com/photo.jpg",
              },
            },
          ],
          page: 1,
          pageSize: 10,
          totalCount: 1,
          totalPages: 1,
        }}
      />,
    );

    expect(html).toContain("Saved dates");
    expect(html).toContain("Cafe Blue");
    expect(html).toContain("alex@example.com");
  });

  it("renders a load-more action when more history pages exist", () => {
    const html = renderToStaticMarkup(
      <HistoryPage
        initialTokenState="present"
        initialAccountEmail="alex@example.com"
        initialHistory={{
          sessions: [
            {
              sessionId: "session-1",
              status: "matched",
              createdAt: "2026-04-13T19:00:00.000Z",
              role: "a",
              matchedVenue: {
                name: "Cafe Blue",
                category: "RESTAURANT",
                address: "12 Main St, Austin, TX",
                photoUrl: "https://example.com/photo.jpg",
              },
            },
          ],
          page: 1,
          pageSize: 10,
          totalCount: 12,
          totalPages: 2,
        }}
      />,
    );

    expect(html).toContain("Load more");
  });
});
