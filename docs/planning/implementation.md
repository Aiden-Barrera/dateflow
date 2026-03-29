# Dateflow — Implementation Guide

> **TL;DR:** Mobile-first web app. No native app, no account required. Next.js + Supabase + Claude API. The core challenge is a two-person realtime session with atomic match detection.

---

## Architecture Overview

```mermaid
flowchart TD
    subgraph Client["🌐 Client (Next.js)"]
        P1["/plan — Person A starts"]
        P2["/plan/id — Person B joins"]
        P3["/plan/id/results — Match reveal"]
    end

    subgraph API["⚙️ API Routes"]
        A1["POST /api/sessions"]
        A2["POST /api/sessions/id/join"]
        A3["POST /api/sessions/id/generate"]
        A4["POST /api/sessions/id/swipe"]
    end

    subgraph Services["🔌 External Services"]
        S1["Google Places API"]
        S2["Claude API (Sonnet 4.6)"]
        S3["OpenTable / Resy (Phase 2)"]
    end

    subgraph Data["💾 Data Layer"]
        D1["Supabase (Postgres + Realtime)"]
        D2["Upstash Redis (Cache)"]
    end

    Client --> API
    API --> Services
    API --> Data

    style Client fill:#3498DB,stroke:#2980B9,color:#fff
    style API fill:#2ECC71,stroke:#27AE60,color:#fff
    style Services fill:#F39C12,stroke:#D68910,color:#fff
    style Data fill:#9B59B6,stroke:#8E44AD,color:#fff
```

---

## Data Model (MVP)

```mermaid
erDiagram
    sessions ||--o{ preferences : "has 2"
    sessions ||--o{ venues : "has 5-12"
    sessions ||--o{ swipes : "has many"
    venues ||--o{ swipes : "swiped on"

    sessions {
        uuid id PK
        timestamptz created_at
        timestamptz expires_at
        text status
        text matched_venue_id
    }
    preferences {
        uuid id PK
        uuid session_id FK
        text role
        jsonb location
        text budget
        text[] categories
        jsonb availability
    }
    venues {
        uuid id PK
        uuid session_id FK
        text place_id
        text name
        text category
        int price_level
        numeric rating
        text[] tags
        int position
    }
    swipes {
        uuid id PK
        uuid session_id FK
        uuid venue_id FK
        text role
        boolean liked
    }
```

**Session status flow:**

```mermaid
stateDiagram-v2
    [*] --> pending_b: Person A creates session
    pending_b --> both_ready: Person B joins
    both_ready --> generating: Venue generation starts
    generating --> ready_to_swipe: Venues ready
    ready_to_swipe --> matched: Mutual match found
    generating --> generation_failed: API error
    generation_failed --> generating: Retry
    pending_b --> expired: 48h timeout
    both_ready --> expired: 48h timeout
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

```mermaid
flowchart LR
    A["Person A submits\npreferences"] --> B["Create session\nstatus: pending_b"]
    B --> C["Save Person A\npreferences"]
    C --> D["Return share URL\n/plan/session_id"]

    style A fill:#4ECDC4,stroke:#3BA89F,color:#fff
    style D fill:#FFEAA7,stroke:#DCC480,color:#333
```

### Step 3 — Session Join (Person B)

`POST /api/sessions/[id]/join`

```mermaid
flowchart LR
    A["Person B opens link"] --> B{"Session status?"}
    B -->|pending_b| C["Show preference form"]
    B -->|both_ready+| D["Show current state"]
    C --> E["Save preferences"]
    E --> F["Status → both_ready"]
    F --> G["Trigger venue generation"]

    style A fill:#FF6B6B,stroke:#CC5555,color:#fff
    style G fill:#45B7D1,stroke:#3891A6,color:#fff
```

### Step 4 — Venue Generation (AI + Places API)

```mermaid
flowchart TD
    A["Calculate midpoint\nbetween A and B"] --> B["Merge preferences\n(categories, budget)"]
    B --> C["Fetch candidates\nfrom Google Places"]
    C --> D["Claude scores and curates\nfor first-date context"]
    D --> E["Save 5-8 venues to DB"]
    E --> F["Status → ready_to_swipe"]

    style A fill:#3498DB,stroke:#2980B9,color:#fff
    style C fill:#F39C12,stroke:#D68910,color:#fff
    style D fill:#9B59B6,stroke:#8E44AD,color:#fff
    style F fill:#2ECC71,stroke:#27AE60,color:#fff
```

```typescript
// Simplified generation flow
const midpoint = calculateMidpoint(prefA.location, prefB.location);
const mergedCategories = union(prefA.categories, prefB.categories);
const budget = min(prefA.budget, prefB.budget); // conservative

const candidates = await fetchNearbyPlaces({
  location: midpoint,
  radius: 2000,
  types: mergedCategories,
  maxPriceLevel: budgetToLevel(budget),
});

