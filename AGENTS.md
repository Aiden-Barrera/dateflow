# Dateflow — Codex Navigation Guide

**Dateflow** is an AI-powered first date planner. Person A creates a session and invite link, Person B joins from the link, Dateflow generates a shared shortlist of venues, both people swipe privately, and the first mutual like becomes the plan.

---

## Quick Orientation

**Status:** Pre-MVP, but the end-to-end core flow is now largely implemented.

**Main Branch:** `main`

**What exists today**
- Person A landing and setup flow is live in the app
- Session creation and preference capture are implemented
- Venue generation is implemented, including Google Places search, midpoint scoring, caching, and fallback ranking
- Swipe rounds and match detection are implemented
- Match result page and calendar export are implemented
- Fallback decision API exists, but the no-match / fallback decision UI is still incomplete
- Session history and auth are still not built

**Most likely current work**
- DS-04 and DS-05 polish
- Fallback / no-match UX completion
- DS-06 account and history work

---

## Directory Structure

```text
dateflow/
├── web-service/                         # Next.js application
│   ├── src/
│   │   ├── app/                        # App Router pages + API routes
│   │   │   ├── page.tsx                # Person A landing / invite creation flow
│   │   │   ├── layout.tsx              # Root layout
│   │   │   ├── globals.css             # Global styles
│   │   │   ├── api/
│   │   │   │   └── sessions/
│   │   │   │       ├── route.ts        # POST /api/sessions
│   │   │   │       └── [id]/
│   │   │   │           ├── route.ts         # GET /api/sessions/[id]
│   │   │   │           ├── preferences/     # POST preferences
│   │   │   │           ├── status/          # GET live session state
│   │   │   │           ├── venues/          # GET venues for a round
│   │   │   │           ├── swipes/          # POST a swipe + match check
│   │   │   │           ├── generate/        # QStash-triggered venue generation
│   │   │   │           ├── fallback/        # Accept or retry fallback suggestion
│   │   │   │           ├── result/          # GET matched venue payload
│   │   │   │           └── calendar/        # Calendar export
│   │   │   └── plan/
│   │   │       └── [id]/
│   │   │           ├── page.tsx             # Person B entry / shared plan flow
│   │   │           ├── plan-flow.tsx        # Preference flow shell
│   │   │           ├── plan-flow-state.ts   # Redirect logic based on status sync
│   │   │           ├── swipe/
│   │   │           │   ├── page.tsx
│   │   │           │   ├── swipe-flow.tsx
│   │   │           │   └── swipe-deck-card.tsx
│   │   │           └── results/
│   │   │               ├── page.tsx
│   │   │               ├── result-screen.tsx
│   │   │               └── result-screen-state.ts
│   │   ├── components/
│   │   │   ├── person-a-flow.tsx       # Person A landing + invite creation
│   │   │   ├── hook-screen.tsx         # Person B hook screen
│   │   │   ├── location-screen.tsx     # Shared location input
│   │   │   ├── vibe-screen.tsx         # Shared category / budget input
│   │   │   ├── loading-screen.tsx
│   │   │   ├── loading-ornament.tsx
│   │   │   ├── button.tsx
│   │   │   ├── category-icon.tsx
│   │   │   ├── price-badge.tsx
│   │   │   └── logo.tsx
│   │   ├── lib/
│   │   │   ├── supabase.ts
│   │   │   ├── supabase-server.ts
│   │   │   ├── qstash.ts
│   │   │   ├── upstash-redis.ts
│   │   │   ├── session-status-sync.ts
│   │   │   ├── swipe-config.ts
│   │   │   ├── services/
│   │   │   │   ├── session-service.ts
│   │   │   │   ├── preference-service.ts
│   │   │   │   ├── venue-generation-service.ts
│   │   │   │   ├── swipe-service.ts
│   │   │   │   ├── match-detector.ts
│   │   │   │   ├── round-manager.ts
│   │   │   │   ├── result-service.ts
│   │   │   │   ├── calendar-export-service.ts
│   │   │   │   ├── fallback-decision-service.ts
│   │   │   │   ├── venue-retry-service.ts
│   │   │   │   ├── ai-curation-service.ts
│   │   │   │   ├── safety-filter.ts
│   │   │   │   ├── midpoint-calculator.ts
│   │   │   │   ├── places-api-client.ts
│   │   │   │   ├── places-api-cached.ts
│   │   │   │   ├── venue-cache.ts
│   │   │   │   ├── demo-venue-service.ts
│   │   │   │   ├── share-link-service.ts
│   │   │   │   ├── directions-service.ts
│   │   │   │   ├── session-helpers.ts
│   │   │   │   ├── session-serializer.ts
│   │   │   │   ├── preference-serializer.ts
│   │   │   │   └── result-serializer.ts
│   │   │   └── types/
│   │   │       ├── session.ts
│   │   │       ├── preference.ts
│   │   │       ├── venue.ts
│   │   │       ├── swipe.ts
│   │   │       ├── match-result.ts
│   │   │       └── candidate-pool.ts
│   ├── supabase/
│   │   └── migrations/
│   │       ├── 001_create_sessions.sql
│   │       ├── 002_create_preferences.sql
│   │       ├── 003_create_venues.sql
│   │       ├── 004_create_swipes.sql
│   │       ├── 005_create_candidate_pools.sql
│   │       ├── 006_extend_sessions_statuses.sql
│   │       └── 007_fix_record_swipe_match_function.sql
│   ├── package.json
│   ├── bun.lock
│   ├── next.config.ts
│   └── .env.example
├── docs/
│   ├── dev-specs/
│   ├── planning/
│   ├── business/
│   └── design/
├── README.md
└── AGENTS.md
```

