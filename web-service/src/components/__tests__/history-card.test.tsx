import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { HistoryCard } from "../history-card";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { alt, src } = props;
    return `<img alt="${String(alt ?? "")}" src="${String(src ?? "")}" />`;
  },
}));

describe("HistoryCard", () => {
  it("renders a matched history entry with venue details and role label", () => {
    const html = renderToStaticMarkup(
      <HistoryCard
        session={{
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
        }}
      />,
    );

    expect(html).toContain("Cafe Blue");
    expect(html).toContain("You started this");
    expect(html).toContain("View result");
  });

  it("renders a non-matched history entry without venue imagery", () => {
    const html = renderToStaticMarkup(
      <HistoryCard
        session={{
          sessionId: "session-2",
          status: "expired",
          createdAt: "2026-04-12T18:00:00.000Z",
          role: "b",
          matchedVenue: null,
        }}
      />,
    );

    expect(html).toContain("Expired plan");
    expect(html).toContain("You joined this");
    expect(html).toContain("No match was saved from this round.");
  });
});
