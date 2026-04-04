import { describe, expect, it } from "vitest";
import { getInviteReadySessionStatus } from "../person-a-flow";

describe("getInviteReadySessionStatus", () => {
  it("keeps neutral waiting states on the invite-ready screen", () => {
    expect(getInviteReadySessionStatus("pending_b")).toBe("pending_b");
    expect(getInviteReadySessionStatus("both_ready")).toBe("pending_b");
    expect(getInviteReadySessionStatus("generating")).toBe("pending_b");
    expect(getInviteReadySessionStatus("retry_pending")).toBe("pending_b");
    expect(getInviteReadySessionStatus("reranking")).toBe("pending_b");
  });

  it("promotes live progress into re-entry states", () => {
    expect(getInviteReadySessionStatus("ready_to_swipe")).toBe("ready_to_swipe");
    expect(getInviteReadySessionStatus("fallback_pending")).toBe("ready_to_swipe");
    expect(getInviteReadySessionStatus("matched")).toBe("matched");
  });

  it("preserves explicit terminal and failure states", () => {
    expect(getInviteReadySessionStatus("generation_failed")).toBe("generation_failed");
    expect(getInviteReadySessionStatus("expired")).toBe("expired");
    expect(getInviteReadySessionStatus("unknown_status")).toBe("pending_b");
  });
});
