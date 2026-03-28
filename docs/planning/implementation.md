# Dateflow — Implementation Guide

## Architecture Overview

Dateflow is a mobile-first web application. The MVP requires no native app and no account — just a shareable link that works on any device.

```
┌─────────────────────────────────────────────────┐
│                  Next.js App                     │
│                                                  │
│  /             → Marketing / entry point         │
│  /plan         → Person A: start a session       │
│  /plan/[id]    → Person B: join a session        │
│  /plan/[id]/results → Shared match reveal        │
└─────────────────────────────────────────────────┘
         │                        │
         ▼                        ▼
  Supabase (DB)          External APIs
  - sessions             - Google Places
  - preferences          - Claude (AI)
  - matches              - Eventbrite (Phase 2)
                         - OpenTable (Phase 2)
```

---

## Data Model (MVP)

```sql
-- A planning session between two people
sessions (
  id          uuid PRIMARY KEY,
  created_at  timestamptz,
  expires_at  timestamptz,        -- sessions expire after 48h
  status      text,               -- 'pending_b' | 'both_ready' | 'matched' | 'expired'
  matched_venue_id text           -- Google Places ID of the match
)

-- Each person's inputs for a session
preferences (
  id          uuid PRIMARY KEY,
  session_id  uuid REFERENCES sessions,
  role        text,               -- 'a' | 'b'
  location    jsonb,              -- { lat, lng, label }
  budget      text,               -- '$' | '$$' | '$$$'
  categories  text[],             -- ['restaurant', 'bar', 'activity', 'event']
  availability jsonb,             -- { date, time_range }
  created_at  timestamptz
)

-- The generated venue shortlist for a session
venues (
  id          uuid PRIMARY KEY,
  session_id  uuid REFERENCES sessions,
  place_id    text,               -- Google Places ID
  name        text,
  category    text,
  address     text,
  price_level int,
  rating      numeric,
  photo_url   text,
  tags        text[],             -- ['conversation-friendly', 'quiet', 'outdoor']
  position    int                 -- display order
)

-- Each person's swipe decisions
swipes (
  id          uuid PRIMARY KEY,
  session_id  uuid REFERENCES sessions,
  venue_id    uuid REFERENCES venues,
  role        text,               -- 'a' | 'b'
  liked       boolean,
  created_at  timestamptz
)
```

---

## Key Implementation Steps

### Step 1 — Project Setup

```bash
npx create-next-app@latest dateflow --typescript --tailwind --app
cd dateflow
npm install @supabase/supabase-js @supabase/ssr
npm install @anthropic-ai/sdk
npm install @googlemaps/google-maps-services-js
```

### Step 2 — Session Creation (Person A)

`POST /api/sessions`
1. Create a `sessions` row with status `pending_b`
2. Save Person A's preferences
3. Return `session_id` → generate shareable URL `/plan/[session_id]`

### Step 3 — Session Join (Person B)

`GET /plan/[id]` — Person B opens the link
- If status is `pending_b`: show Person B's preference form
- If status is `both_ready` or beyond: show appropriate state

`POST /api/sessions/[id]/join`
1. Save Person B's preferences
2. Update session status to `both_ready`
3. Trigger venue generation (can be async)

### Step 4 — Venue Generation (AI + Places API)

`POST /api/sessions/[id]/generate` (called server-side after both prefs saved)

```typescript
// 1. Calculate midpoint between Person A and B locations
const midpoint = calculateMidpoint(prefA.location, prefB.location);

// 2. Build a merged preference profile
const mergedCategories = union(prefA.categories, prefB.categories);
const budget = min(prefA.budget, prefB.budget); // conservative

// 3. Fetch nearby candidates from Google Places
const candidates = await fetchNearbyPlaces({
  location: midpoint,
  radius: 2000, // meters
  types: mergedCategories,
  maxPriceLevel: budgetToLevel(budget),
});

// 4. Use Claude to score and curate the shortlist
const shortlist = await curateWithAI(candidates, {
  preferences: { prefA, prefB },
  firstDateContext: true, // prompt instructs: favor conversation-friendly, public, accessible
});

// 5. Save venues to DB, update session status
```

**Claude prompt guidance:**
- Favor venues that are conversation-friendly (not too loud, not too dark)
- Avoid venues that feel like a commitment (no 2-hour tasting menus for a first date)
- Prefer venues with easy exits (no valet-only parking, no ticketed entry for casual drinks)
- Surface variety: one restaurant, one bar, one activity if categories allow

### Step 5 — Swipe Interface and Match Algorithm

#### Venue Cap: Progressive Rounds (Not Infinite Scroll, Not a Hard 8)

Infinite scroll is wrong for this context. The two users would fall out of sync (Person A on venue 47, Person B on venue 12), and the endless options create decision paralysis — Barry Schwartz's Paradox of Choice applies directly here. A flat cap of 8 is too small if no match emerges in the first round.

**The right mechanic: three rounds of 4, max 12 venues total.**

