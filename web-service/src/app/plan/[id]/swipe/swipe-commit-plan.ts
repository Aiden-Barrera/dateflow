export type SwipeCommitPlan = {
  readonly advanceBeforeRequest: boolean;
  readonly awaitRequestInGesture: boolean;
};

export function getSwipeCommitPlan(
  hasNextVenue: boolean,
): SwipeCommitPlan {
  if (hasNextVenue) {
    return {
      advanceBeforeRequest: true,
      awaitRequestInGesture: false,
    };
  }

  return {
    advanceBeforeRequest: false,
    awaitRequestInGesture: true,
  };
}
