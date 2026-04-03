import { describe, expect, it } from "vitest";
import { getPlanFlowSyncAction } from "../plan-flow-state";

describe("getPlanFlowSyncAction", () => {
  it("redirects matched sessions to the result page", () => {
    expect(
      getPlanFlowSyncAction(
        {
          status: "matched",
          matchedVenueId: "venue-12",
        },
        "session-1",
      ),
    ).toEqual({
      type: "redirect",
      href: "/plan/session-1/results",
    });
  });

  it("redirects ready sessions into the swipe deck", () => {
    expect(
      getPlanFlowSyncAction(
        {
          status: "ready_to_swipe",
          matchedVenueId: null,
          currentRound: 1,
        },
        "session-1",
        { demoMode: true },
      ),
    ).toEqual({
      type: "redirect",
      href: "/plan/session-1/swipe?role=b&demo=1",
    });
  });

  it("keeps loading for non-terminal generation states", () => {
    expect(
      getPlanFlowSyncAction(
        {
          status: "generating",
          matchedVenueId: null,
        },
        "session-1",
      ),
    ).toEqual({
      type: "stay",
    });
  });
});
