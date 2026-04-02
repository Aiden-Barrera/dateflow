import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionStatusSync, type SessionStatusSnapshot } from "../session-status-sync";

const mockSubscribe = vi.fn();
const mockOn = vi.fn();
const mockUnsubscribe = vi.fn();
const mockChannel = vi.fn(() => ({
  on: mockOn,
  subscribe: mockSubscribe,
  unsubscribe: mockUnsubscribe,
}));

vi.mock("../supabase", () => ({
  getSupabaseClient: () => ({ channel: mockChannel }),
}));

describe("createSessionStatusSync", () => {
  const fetchStatus = vi.fn<() => Promise<SessionStatusSnapshot>>();
  const onUpdate = vi.fn<(snapshot: SessionStatusSnapshot) => void>();
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.stubGlobal("fetch", fetchMock);
    mockOn.mockReturnValue({ subscribe: mockSubscribe });
    fetchStatus.mockResolvedValue({
      status: "ready_to_swipe",
      matchedVenueId: null,
      currentRound: 1,
      roundComplete: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("forwards realtime session updates from the Supabase channel", () => {
    createSessionStatusSync("session-1", onUpdate, { fetchStatus });

    const realtimeHandler = mockOn.mock.calls[0][2];
    realtimeHandler({
      new: {
        status: "matched",
        matched_venue_id: "venue-9",
      },
    });

    expect(onUpdate).toHaveBeenCalledWith({
      status: "matched",
      matchedVenueId: "venue-9",
    });
  });

  it("starts 5-second polling when the realtime channel closes", async () => {
    createSessionStatusSync("session-1", onUpdate, { fetchStatus });

    const lifecycleHandler = mockSubscribe.mock.calls[0][0];
    lifecycleHandler("CHANNEL_ERROR");

    await vi.advanceTimersByTimeAsync(5000);

    expect(fetchStatus).toHaveBeenCalledOnce();
    expect(onUpdate).toHaveBeenCalledWith({
      status: "ready_to_swipe",
      matchedVenueId: null,
      currentRound: 1,
      roundComplete: false,
    });
  });

  it("cleans up the realtime channel and polling interval", async () => {
    const sync = createSessionStatusSync("session-1", onUpdate, { fetchStatus });

    const lifecycleHandler = mockSubscribe.mock.calls[0][0];
    lifecycleHandler("TIMED_OUT");
    await vi.advanceTimersByTimeAsync(5000);

    sync.stop();
    await vi.advanceTimersByTimeAsync(5000);

    expect(mockUnsubscribe).toHaveBeenCalledOnce();
    expect(fetchStatus).toHaveBeenCalledOnce();
  });

  it("polls the existing session route when no custom fetchStatus is provided", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        session: {
          status: "matched",
          matchedVenueId: "venue-4",
        },
      }),
    });

    createSessionStatusSync("session-1", onUpdate);

    const lifecycleHandler = mockSubscribe.mock.calls[0][0];
    lifecycleHandler("CHANNEL_ERROR");
    await vi.advanceTimersByTimeAsync(5000);

    expect(fetchMock).toHaveBeenCalledWith("/api/sessions/session-1");
  });
});
