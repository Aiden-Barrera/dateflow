import type { BudgetLevel, Category } from "../../../../lib/types/preference";
import type { SessionStatus } from "../../../../lib/types/session";

type FallbackActionResponse = {
  readonly session?: {
    readonly status: SessionStatus;
    readonly matchedVenueId: string | null;
  };
  readonly retryWaitingForPartner?: boolean;
  readonly acceptWaitingForPartner?: boolean;
  readonly error?: string;
};

type FallbackRetryPreferences = {
  readonly categories: readonly Category[];
  readonly budget: BudgetLevel;
  readonly radiusMeters?: number;
};

export async function acceptFallbackDecision(sessionId: string): Promise<{
  readonly status: SessionStatus;
  readonly matchedVenueId: string | null;
  readonly acceptWaitingForPartner: boolean;
}> {
  const response = await fetch(`/api/sessions/${sessionId}/fallback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "accept" }),
  });

  const body = (await response.json()) as FallbackActionResponse;

  if (!response.ok) {
    throw new Error(body.error ?? "Failed to accept fallback suggestion");
  }

  if (!body.session) {
    throw new Error("Fallback accept response did not include session state");
  }

  return {
    status: body.session.status,
    matchedVenueId: body.session.matchedVenueId,
    acceptWaitingForPartner: body.acceptWaitingForPartner ?? false,
  };
}

export async function requestFallbackRetryDecision(
  sessionId: string,
  preferences: FallbackRetryPreferences,
): Promise<{
  readonly status: SessionStatus;
  readonly matchedVenueId: string | null;
  readonly retryWaitingForPartner: boolean;
}> {
  const response = await fetch(`/api/sessions/${sessionId}/fallback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "retry",
      preferences,
    }),
  });

  const body = (await response.json()) as FallbackActionResponse;

  if (!response.ok) {
    throw new Error(body.error ?? "Failed to retry fallback suggestion");
  }

  if (!body.session) {
    throw new Error("Fallback retry response did not include session state");
  }

  return {
    status: body.session.status,
    matchedVenueId: body.session.matchedVenueId,
    retryWaitingForPartner: body.retryWaitingForPartner ?? false,
  };
}

export function getFallbackStartOverHref(): string {
  return "/";
}
