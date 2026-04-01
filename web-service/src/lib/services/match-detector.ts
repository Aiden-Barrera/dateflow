import { getSupabaseServerClient } from "../supabase-server";
import type { Role } from "../types/preference";

type MatchRpcRow = {
  matched: boolean;
  venue_id: string | null;
};

export type MatchCheckResult = {
  readonly matched: boolean;
  readonly venueId: string | null;
};

export async function checkAndRecordMatch(
  sessionId: string,
  venueId: string,
  role: Role,
  liked: boolean,
): Promise<MatchCheckResult> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("record_swipe_and_check_match", {
    input_session_id: sessionId,
    input_venue_id: venueId,
    input_role: role,
    input_liked: liked,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = (data?.[0] ?? { matched: false, venue_id: null }) as MatchRpcRow;

  return {
    matched: row.matched,
    venueId: row.venue_id,
  };
}
