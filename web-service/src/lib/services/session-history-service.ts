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
  readonly sessions: SessionRow | SessionRow[] | null;
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
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize - 1;
  let historyQuery = supabase
    .from("session_accounts")
    .select("session_id, role, sessions!inner(*)", { count: "exact" })
    .eq("account_id", accountId);

  if (!includeAll) {
    historyQuery = historyQuery.eq("sessions.status", "matched");
  }

  const {
    data: linkRows,
    error: linksError,
    count,
  } = await historyQuery
    .order("created_at", { ascending: false, referencedTable: "sessions" })
    .range(startIndex, endIndex);

  if (linksError) {
    throw new Error(linksError.message);
  }

  const links = ((linkRows ?? []) as SessionAccountLinkRow[])
    .map((row) => ({
      sessionId: row.session_id,
      role: row.role,
      session: Array.isArray(row.sessions) ? (row.sessions[0] ?? null) : row.sessions,
    }))
    .filter(
      (
        row,
      ): row is {
        readonly sessionId: string;
        readonly role: SessionAccountRole;
        readonly session: SessionRow;
      } => row.session !== null,
    );

  if (links.length === 0) {
    return {
      sessions: [],
      page,
      pageSize,
      totalCount: 0,
      totalPages: 0,
    };
  }

  const matchedVenueIds = links
    .map((row) => row.session)
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

  const totalCount = count ?? 0;
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);

  return {
    sessions: links.map(({ sessionId, role, session }) => {
      const matchedVenue =
        session.matched_venue_id === null
          ? null
          : venueMap.get(session.matched_venue_id) ?? null;

      return {
        sessionId,
        status: session.status,
        createdAt: new Date(session.created_at).toISOString(),
        role,
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
