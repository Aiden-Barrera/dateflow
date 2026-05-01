import { describe, expect, it } from "vitest";
import {
  getSwipeAdvanceStrategy,
  shouldAdvanceSwipeCard,
} from "../swipe-advance";

describe("getSwipeAdvanceStrategy", () => {
  it("advances within-round swipes immediately because the next venue is already loaded", () => {
    expect(getSwipeAdvanceStrategy(true)).toBe("before_request");
  });

  it("keeps the last card in place while the round result resolves", () => {
    expect(getSwipeAdvanceStrategy(false)).toBe("after_round_resolution");
  });
});

describe("shouldAdvanceSwipeCard", () => {
  it("does not advance a within-round swipe before the request succeeds", () => {
    expect(
      shouldAdvanceSwipeCard("after_request_success", "before_request"),
    ).toBe(false);
  });

  it("advances an optimistic within-round swipe before the request starts", () => {
    expect(
      shouldAdvanceSwipeCard("before_request", "before_request"),
    ).toBe(true);
  });

  it("advances a within-round swipe once the request succeeds", () => {
    expect(
      shouldAdvanceSwipeCard("after_request_success", "after_request_success"),
    ).toBe(true);
  });

  it("waits for round resolution before advancing the final card", () => {
    expect(
      shouldAdvanceSwipeCard("after_round_resolution", "after_request_success"),
    ).toBe(false);
    expect(
      shouldAdvanceSwipeCard("after_round_resolution", "after_round_resolution"),
    ).toBe(true);
  });
});
