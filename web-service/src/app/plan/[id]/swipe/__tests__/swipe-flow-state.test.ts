import { describe, expect, it } from "vitest";
import { getResumeVenueIndex, getSwipeFlowStatusState } from "../swipe-flow-state";

describe("getSwipeFlowStatusState", () => {
  it("maps fallback_pending into the dedicated no-match fallback state", () => {
    expect(getSwipeFlowStatusState("fallback_pending")).toEqual({
      kind: "fallback",
    });
  });

  it("keeps generation states in the waiting flow", () => {
    expect(getSwipeFlowStatusState("generating")).toEqual({
      kind: "waiting",
      stage: "generation",
      message: "Both sides are in. Dateflow is shaping the first shortlist now.",
    });
  });

  it("treats retry_pending as another shortlist refresh state", () => {
    expect(getSwipeFlowStatusState("retry_pending")).toEqual({
      kind: "waiting",
      stage: "generation",
      message: "Dateflow is reworking the shortlist with your new mix now.",
    });
  });
});

describe("getResumeVenueIndex", () => {
  it("returns the first venue index the viewer has not swiped yet", () => {
    expect(
      getResumeVenueIndex(
        [
          { id: "venue-1" },
          { id: "venue-2" },
          { id: "venue-3" },
        ],
        ["venue-1", "venue-2"],
      ),
    ).toBe(2);
  });

  it("returns the final venue index when every venue was already swiped", () => {
    expect(
      getResumeVenueIndex(
        [
          { id: "venue-1" },
          { id: "venue-2" },
        ],
        ["venue-1", "venue-2"],
      ),
    ).toBe(1);
  });
});