```
Round 1 (venues 1–4)  → highest-consensus picks, most likely to match
  ↓ no match?
Round 2 (venues 5–8)  → category diversification, different vibes
  ↓ no match?
Round 3 (venues 9–12) → wildcards, stretch picks outside stated preferences
  ↓ still no match?
Force resolution: "You're both tough to please — here's the closest thing."
  Surface the venue each person liked most. If no likes at all, surface top-rated overall.
```

Never leave users stranded with "no match found" and nothing else. Always give them an actionable next step.

#### Venue Ranking Algorithm (per round)

Score each candidate venue on a weighted composite:

```typescript
type VenueScore = {
  categoryOverlap: number;    // weight: 0.30 — does it match both users' categories?
  distanceToMidpoint: number; // weight: 0.25 — is it actually equidistant?
  firstDateSuitability: number; // weight: 0.25 — AI-scored: noise level, public, easy exit
  qualitySignal: number;      // weight: 0.15 — Google rating × log(review_count)
  timeOfDayFit: number;       // weight: 0.05 — lunch spot at 8pm = penalized
};
```

Round ordering strategy:
- **Round 1:** Sort by composite score descending. Top 4.
- **Round 2:** Filter out Round 1 venues. Re-rank with category diversity bonus — if Round 1 was heavy on restaurants, boost bars and activities.
- **Round 3:** Relax the budget constraint by one tier. Include venues slightly outside the stated category preferences. These are the "you didn't know you'd like this" picks.

#### Swipe Ordering: Both See the Same Sequence

Both users see venues in the **same order** but their swipes are fully private. This prevents anchoring — one person's swipe history should never influence the other's. Swipes are revealed only when a mutual match fires.

#### Atomic Match Detection (Race Condition Prevention)

The naive approach — "check if both liked this venue when any swipe comes in" — has a race condition. If both users swipe on the same venue within milliseconds of each other, two concurrent requests could both read "no match yet," both write, and both try to set `matched_venue_id`, producing duplicate or conflicting updates.

Use a Postgres stored procedure called via Supabase RPC to make the check-and-set atomic:

```sql
CREATE OR REPLACE FUNCTION record_swipe_and_check_match(
  p_session_id uuid,
  p_venue_id   uuid,
  p_role       text,
  p_liked      boolean
) RETURNS jsonb AS $$
DECLARE
  v_other_liked boolean;
  v_matched     boolean := false;
BEGIN
  -- Upsert the swipe (idempotent — duplicate swipes are safe)
  INSERT INTO swipes (session_id, venue_id, role, liked)
  VALUES (p_session_id, p_venue_id, p_role, p_liked)
  ON CONFLICT (session_id, venue_id, role) DO UPDATE SET liked = EXCLUDED.liked;

  -- If this was a like, atomically check if the other person also liked it
  IF p_liked THEN
    SELECT liked INTO v_other_liked
    FROM swipes
    WHERE session_id = p_session_id
      AND venue_id = p_venue_id
      AND role != p_role
    FOR UPDATE; -- row-level lock prevents concurrent match detection

    IF v_other_liked IS TRUE THEN
      UPDATE sessions
      SET status = 'matched', matched_venue_id = p_venue_id::text
      WHERE id = p_session_id AND status != 'matched'; -- only if not already matched

      GET DIAGNOSTICS v_matched = ROW_COUNT;
      v_matched := v_matched > 0;
    END IF;
  END IF;

  RETURN jsonb_build_object('matched', v_matched, 'venue_id', p_venue_id);
END;
$$ LANGUAGE plpgsql;
```

Add a unique constraint to enforce idempotency:
```sql
ALTER TABLE swipes ADD CONSTRAINT swipes_session_venue_role_unique
  UNIQUE (session_id, venue_id, role);
```

#### Realtime Sync

Both users subscribe to the session row. When `status` changes to `matched`, both are redirected simultaneously:

```typescript
const channel = supabase
  .channel(`session:${sessionId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'sessions',
    filter: `id=eq.${sessionId}`,
  }, (payload) => {
    if (payload.new.status === 'matched') {
      router.push(`/plan/${sessionId}/results`);
    }
  })
  .subscribe();
```

**Connectivity fallback:** If the WebSocket connection drops (mobile background, network switch), the client polls `GET /api/sessions/[id]/status` every 5 seconds as a fallback. The session state is always recoverable from the DB — a page reload will never lose progress.

### Step 6 — Match Reveal

`/plan/[id]/results`
- Show the matched venue: name, photo, address, rating, tags
- "Get Directions" → deep link to Google Maps
- "Save this date" → add to calendar (ICS file download, Phase 2)
- "Start over" → create a new session

---

---

## Distributed Systems Considerations

### Concurrency and State

A Dateflow session has two active participants who may act simultaneously. The main concurrency concern is match detection (covered above with the atomic RPC). Beyond that:

- **Session generation** should be triggered exactly once when both preferences are saved. Use a DB `status` field as a guard: only transition from `both_ready` → `generating` if the UPDATE returns `rowcount = 1`. This prevents double-triggers from near-simultaneous preference submissions.
- **Preference submission** by both users at the same time is safe — they write to separate rows in `preferences` (role = 'a' vs 'b'). No lock needed.
- **Round loading** (fetching venues for round 2 or 3) is read-only and safe to parallelize.

### Async Venue Generation

Venue generation (Google Places + Claude) takes 2–5 seconds — too slow for a synchronous API response. Handle it as an async job:

```
POST /api/sessions/[id]/join
  → saves Person B's preferences
  → updates session status to 'generating'
  → enqueues a generation job (Upstash QStash or Supabase Edge Function)
  → returns 202 Accepted immediately