---

## Entry Points

### If you're writing code

1. Read [`docs/dev-specs/onboarding.md`](docs/dev-specs/onboarding.md)
2. Check [`docs/dev-specs/index.md`](docs/dev-specs/index.md) for route and class references
3. Confirm feature scope in the relevant DS file
4. Search the existing implementation before adding a new service or route

### If you're debugging

1. Route issue: check `web-service/src/app/api/...`
2. Domain issue: check `web-service/src/lib/services/...`
3. Redirect / flow issue: check `plan-flow-state.ts`, `session-status-sync.ts`, and `swipe-flow.tsx`
4. Schema / state issue: check `web-service/supabase/migrations/` and `web-service/src/lib/types/session.ts`

---

## Current Implementation Status

| Feature | Status | Notes |
|---|---|---|
| **DS-01 Session Management** | ✅ Built | Session create/fetch, share link, state helpers |
| **DS-02 Preference Input** | ✅ Built | Person A + Person B preference flows and API |
| **DS-03 Venue Generation** | ✅ Built | Midpoint, Google Places, caching, AI/deterministic ranking, candidate pools |
| **DS-03a Candidate Pool Regeneration** | ✅ Built | Retry and regeneration support exists |
| **DS-04 Swipe & Match** | ✅ Built | Round-based swiping, match detection, status sync |
| **DS-05 Post-Match** | ✅ Partially built | Match result UI and calendar export exist |
| **Fallback / No-Match UX** | ⚠️ Partial | Backend is present, final user-facing no-match flow is not complete |
| **DS-06 Session History / Accounts** | ⬜ Not started | No auth or session history UI yet |

---

## Core Flow

### Person A

- Starts on `/`
- Creates a session
- Saves their own preferences immediately
- Gets a share link for Person B

### Person B

- Opens `/plan/[id]`
- Submits preferences
- Gets redirected based on live session state

### Generation

- Session moves into `both_ready`
- Internal generation route `/api/sessions/[id]/generate` is protected by QStash verification
- Venue generation uses:
  - midpoint calculation
  - Google Places Nearby Search
  - safety filtering
  - caching via Upstash Redis
  - optional Anthropic-assisted curation with deterministic fallback

### Swiping

- Shared swipe experience lives under `/plan/[id]/swipe`
- Uses round-based swiping with config in `swipe-config.ts`
- Current config:
  - `VENUES_PER_ROUND = 4`
  - `FINAL_ROUND = 3`

