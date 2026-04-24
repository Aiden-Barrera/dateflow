import { getSupabaseClient } from "./supabase";
import { SESSION_STATUS_POLL_INTERVAL_MS } from "./swipe-config";
import type { BudgetLevel, Category, Role } from "./types/preference";

type SessionRowUpdate = {
  status?: string;
  matched_venue_id?: string | null;
  matchedVenueId?: string | null;
};

export type SessionStatusSnapshot = {
  readonly status: string;
  readonly matchedVenueId: string | null;
  readonly currentRound?: number;
  readonly roundComplete?: boolean;
  readonly retryWaitingForPartner?: boolean;
  readonly retryState?: {
    readonly initiatorRole: Role;
    readonly viewerRole: Role;
    readonly viewerHasConfirmed: boolean;
    readonly partnerHasConfirmed: boolean;
    readonly initiatedByPartner: boolean;
    readonly viewerPreferences?: {
      readonly categories: readonly Category[];
      readonly budget: BudgetLevel;
    };
  };
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

  const pollOnce = async () => {
    try {
      const snapshot = await fetchStatus();
      onUpdate(snapshot);
    } catch {
      // Ignore transient polling failures. A later poll or realtime update
      // can still move the UI forward.
    }
  };

  const startPolling = () => {
    if (pollTimer) {
      return;
    }

    pollTimer = setInterval(() => {
      void pollOnce();
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

  startPolling();
  void pollOnce();

  channel.subscribe(() => {});

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
  const response = await fetch(`/api/sessions/${sessionId}/status`);

  if (!response.ok) {
    throw new Error(`Failed to fetch session status for ${sessionId}`);
  }

  return (await response.json()) as SessionStatusSnapshot;
}
