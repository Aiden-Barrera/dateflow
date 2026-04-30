export type SwipeAdvanceStrategy =
  | "before_request"
  | "after_request_success"
  | "after_round_resolution";

export type SwipeAdvancePhase =
  | "before_request"
  | "after_request_success"
  | "after_round_resolution";

/**
 * Within a loaded round, the next venues are already present in client state,
 * so advance immediately for a responsive handoff. The final card still waits
 * for round resolution because the next UI may be a new round, fallback, or a
 * waiting state rather than another in-round venue.
 */
export function getSwipeAdvanceStrategy(
  hasNextVenue: boolean,
): SwipeAdvanceStrategy {
  return hasNextVenue ? "before_request" : "after_round_resolution";
}

export function shouldAdvanceSwipeCard(
  strategy: SwipeAdvanceStrategy,
  phase: SwipeAdvancePhase,
): boolean {
  return strategy === phase;
}