### Result

- Match reveal lives under `/plan/[id]/results`
- Directions and calendar export are supported

---

## Session Statuses

Current statuses from [session.ts](web-service/src/lib/types/session.ts):

```text
pending_b
both_ready
generating
generation_failed
ready_to_swipe
fallback_pending
retry_pending
reranking
matched
expired
```

### Practical state flow

```text
pending_b
  -> both_ready
  -> generating
  -> ready_to_swipe
  -> matched

Alternate paths:
generating -> generation_failed
round completion with no match -> fallback_pending
fallback retry -> reranking -> retry_pending
any stale session -> expired
```

Important:
- `fallback_pending`, `retry_pending`, and `reranking` exist in backend state now
- The API supports fallback decisions
- The final no-match UX is still incomplete in the frontend

---

## Data Model Snapshot

Current schema is no longer just `sessions` and `preferences`.

### Existing core tables

- `sessions`
- `preferences`
- `venues`
- `swipes`
- `candidate_pools`

### Migration order

1. `001_create_sessions.sql`
2. `002_create_preferences.sql`
3. `003_create_venues.sql`
4. `004_create_swipes.sql`
5. `005_create_candidate_pools.sql`
6. `006_extend_sessions_statuses.sql`
7. `007_fix_record_swipe_match_function.sql`

---

## Important Files

### Routing and flow

- [`web-service/src/app/page.tsx`](web-service/src/app/page.tsx)
- [`web-service/src/components/person-a-flow.tsx`](web-service/src/components/person-a-flow.tsx)
- [`web-service/src/app/plan/[id]/page.tsx`](web-service/src/app/plan/[id]/page.tsx)
- [`web-service/src/app/plan/[id]/plan-flow.tsx`](web-service/src/app/plan/[id]/plan-flow.tsx)
- [`web-service/src/app/plan/[id]/plan-flow-state.ts`](web-service/src/app/plan/[id]/plan-flow-state.ts)
- [`web-service/src/app/plan/[id]/swipe/swipe-flow.tsx`](web-service/src/app/plan/[id]/swipe/swipe-flow.tsx)
- [`web-service/src/app/plan/[id]/swipe/swipe-deck-card.tsx`](web-service/src/app/plan/[id]/swipe/swipe-deck-card.tsx)
- [`web-service/src/app/plan/[id]/results/result-screen.tsx`](web-service/src/app/plan/[id]/results/result-screen.tsx)

### Core services

- [`web-service/src/lib/services/session-service.ts`](web-service/src/lib/services/session-service.ts)
- [`web-service/src/lib/services/preference-service.ts`](web-service/src/lib/services/preference-service.ts)
- [`web-service/src/lib/services/venue-generation-service.ts`](web-service/src/lib/services/venue-generation-service.ts)
- [`web-service/src/lib/services/swipe-service.ts`](web-service/src/lib/services/swipe-service.ts)
- [`web-service/src/lib/services/match-detector.ts`](web-service/src/lib/services/match-detector.ts)
- [`web-service/src/lib/services/round-manager.ts`](web-service/src/lib/services/round-manager.ts)
- [`web-service/src/lib/services/fallback-decision-service.ts`](web-service/src/lib/services/fallback-decision-service.ts)
- [`web-service/src/lib/services/result-service.ts`](web-service/src/lib/services/result-service.ts)
- [`web-service/src/lib/services/calendar-export-service.ts`](web-service/src/lib/services/calendar-export-service.ts)

### External integrations

- [`web-service/src/lib/services/places-api-client.ts`](web-service/src/lib/services/places-api-client.ts)
- [`web-service/src/lib/services/places-api-cached.ts`](web-service/src/lib/services/places-api-cached.ts)
- [`web-service/src/lib/services/venue-cache.ts`](web-service/src/lib/services/venue-cache.ts)
- [`web-service/src/lib/qstash.ts`](web-service/src/lib/qstash.ts)
- [`web-service/src/lib/upstash-redis.ts`](web-service/src/lib/upstash-redis.ts)