const shortlist = await curateWithAI(candidates, {
  preferences: { prefA, prefB },
  firstDateContext: true,
});
```

**Claude prompt guidance:**
- Favor conversation-friendly venues (not too loud, not too dark)
- Avoid commitment-heavy venues (no 2-hour tasting menus)
- Prefer easy exits (no valet-only, no ticketed entry for drinks)
- Surface variety: one restaurant, one bar, one activity if categories allow

### Step 5 — Swipe Interface and Match Algorithm

#### Progressive Rounds (Not Infinite Scroll)

```mermaid
flowchart TD
    R1["Round 1 (venues 1-4)\nHighest consensus picks"] --> M1{"Match?"}
    M1 -->|Yes| Done["🎉 Match found!"]
    M1 -->|No| R2["Round 2 (venues 5-8)\nCategory diversification"]
    R2 --> M2{"Match?"}
    M2 -->|Yes| Done
    M2 -->|No| R3["Round 3 (venues 9-12)\nWildcards, relaxed constraints"]
    R3 --> M3{"Match?"}
    M3 -->|Yes| Done
    M3 -->|No| Force["Force resolution:\nShow each person's\ntop pick"]

    style R1 fill:#2ECC71,stroke:#27AE60,color:#fff
    style R2 fill:#F39C12,stroke:#D68910,color:#fff
    style R3 fill:#E74C3C,stroke:#C0392B,color:#fff
    style Done fill:#FFEAA7,stroke:#DCC480,color:#333
    style Force fill:#9B59B6,stroke:#8E44AD,color:#fff
```

#### Venue Scoring

```typescript
type VenueScore = {
  categoryOverlap: number;       // weight: 0.30
  distanceToMidpoint: number;    // weight: 0.25
  firstDateSuitability: number;  // weight: 0.25 (AI-scored)
  qualitySignal: number;         // weight: 0.15 (rating × log(reviews))
  timeOfDayFit: number;          // weight: 0.05
};
```

#### Atomic Match Detection

Both users see venues in the same order. Swipes are private. A Postgres stored procedure makes match detection atomic (prevents race conditions when both swipe within milliseconds):

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
  INSERT INTO swipes (session_id, venue_id, role, liked)
  VALUES (p_session_id, p_venue_id, p_role, p_liked)
  ON CONFLICT (session_id, venue_id, role) DO UPDATE SET liked = EXCLUDED.liked;

  IF p_liked THEN
    SELECT liked INTO v_other_liked
    FROM swipes
    WHERE session_id = p_session_id
      AND venue_id = p_venue_id
      AND role != p_role
    FOR UPDATE; -- row-level lock

    IF v_other_liked IS TRUE THEN
      UPDATE sessions
      SET status = 'matched', matched_venue_id = p_venue_id::text
      WHERE id = p_session_id AND status != 'matched';

      GET DIAGNOSTICS v_matched = ROW_COUNT;
      v_matched := v_matched > 0;
    END IF;
  END IF;

  RETURN jsonb_build_object('matched', v_matched, 'venue_id', p_venue_id);
END;
$$ LANGUAGE plpgsql;
```

#### Realtime Sync

Both users subscribe to session updates via Supabase Realtime. When status → `matched`, both redirect simultaneously:

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

**Fallback:** If WebSocket drops, poll `GET /api/sessions/[id]/status` every 5 seconds. Page reload never loses progress.

### Step 6 — Match Reveal

`/plan/[id]/results` — Show the matched venue with:
- Name, photo, address, rating, tags
- **Get Directions** → deep link to Google Maps / Apple Maps
- **Save this date** → ICS calendar download (Phase 2)
- **Start over** → create a new session

---

## Distributed Systems Considerations

### Async Venue Generation

```mermaid
flowchart LR
    A["Person B joins"] --> B["Status → generating"]
    B --> C["Enqueue job\n(QStash)"]
    C --> D["Google Places\n+ Claude"]
    D --> E["Save venues"]
    E --> F["Status → ready_to_swipe"]
    F --> G["Realtime notifies\nboth users"]

    style B fill:#F39C12,stroke:#D68910,color:#fff
    style D fill:#9B59B6,stroke:#8E44AD,color:#fff
    style G fill:#2ECC71,stroke:#27AE60,color:#fff
```

- Takes 2-5 seconds. Too slow for synchronous response → async job.
- Retry up to 3x with exponential backoff.
- If Claude unavailable → fall back to pure Places API ranking.
- 30-second timeout → `generation_failed` with "try again" option.

### Caching (Upstash Redis)

- **Cache key:** `places:{lat_2dp}:{lng_2dp}:{categories}:{price_level}`
- **TTL:** 6 hours
- **Hit:** Skip Places API call, run Claude on cached candidates (~1 sec)
- **Miss:** Call Places, cache results, proceed (~3-5 sec)

### Rate Limiting

| Endpoint | Limit | Why |
|----------|-------|-----|
| Session creation | 5 per IP per hour | Prevent abuse |
| Venue generation | 1 per session | Enforced by status guard |
| Swipe submission | 60 per user per minute | Prevent rapid-fire replay |

### Session Expiry

- Sessions expire after **48 hours**.
- Hourly cron job marks expired sessions.
- Hard-delete after 30 days (cascade to preferences, venues, swipes).

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

## Security

| Concern | How it's handled |
|---------|-----------------|
| Data retention | Sessions expire after 48h |
| PII | No names, email, or phone collected in MVP |
| Location data | Lat/lng only, not saved beyond session |
| API keys | All generation server-side, never exposed to client |
| Session IDs | UUIDs — not guessable |
| Abuse prevention | Rate limited per IP |

---

## Testing Strategy

| Type | What to test |
|------|-------------|
| **Unit** | Midpoint calculation, budget merging, AI prompt construction |
| **Integration** | Full session flow against real Supabase test instance |
| **E2E** | Two-browser Playwright test: Person A + Person B complete full flow |
