import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "../button";

describe("Button", () => {
  it("renders focus-visible and hover-safe motion classes", () => {
    const html = renderToStaticMarkup(<Button>Press me</Button>);

    expect(html).toContain("focus-visible:outline-primary");
    expect(html).toContain("motion-safe:-translate-y-0.5");
    expect(html).not.toContain("active:scale-[0.98]");
  });
});
