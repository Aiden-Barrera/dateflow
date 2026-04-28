# Dateflow — Dev Specs Onboarding Guide

Welcome to Dateflow. This document gives you the full picture of how the system works in about 5 minutes. For implementation details, each section links to the full dev spec.

---

## What Dateflow Does in One Sentence

Two people who want to go on a first date each enter their preferences, swipe on AI-curated nearby venues, and the first mutual like becomes the plan.

---

## The User Flow (End to End)

```
Person A opens Dateflow → enters name, location, budget, categories
    → gets a share link → pastes it into iMessage / WhatsApp / Instagram DM
Person B sees a rich link preview ("Alex wants to plan your date")
    → taps the link → sees hook screen (1 button) → 2-screen preference input
    → AI generates 12 nearby venues in 3 rounds of 4
Both swipe independently (private until match)
    → First mutual like = match → directions + calendar export
```

No account required. No app install. Works on any mobile browser. The share link lands in a messaging app — the OG preview and Person B's landing page are the product's first impression.

---

## How the System Is Organized

There are **6 dev specs** that map to the flow above. They build on each other in a chain, with one independent branch:

```
DS-01 Session Management ← start here, everything depends on this
  │
  ├── DS-02 Preference Input
  │     └── DS-03 Venue Generation Engine
  │           └── DS-04 Swipe & Match System
  │                 └── DS-05 Post-Match Actions
  │
  └── DS-06 Session History (can be built in parallel with DS-02 through DS-05)
```

---

## Spec-by-Spec Summary

### [DS-01 — Session Management](./ds-01-session-management.md)

**What it does:** Creates and manages the planning session that two people share. Person A starts a session, gets a share link, Person B opens the link and joins.

**Why it matters:** This is the foundation. Every other spec reads from or writes to the `sessions` table. The zero-account, zero-install entry point is what makes the product accessible — if this feels heavy, the entire downstream flow breaks.

**Key decisions:**
- Sessions are identified by UUID v4 (not guessable, no auth needed)
- Sessions expire after 48 hours (a protected cron route cleans up stale ones)
- No PII collected — no name, email, or phone number at this stage

**Classes:** `Session`, `SessionService`, `ShareLink`, `ShareLinkService`
**Endpoints:** `POST /api/sessions`, `GET /api/sessions/[id]`
**Tables:** `sessions`

---

### [DS-02 — Preference Input](./ds-02-preference-input.md)

**What it does:** Collects each person's location, budget, and activity category preferences. When both people have submitted, the session transitions to `both_ready` and triggers venue generation. **Person A and Person B have distinct client-side flows** — same API, same data model, different UX.

**Why it matters:** These inputs are what make the recommendation engine personal. But equally important: Person B's preference flow is the most critical conversion point in the entire product. Person B clicked a link from a near-stranger in a text message. If this flow is slow, confusing, or heavy, they close the tab and the two-person mechanic never fires. The DS-02 spec splits the Person A and Person B paths explicitly.

**Key decisions:**
- **Person B gets a 3-screen flow (hook → location → vibe) targeting 30–45 seconds.** Screen 1 is not a form — it's a single sentence with Person A's name and one button. Screen 2 makes GPS the primary CTA. Screen 3 uses visual chips, not dropdowns.
- **Person A's flow is inline with session creation** — more tolerance for a standard form since they initiated the session voluntarily
- Location can come from GPS (browser Geolocation API) or manual entry (zip/city, geocoded via Google)
- Budget uses three tiers: `BUDGET`, `MODERATE`, `UPSCALE` — maps to Google Places price levels
- "Surprise me" selects all four categories (restaurant, bar, activity, event)
- One preference per role per session, enforced by a DB unique constraint

**Classes:** `Preference`, `PreferenceService`, `Location`, `BudgetLevel`, `Category`
**Endpoints:** `POST /api/sessions/[id]/preferences`
**Tables:** `preferences`

---

### [DS-03 — Venue Generation Engine](./ds-03-venue-generation.md)

**What it does:** Takes both users' preferences, calculates the geographic midpoint, fetches nearby venue candidates from Google Places, filters them for first-date safety, and uses optional AI curation with deterministic fallback ranking to score venues into swipe rounds.

**Why it matters:** This is the intelligence layer — the thing that turns raw Google Places data into a curated shortlist that feels like a friend who knows the city recommended it. The safety filter (US-07) is a core differentiator: venues must be public, accessible, conversation-friendly, and easy to leave.

**Key decisions:**
- Generation is async (Upstash QStash job queue) — takes 2–5 seconds, users see a loading state
- Google Places results are cached in Redis (6h TTL, keyed by coordinate grid + categories) to reduce API cost
- 3 rounds: Round 1 = highest consensus, Round 2 = category diversity, Round 3 = wildcards
- If AI curation is unavailable, falls back to deterministic Places/event ranking (no AI, but the product still works)
- If the midpoint falls in an empty area, two separate searches run from each user's location

**Scoring algorithm (5 weighted dimensions):**

| Dimension | Weight | What it measures |
|---|---|---|
| Category overlap | 0.30 | Does this venue match what both users selected? |
| Distance to midpoint | 0.25 | Is it equidistant and reachable for both? |
| First-date suitability | 0.25 | AI-scored: noise, safety, ease of exit, ambiance |
| Quality signal | 0.15 | Google rating adjusted by review count |
| Time-of-day fit | 0.05 | Is this venue appropriate for the planned time? |

