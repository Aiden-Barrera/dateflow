import { getSupabaseClient } from "./supabase";
import { SESSION_STATUS_POLL_INTERVAL_MS } from "./swipe-config";

type SessionRowUpdate = {
  status?: string;
  matched_venue_id?: string | null;
  matchedVenueId?: string | null;
};

type ChannelStatus =
  | "SUBSCRIBED"
  | "TIMED_OUT"
  | "CHANNEL_ERROR"
  | "CLOSED";

export type SessionStatusSnapshot = {
  readonly status: string;
  readonly matchedVenueId: string | null;
  readonly currentRound?: number;
  readonly roundComplete?: boolean;
};

type SessionStatusSyncOptions = {
  readonly fetchStatus?: () => Promise<SessionStatusSnapshot>;
  readonly pollIntervalMs?: number;
};

type SessionStatusSync = {
  stop(): void;
};

export function createSessionStatusSync(
  sessionId: string,
  onUpdate: (snapshot: SessionStatusSnapshot) => void,
  options: SessionStatusSyncOptions = {},
): SessionStatusSync {
  const supabase = getSupabaseClient();
  const fetchStatus = options.fetchStatus ?? (() => fetchSessionStatus(sessionId));
  const pollIntervalMs =
    options.pollIntervalMs ?? SESSION_STATUS_POLL_INTERVAL_MS;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const startPolling = () => {
    if (pollTimer) {
      return;
    }

    pollTimer = setInterval(async () => {
      const snapshot = await fetchStatus();
      onUpdate(snapshot);
    }, pollIntervalMs);
  };

  const stopPolling = () => {
    if (!pollTimer) {
      return;
    }

    clearInterval(pollTimer);
    pollTimer = null;
  };

  const baseChannel = supabase.channel(`session-status:${sessionId}`);
  const channel = baseChannel
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "sessions",
        filter: `id=eq.${sessionId}`,
      },
      (payload: { new: SessionRowUpdate }) => {
        onUpdate({
          status: payload.new.status ?? "ready_to_swipe",
          matchedVenueId:
            payload.new.matched_venue_id ?? payload.new.matchedVenueId ?? null,
        });
      },
    );

  channel.subscribe((status: ChannelStatus) => {
      if (status === "SUBSCRIBED") {
        stopPolling();
        return;
      }

      if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        startPolling();
      }
    });

  return {
    stop() {
      stopPolling();
      const unsubscribable =
        typeof channel.unsubscribe === "function" ? channel : baseChannel;
      unsubscribable.unsubscribe();
    },
  };
}

async function fetchSessionStatus(
  sessionId: string,
): Promise<SessionStatusSnapshot> {
  const response = await fetch(`/api/sessions/${sessionId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch session status for ${sessionId}`);
  }

  const payload = (await response.json()) as {
    session: {
      status: string;
      matchedVenueId: string | null;
    };
  };

  return {
    status: payload.session.status,
    matchedVenueId: payload.session.matchedVenueId,
  };
}
