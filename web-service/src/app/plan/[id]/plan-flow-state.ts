import type { SessionStatusSnapshot } from "../../../lib/session-status-sync";

export type PlanFlowSyncAction =
  | { readonly type: "stay" }
  | { readonly type: "redirect"; readonly href: string }
  | { readonly type: "error"; readonly message: string };

export function getPlanFlowSyncAction(
  snapshot: SessionStatusSnapshot,
  sessionId: string,
  options: { readonly demoMode?: boolean } = {},
): PlanFlowSyncAction {
  if (snapshot.status === "matched") {
    return {
      type: "redirect",
      href: `/plan/${sessionId}/results`,
    };
  }

  if (snapshot.status === "ready_to_swipe") {
    return {
      type: "redirect",
      href: `/plan/${sessionId}/swipe${options.demoMode ? "?demo=1" : ""}`,
    };
  }

  if (snapshot.status === "expired") {
    return {
      type: "error",
      message: "This session expired before the result was ready.",
    };
  }

  if (snapshot.status === "generation_failed") {
    return {
      type: "error",
      message:
        "We couldn't finish venue generation. Please retry in a moment or start a new session if the problem keeps happening.",
    };
  }

  return { type: "stay" };
}