**Classes:** `Venue`, `VenueScore`, `VenueGenerationService`, `PlacesAPIClient`, `AICurationService`, `SafetyFilter`, `MidpointCalculator`, `VenueCache`
**Endpoints:** `POST /api/sessions/[id]/generate` (internal), `GET /api/sessions/[id]/venues`
**Tables:** `venues`

---

### [DS-04 — Swipe & Match System](./ds-04-swipe-match.md)

**What it does:** Both users independently swipe like/pass on venue cards. Swipes are private — neither person sees the other's choices. The moment both people like the same venue, a match fires and both are redirected to the result page.

**Why it matters:** Private swiping is the core mechanic that removes the social awkwardness of suggesting a venue. Neither person has to commit first or risk rejection. The progressive round system (3 rounds of 4) prevents dead ends — if no match in round 1, round 2 loads automatically with different vibes.

**Key decisions:**
- Match detection is atomic: a Postgres RPC function (`record_swipe_and_check_match`) inserts the swipe and checks for a mutual like in a single transaction with row-level locking. This prevents race conditions when both users swipe simultaneously.
- Swipes are idempotent (unique constraint on `session_id, venue_id, role` + upsert)
- Both users see venues in the same order but swipe independently
- After round 3 with no mutual match, a force resolution picks the closest option and explains why
- Realtime notifications via Supabase WebSocket, with 5-second polling as a fallback if the connection drops

**Round progression:**
```
Round 1 (venues 1–4)  → highest-consensus picks
Round 2 (venues 5–8)  → different categories and vibes
Round 3 (venues 9–12) → wildcards, relaxed constraints
Still no match?       → force resolution with best available
```

**Classes:** `Swipe`, `SwipeService`, `MatchDetector`, `RoundManager`
**Endpoints:** `POST /api/sessions/[id]/swipes`, `GET /api/sessions/[id]/status`
**Tables:** `swipes`

---

### [DS-05 — Post-Match Actions](./ds-05-post-match-actions.md)

**What it does:** Displays the matched venue with its photo, rating, address, and tags. Offers two immediate actions: get directions (deep link to Google/Apple Maps) and add to calendar (ICS file download).

**Why it matters:** The match reveal is the emotional peak of the product — equivalent to Tinder's "It's a Match!" but for a concrete plan. The directions and calendar actions close the loop from "we agreed" to "it's on my calendar and I know how to get there." Without these, the match is just information; with them, it's an actionable commitment.

**Key decisions:**
- Platform detection (iOS vs Android vs desktop) determines whether to deep link to Apple Maps or Google Maps
- Calendar export generates a standard ICS file (works with Google Calendar, Apple Calendar, Outlook)
- No new database tables — DS-05 is read-only against existing `sessions` and `venues` tables
- The result page URL (`/plan/[id]/results`) is shareable — both users access the same page

**Classes:** `MatchResult`, `DirectionsService`, `CalendarExportService`
**Endpoints:** `GET /api/sessions/[id]/result`, `GET /api/sessions/[id]/calendar`
**Tables:** none (reads from `sessions` and `venues`)

---

### [DS-06 — Session History](./ds-06-session-history.md)

**What it does:** Adds optional lightweight accounts (email or Google OAuth) so returning users can see their past sessions. Sessions are linked to accounts retroactively — you can complete a full session without an account, then create one to save it.

**Why it matters:** This is the retention play. The MVP works entirely without accounts (DS-01 through DS-05), but repeat users who go on multiple first dates want to avoid suggesting the same venue twice. Session history gives them a reason to come back and a reason to create an account.

**Key decisions:**
- Accounts are Phase 2 — never required for the core flow
- Account creation is prompted after a successful match (moment of highest engagement), not before
- Sessions are linked via a `session_accounts` join table, not a direct FK — this preserves the accountless MVP flow
- Session ID is stored in localStorage during the session for retroactive linking on account creation
- Default history view only shows `matched` sessions (not expired or failed ones)

**Classes:** `Account`, `AccountService`, `SessionHistoryService`
**Endpoints:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/sessions/history`
**Tables:** `accounts`, `session_accounts`

---

## Session Lifecycle (How Status Flows)

Every session moves through these statuses. Each transition is owned by a specific spec:

```
pending_b (DS-01) → both_ready (DS-02) → generating (DS-03) → ready_to_swipe (DS-03) → matched (DS-04)
                                           ↓
                                    generation_failed (DS-03) → retry → generating
```

Any pre-matched session can expire after 48 hours (DS-01).

---

## Tech Stack at a Glance

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), React, Tailwind CSS |
| Backend | Next.js API routes (Railway-hosted Next.js service) |
| Database | Supabase Postgres (+ Realtime) |
| Auth | Supabase Auth (Phase 2 only) |
| Cache | Upstash Redis |
| Job queue | Upstash QStash |
| AI | Optional curation provider with deterministic fallback |
| Venue data | Google Places API |
| Monitoring | Sentry (errors), PostHog (analytics) |

---

## Where to Go from Here

- **Building a feature?** Find the spec that owns it in the table above, read the full spec for architecture diagrams, class details, API contracts, and data schemas.
- **Fixing a bug?** The session status tells you which spec to look at. Check the status machine above.
- **Adding an endpoint?** The [full index](./index.md) has the global API registry and class registry to check for naming conflicts.
- **Confused about a type?** Each spec's "Public Interfaces" section has the complete TypeScript interface definitions.
