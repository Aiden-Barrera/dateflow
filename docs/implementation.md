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

### Step 5 — Swipe Interface

Both users independently see the same venue cards and swipe like/pass.

Realtime sync via Supabase realtime channel — when both users have swiped on a venue and both liked it, update `sessions.matched_venue_id` and push both to the results page.

```typescript
// Supabase realtime subscription
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

### Step 6 — Match Reveal

`/plan/[id]/results`
- Show the matched venue: name, photo, address, rating, tags
- "Get Directions" → deep link to Google Maps
- "Save this date" → add to calendar (ICS file download, Phase 2)
- "Start over" → create a new session

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
