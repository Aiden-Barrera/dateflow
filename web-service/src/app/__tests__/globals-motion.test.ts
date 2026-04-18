import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("globals.css motion system", () => {
  const css = readFileSync(
    resolve(process.cwd(), "src/app/globals.css"),
    "utf8",
  );

  it("includes auth sheet and save prompt keyframes", () => {
    expect(css).toContain("@keyframes authSheetEnter");
    expect(css).toContain("@keyframes savePromptReveal");
  });

  it("includes a reduced-motion fallback block", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation-duration: 1ms");
  });
});
