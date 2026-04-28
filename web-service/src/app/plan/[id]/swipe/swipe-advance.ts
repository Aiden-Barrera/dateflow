export type SwipeAdvanceStrategy =
  | "after_request_success"
  | "after_round_resolution";

/**
 * Within a round, keep the current card mounted until its swipe request
 * succeeds. Otherwise the parent swaps in the next venue under the in-flight
 * spring animation and the outgoing card appears to disappear instead of
 * flying off-screen.
 */
export function getSwipeAdvanceStrategy(
  hasNextVenue: boolean,
): SwipeAdvanceStrategy {
  return hasNextVenue ? "after_request_success" : "after_round_resolution";
}
