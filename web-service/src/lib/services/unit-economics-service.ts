import { getSupabaseServerClient } from "../supabase-server";

const UNIT_ECONOMICS_TABLE = "unit_economics_snapshots";
const INCREMENT_UNIT_ECONOMICS_RPC = "increment_unit_economics_snapshot";

const COST_ESTIMATES_CENTS = {
  placesSearchRequest: 2,
  placesPhotoRequest: 1,
  aiRequest: 3,
  infraActiveSession: 1,
} as const;

type UnitEconomicsSnapshotRow = {
  readonly session_id: string;
  readonly places_search_requests: number;
  readonly places_photo_requests: number;
  readonly ai_requests: number;
  readonly ai_input_tokens: number;
  readonly ai_output_tokens: number;
  readonly places_search_cost_cents: number;
  readonly places_photo_cost_cents: number;
  readonly ai_cost_cents: number;
  readonly infra_cost_cents: number;
  readonly acquisition_cost_cents: number | null;
  readonly revenue_cents: number;
  readonly gross_margin_cents: number;
  readonly last_computed_at: string;
};

export type UnitEconomicsSnapshot = {
  readonly sessionId: string;
  readonly placesSearchRequests: number;
  readonly placesPhotoRequests: number;
  readonly aiRequests: number;
  readonly aiInputTokens: number;
  readonly aiOutputTokens: number;
  readonly placesSearchCostCents: number;
  readonly placesPhotoCostCents: number;
  readonly aiCostCents: number;
  readonly infraCostCents: number;
  readonly acquisitionCostCents: number | null;
  readonly revenueCents: number;
  readonly grossMarginCents: number;
  readonly lastComputedAt: string;
};

type SnapshotDelta = {
  readonly placesSearchRequests?: number;
  readonly placesPhotoRequests?: number;
  readonly aiRequests?: number;
  readonly aiInputTokens?: number;
  readonly aiOutputTokens?: number;
};

type ListSnapshotOptions = {
  readonly limit?: number;
};

type IncrementSnapshotRpcRow = UnitEconomicsSnapshotRow;

function validateNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
}

function buildDefaultSnapshot(sessionId: string): UnitEconomicsSnapshot {
  return {
    sessionId,
    placesSearchRequests: 0,
    placesPhotoRequests: 0,
    aiRequests: 0,
    aiInputTokens: 0,
    aiOutputTokens: 0,
    placesSearchCostCents: 0,
    placesPhotoCostCents: 0,
    aiCostCents: 0,
    infraCostCents: 0,
    acquisitionCostCents: null,
    revenueCents: 0,
    grossMarginCents: 0,
    lastComputedAt: new Date(0).toISOString(),
  };
}

function fromRow(row: UnitEconomicsSnapshotRow): UnitEconomicsSnapshot {
  return {
    sessionId: row.session_id,
    placesSearchRequests: row.places_search_requests,
    placesPhotoRequests: row.places_photo_requests,
    aiRequests: row.ai_requests,
    aiInputTokens: row.ai_input_tokens,
    aiOutputTokens: row.ai_output_tokens,
    placesSearchCostCents: row.places_search_cost_cents,
    placesPhotoCostCents: row.places_photo_cost_cents,
    aiCostCents: row.ai_cost_cents,
    infraCostCents: row.infra_cost_cents,
    acquisitionCostCents: row.acquisition_cost_cents,
    revenueCents: row.revenue_cents,
    grossMarginCents: row.gross_margin_cents,
    lastComputedAt: row.last_computed_at,
  };
}

async function selectSnapshot(sessionId: string): Promise<UnitEconomicsSnapshot> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(UNIT_ECONOMICS_TABLE)
    .select()
    .eq("session_id", sessionId)
    .single<UnitEconomicsSnapshotRow>();

  if (error) {
    if (error.code === "PGRST116") {
      return buildDefaultSnapshot(sessionId);
    }
    throw new Error(error.message);
  }

  return fromRow(data);
}

async function incrementSnapshot(
  sessionId: string,
  delta: Required<SnapshotDelta>,
): Promise<UnitEconomicsSnapshot> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc(INCREMENT_UNIT_ECONOMICS_RPC, {
    input_session_id: sessionId,
    input_places_search_requests: delta.placesSearchRequests,
    input_places_photo_requests: delta.placesPhotoRequests,
    input_ai_requests: delta.aiRequests,
    input_ai_input_tokens: delta.aiInputTokens,
    input_ai_output_tokens: delta.aiOutputTokens,
    input_places_search_cost_cents: COST_ESTIMATES_CENTS.placesSearchRequest,
    input_places_photo_cost_cents: COST_ESTIMATES_CENTS.placesPhotoRequest,
    input_ai_cost_cents: COST_ESTIMATES_CENTS.aiRequest,
    input_infra_cost_cents: COST_ESTIMATES_CENTS.infraActiveSession,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = (data?.[0] ?? null) as IncrementSnapshotRpcRow | null;
  if (!row) {
    throw new Error("Failed to increment unit economics snapshot");
  }

  return fromRow(row);
}

export async function getUnitEconomicsSnapshot(
  sessionId: string,
): Promise<UnitEconomicsSnapshot> {
  return selectSnapshot(sessionId);
}

export async function recordPlacesSearchUsage(
  sessionId: string,
  requestCount = 1,
): Promise<UnitEconomicsSnapshot> {
  validateNonNegativeInteger(requestCount, "requestCount");

  return incrementSnapshot(sessionId, {
    placesSearchRequests: requestCount,
    placesPhotoRequests: 0,
    aiRequests: 0,
    aiInputTokens: 0,
    aiOutputTokens: 0,
  });
}

export async function recordPlacesPhotoUsage(
  sessionId: string,
  requestCount = 1,
): Promise<UnitEconomicsSnapshot> {
  validateNonNegativeInteger(requestCount, "requestCount");

  return incrementSnapshot(sessionId, {
    placesSearchRequests: 0,
    placesPhotoRequests: requestCount,
    aiRequests: 0,
    aiInputTokens: 0,
    aiOutputTokens: 0,
  });
}

export async function recordAiUsage(
  sessionId: string,
  usage: {
    readonly requestCount?: number;
    readonly inputTokens?: number;
    readonly outputTokens?: number;
  },
): Promise<UnitEconomicsSnapshot> {
  const requestCount = usage.requestCount ?? 1;
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;

  validateNonNegativeInteger(requestCount, "usage.requestCount");
  validateNonNegativeInteger(inputTokens, "usage.inputTokens");
  validateNonNegativeInteger(outputTokens, "usage.outputTokens");

  return incrementSnapshot(sessionId, {
    placesSearchRequests: 0,
    placesPhotoRequests: 0,
    aiRequests: requestCount,
    aiInputTokens: inputTokens,
    aiOutputTokens: outputTokens,
  });
}

export async function listUnitEconomicsSnapshots(
  options: ListSnapshotOptions = {},
): Promise<readonly UnitEconomicsSnapshot[]> {
  const supabase = getSupabaseServerClient();
  const limit = options.limit ?? 20;
  const { data, error } = await supabase
    .from(UNIT_ECONOMICS_TABLE)
    .select()
    .order("last_computed_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data as UnitEconomicsSnapshotRow[]).map(fromRow);
}
