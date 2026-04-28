export type WaitingStage =
  | "preferences"
  | "generation"
  | "round"
  | "retry_confirmation"
  | "accept_confirmation"
  | "session";

export type SwipeFlowStatusState =
  | {
      readonly kind: "waiting";
      readonly stage: WaitingStage;
      readonly message: string;
    }
  | {
      readonly kind: "fallback";
    };

export function getSwipeFlowStatusState(status: string): SwipeFlowStatusState {
  if (status === "pending_b") {
    return {
      kind: "waiting",
      stage: "preferences",
      message:
        "Your partner still has a few quick preferences to share before the deck can open.",
    };
  }

  if (status === "both_ready" || status === "generating") {
    return {
      kind: "waiting",
      stage: "generation",
      message: "Both sides are in. Dateflow is shaping the first shortlist now.",
    };
  }

  if (status === "retry_pending" || status === "reranking") {
    return {
      kind: "waiting",
      stage: "generation",
      message: "Dateflow is reworking the shortlist with your new mix now.",
    };
  }

  if (status === "fallback_pending") {
    return {
      kind: "fallback",
    };
  }

  return {
    kind: "waiting",
    stage: "session",
    message:
      "This session is not ready for swiping yet, but we are still watching for updates.",
  };
}

export function getResumeVenueIndex(
  venues: readonly { readonly id: string }[],
  swipedVenueIds: readonly string[],
): number {
  if (venues.length === 0) {
    return 0;
  }

  const swiped = new Set(swipedVenueIds);
  const firstUnswipedIndex = venues.findIndex((venue) => !swiped.has(venue.id));

  return firstUnswipedIndex === -1 ? venues.length - 1 : firstUnswipedIndex;
}