---

## Tech Stack

| Layer | Tech | Version |
|---|---|---|
| Frontend | Next.js | 16.2.1 |
| UI | React | 19.2.4 |
| Styling | Tailwind CSS | v4 |
| Database | Supabase Postgres | managed |
| Cache | Upstash Redis | current |
| Background jobs / auth for internal route | Upstash QStash | current |
| Venue source | Google Places API (New) | current |
| AI curation | Anthropic | optional |
| Tests | Vitest | 4.1.2 |
| Linting | ESLint | 9.x |

---

## Environment Setup

The env template is at [`web-service/.env.example`](web-service/.env.example), not repo root.

Required variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=

GOOGLE_PLACES_API_KEY=
ANTHROPIC_API_KEY=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Notes:
- Anthropic is optional, deterministic fallback ranking is used when unset
- Google Places API is required for real venue generation
- QStash is required for the internal generation route behavior

---

## Development Commands

```bash
cd web-service
bun install
bun run dev
bun run test
bun run lint
bun run build
```

Useful targeted commands:

```bash
bun run test -- swipe-service
bun run test -- venue-generation
bun run test -- --watch
```

---

## Code Patterns

### Services

- Function-based, not class-based
- Acquire Supabase internally
- Throw errors upward, let routes translate them into HTTP responses

### Routes

- Validate input at the boundary
- Return generic user-facing errors
- Log server details with context

### Frontend

- Server components by default
- Use client components only when state, browser APIs, or gestures are required
- Swipe interaction logic is intentionally isolated in `swipe-deck-card.tsx`

### Tests

- Co-located next to source
- Prefer narrow regression coverage for touched behavior

---

## Known Gaps

- No user-facing fallback / no-match screen yet
- No auth, accounts, or session history
- Some docs in `README.md` and older planning notes still describe an earlier implementation stage
- `next.config.ts` is intentionally minimal right now because current external `Image` usage is `unoptimized`

---

## Recommended Starting Points

### For swipe issues

- [`web-service/src/app/plan/[id]/swipe/swipe-flow.tsx`](web-service/src/app/plan/[id]/swipe/swipe-flow.tsx)
- [`web-service/src/app/plan/[id]/swipe/swipe-deck-card.tsx`](web-service/src/app/plan/[id]/swipe/swipe-deck-card.tsx)
- [`web-service/src/lib/services/swipe-service.ts`](web-service/src/lib/services/swipe-service.ts)
- [`web-service/src/lib/services/match-detector.ts`](web-service/src/lib/services/match-detector.ts)

### For venue generation issues

- [`web-service/src/lib/services/venue-generation-service.ts`](web-service/src/lib/services/venue-generation-service.ts)
- [`web-service/src/lib/services/places-api-client.ts`](web-service/src/lib/services/places-api-client.ts)
- [`web-service/src/lib/services/ai-curation-service.ts`](web-service/src/lib/services/ai-curation-service.ts)
- [`web-service/src/lib/services/venue-cache.ts`](web-service/src/lib/services/venue-cache.ts)

### For result / post-match issues

- [`web-service/src/app/plan/[id]/results/result-screen.tsx`](web-service/src/app/plan/[id]/results/result-screen.tsx)
- [`web-service/src/lib/services/result-service.ts`](web-service/src/lib/services/result-service.ts)
- [`web-service/src/lib/services/calendar-export-service.ts`](web-service/src/lib/services/calendar-export-service.ts)

### For fallback issues

- [`web-service/src/app/api/sessions/[id]/fallback/route.ts`](web-service/src/app/api/sessions/[id]/fallback/route.ts)
- [`web-service/src/lib/services/fallback-decision-service.ts`](web-service/src/lib/services/fallback-decision-service.ts)
- [`web-service/src/lib/services/venue-retry-service.ts`](web-service/src/lib/services/venue-retry-service.ts)

---

## Last Updated

Updated against the checked-in codebase on `2026-04-03`.