Generation job:
  → fetches both preference rows
  → calls Google Places API
  → calls Claude for curation and scoring
  → saves venues to DB
  → updates session status to 'ready_to_swipe'
  → Supabase realtime notifies both users
```

Both users see a loading state while generation runs. If generation fails:
- Retry up to 3 times with exponential backoff
- If Claude is unavailable, fall back to pure Places API ranking (no AI curation)
- If Places API is unavailable, mark session `generation_failed` and show a clear error with a "try again" option
- Never leave a session stuck in `generating` indefinitely — add a 30-second timeout that transitions to `generation_failed`

### Caching Venue Data

Google Places API charges per request and has per-day quotas. Two sessions with similar midpoints and preferences should not both call Places from scratch.

Cache strategy using Upstash Redis:
- Cache key: `places:{lat_2dp}:{lng_2dp}:{categories_sorted}:{price_level}`
  - Coordinates rounded to 2 decimal places (~1.1km grid)
  - TTL: 6 hours (venue hours and closures don't change minute-to-minute)
- Cache hit: skip the Places call, run Claude curation against cached candidates
- Cache miss: call Places, store in Redis, proceed

This also reduces latency for generation — a cache hit means generation can complete in ~1 second instead of 3–5.

```typescript
const cacheKey = `places:${roundTo2dp(midpoint.lat)}:${roundTo2dp(midpoint.lng)}:${categories.sort().join(',')}:${priceLevel}`;
const cached = await redis.get(cacheKey);
const candidates = cached
  ? JSON.parse(cached)
  : await fetchFromPlacesAndCache(cacheKey, ...);
```

### Session Expiry and Cleanup

Sessions expire 48 hours after creation. Use a scheduled job (Vercel Cron or Supabase pg_cron) to:
1. Mark expired sessions: `UPDATE sessions SET status = 'expired' WHERE expires_at < now() AND status NOT IN ('matched', 'expired')`
2. After 30 days, hard-delete expired sessions and their associated rows (cascades to preferences, venues, swipes)

```sql
-- pg_cron job, runs every hour
SELECT cron.schedule('expire-sessions', '0 * * * *', $$
  UPDATE sessions
  SET status = 'expired'
  WHERE expires_at < now()
    AND status NOT IN ('matched', 'expired', 'generation_failed');
$$);
```

### API Rate Limiting

Apply rate limiting server-side before any external API call:

- **Session creation:** max 5 sessions per IP per hour (prevents abuse)
- **Venue generation:** max 1 active generation per session (enforced by status guard)
- **Swipe submission:** max 60 swipe requests per user per minute (prevents rapid-fire replay)

Use Upstash Redis with a sliding window rate limiter:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1h'),
});
const { success } = await ratelimit.limit(ip);
if (!success) return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
```

### Observability

Every API request gets a `request_id` (UUID) logged at entry. Downstream calls (Places, Claude) include this ID in their logs. This allows a full trace of any session's generation path.

- **Error monitoring:** Sentry — capture all unhandled errors with session context
- **Product analytics:** PostHog — track funnel: session_created → b_joined → generation_complete → swipe_started → matched. Drop-off at each step drives the product roadmap.
- **Infrastructure:** Vercel built-in metrics (function duration, error rate)
- **Alerts:** Notify when: generation failure rate > 5%, Places API quota above 80%, session match rate drops below 40% (could indicate a venue quality regression)

### Horizontal Scaling

Vercel serverless functions auto-scale with no configuration. All state lives in Supabase (Postgres + realtime) and Upstash Redis — there is no in-memory state in API routes. This means:
- Any function instance can handle any request
- No sticky sessions required
- Scale to zero when idle (cost-effective at early stage)

Supabase realtime has connection limits by plan tier. At ~500 concurrent active sessions, review the plan ceiling. Upgrade path is straightforward (no architectural changes needed).

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GOOGLE_PLACES_API_KEY=
ANTHROPIC_API_KEY=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Security Considerations

- Sessions expire after 48 hours — no indefinite data retention
- No PII collected in MVP (no names, no email, no phone)
- Location data stored as lat/lng only, not saved longer than the session
- All venue generation happens server-side — API keys never exposed to client
- Session IDs are UUIDs — not guessable
- Rate limit session creation per IP to prevent abuse

---

## Testing Strategy

- **Unit:** midpoint calculation, budget merging logic, AI prompt construction
- **Integration:** full session flow (create → join → generate → swipe → match) against a real Supabase test instance
- **E2E:** two-browser Playwright test simulating Person A and Person B completing a full flow
