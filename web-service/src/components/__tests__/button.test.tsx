import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "../button";

describe("Button", () => {
  it("renders focus-visible and hover-safe motion classes", () => {
    const html = renderToStaticMarkup(<Button>Press me</Button>);

    expect(html).toContain("focus-visible:outline-white/80");
    expect(html).toContain("motion-safe:hover:-translate-y-0.5");
    expect(html).not.toContain("active:scale-[0.98]");
  });
});
