type FallbackActionResponse = {
  readonly session?: {
    readonly status: string;
    readonly matchedVenueId: string | null;
  };
  readonly error?: string;
};

type FallbackRetryPreferences = {
  readonly categories: readonly string[];
  readonly budget: string;
  readonly radiusMeters?: number;
};

export async function acceptFallbackDecision(sessionId: string): Promise<{
  readonly status: string;
  readonly matchedVenueId: string | null;
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
  };
}

export async function requestFallbackRetryDecision(
  sessionId: string,
  preferences: FallbackRetryPreferences,
): Promise<{
  readonly status: string;
  readonly matchedVenueId: string | null;
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
  };
}

export function getFallbackStartOverHref(): string {
  return "/";
}
