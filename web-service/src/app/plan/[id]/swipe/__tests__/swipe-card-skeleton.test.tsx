import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { SwipeCardSkeleton } from "../swipe-card-skeleton";

describe("SwipeCardSkeleton", () => {
  it("renders an accessible loading status region", () => {
    const html = renderToStaticMarkup(<SwipeCardSkeleton />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Loading venue cards"');
  });

  it("renders the skeleton photo placeholder", () => {
    const html = renderToStaticMarkup(<SwipeCardSkeleton />);
    expect(html).toContain('data-testid="skeleton-photo"');
  });

  it("renders at least three skeleton content rows", () => {
    const html = renderToStaticMarkup(<SwipeCardSkeleton />);
    const matches = html.match(/data-testid="skeleton-row"/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });
});
