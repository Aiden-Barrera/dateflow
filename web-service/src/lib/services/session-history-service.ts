import { getSupabaseServerClient } from "../supabase-server";
import type { SessionAccountRole } from "../types/account";
import type { SessionRow } from "../types/session";
import type { VenueRow } from "../types/venue";
import { toVenue } from "../types/venue";

export async function linkSessionToAccount(
  sessionId: string,
  accountId: string,
  role: SessionAccountRole,
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("session_accounts").insert({
    session_id: sessionId,
    account_id: accountId,
    role,
  });

  if (error) {
    throw new Error(error.message);
  }
}

type SessionAccountLinkRow = {
  readonly session_id: string;
  readonly role: SessionAccountRole;
};

export type HistorySession = {
  readonly sessionId: string;
  readonly status: SessionRow["status"];
  readonly createdAt: string;
  readonly role: SessionAccountRole;
  readonly matchedVenue: {
    readonly name: string;
    readonly category: VenueRow["category"];
    readonly address: string;
    readonly photoUrl: string | null;
  } | null;
};

export type SessionHistoryPage = {
  readonly sessions: readonly HistorySession[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly totalPages: number;
};

export async function getHistory(
  accountId: string,
  page: number,
  pageSize: number,
  includeAll = false,
): Promise<SessionHistoryPage> {
  const supabase = getSupabaseServerClient();
  const { data: linkRows, error: linksError } = await supabase
    .from("session_accounts")
    .select("session_id, role")
    .eq("account_id", accountId);

  if (linksError) {
    throw new Error(linksError.message);
  }

  const links = (linkRows ?? []) as SessionAccountLinkRow[];
  const sessionIds = links.map((row) => row.session_id);

  if (sessionIds.length === 0) {
    return {
      sessions: [],
      page,
      pageSize,
      totalCount: 0,
      totalPages: 0,
    };
  }

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize - 1;
  let sessionQuery = supabase
    .from("sessions")
    .select("*", { count: "exact" })
    .in("id", sessionIds);

  if (!includeAll) {
    sessionQuery = sessionQuery.eq("status", "matched");
  }

  const {
    data: sessionRows,
    error: sessionsError,
    count,
  } = await sessionQuery
    .order("created_at", { ascending: false })
    .range(startIndex, endIndex);

  if (sessionsError) {
    throw new Error(sessionsError.message);
  }

  const pagedSessions = (sessionRows ?? []) as SessionRow[];
  const matchedVenueIds = pagedSessions
    .map((session) => session.matched_venue_id)
    .filter((value): value is string => typeof value === "string");

  const venueMap = new Map<string, ReturnType<typeof toVenue>>();

  if (matchedVenueIds.length > 0) {
    const { data: venueRows, error: venuesError } = await supabase
      .from("venues")
      .select()
      .in("id", matchedVenueIds);

    if (venuesError) {
      throw new Error(venuesError.message);
    }

    for (const row of (venueRows ?? []) as VenueRow[]) {
      venueMap.set(row.id, toVenue(row));
    }
  }

  const roleBySessionId = new Map(
    links.map((row) => [row.session_id, row.role] as const),
  );

  const totalCount = count ?? 0;
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);

  return {
    sessions: pagedSessions.map((session) => {
      const matchedVenue =
        session.matched_venue_id === null
          ? null
          : venueMap.get(session.matched_venue_id) ?? null;

      return {
        sessionId: session.id,
        status: session.status,
        createdAt: new Date(session.created_at).toISOString(),
        role: roleBySessionId.get(session.id) ?? "a",
        matchedVenue: matchedVenue
          ? {
              name: matchedVenue.name,
              category: matchedVenue.category,
              address: matchedVenue.address,
              photoUrl: matchedVenue.photoUrl,
            }
          : null,
      };
    }),
    page,
    pageSize,
    totalCount,
    totalPages,
  };
}
