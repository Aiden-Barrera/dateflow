import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../history-page", () => ({
  HistoryPage: ({
    initialTokenState,
  }: {
    initialTokenState: "present" | "missing";
  }) => `<div data-history-page="${initialTokenState}"></div>`,
}));

describe("/history page", () => {
  it("renders the history shell with a token-present initial state", async () => {
    const { default: HistoryRoute } = await import("../page");
    const page = await HistoryRoute();
    const html = renderToStaticMarkup(page);

    expect(html).toContain('data-history-page="present"');
  });
});
