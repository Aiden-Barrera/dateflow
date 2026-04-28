import { describe, expect, it } from "vitest";
import { getSwipeAdvanceStrategy } from "../swipe-advance";

describe("getSwipeAdvanceStrategy", () => {
  it("waits for the swipe request to succeed before advancing to the next card", () => {
    expect(getSwipeAdvanceStrategy(true)).toBe("after_request_success");
  });

  it("keeps the last card in place while the round result resolves", () => {
    expect(getSwipeAdvanceStrategy(false)).toBe("after_round_resolution");
  });
});
