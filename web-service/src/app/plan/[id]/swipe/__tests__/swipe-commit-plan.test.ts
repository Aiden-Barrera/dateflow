import { describe, expect, it } from "vitest";
import { getSwipeCommitPlan } from "../swipe-commit-plan";

describe("getSwipeCommitPlan", () => {
  it("optimistically advances within a round and lets the request finish in the background", () => {
    expect(getSwipeCommitPlan(true)).toEqual({
      advanceBeforeRequest: true,
      awaitRequestInGesture: false,
    });
  });

  it("keeps the final card tied to round resolution", () => {
    expect(getSwipeCommitPlan(false)).toEqual({
      advanceBeforeRequest: false,
      awaitRequestInGesture: true,
    });
  });
});
