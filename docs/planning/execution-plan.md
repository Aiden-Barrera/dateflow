# Dateflow — Execution Plan

## Core User Flow

```
Person A opens Dateflow
  → Enters their location + availability + preferences
  → Invites Person B via link or phone number
Person B opens the invite
  → Enters their location + availability + preferences
Dateflow generates 5–8 curated options nearby
  → Both users independently rank/swipe on options
  → First mutual match surfaces as the plan
  → Booking + calendar invite handled in-app
```

No account required on first use. Friction must be near-zero for Person B (the receiver).

---

## Phase 1 — MVP (0 to First Users)

**Goal:** Prove that two people will use a shared planning tool and agree on a venue.

### Features
- [ ] Single-session planning flow (no account needed)
- [ ] Location input for both users (zip code or "use my location")
- [ ] Category selection: restaurant, bar, activity, event, or "surprise me"
- [ ] Budget filter ($ / $$ / $$$)
- [ ] AI-generated shortlist (5–8 options) pulled from Google Places API
- [ ] Simple swipe/like interface — each person rates options independently
- [ ] Match reveal: "You both picked [Venue]. Here's the address."
- [ ] Share link to invite the second person (no app install required)
- [ ] Mobile-first web app (no native app required at this stage)

### Not in MVP
- Booking / reservations
- Calendar integration
- User accounts / profiles
- Notification system
- Event supply (Fever/Eventbrite integration)

### Success Metric
50 completed session pairs (both users finished the flow and got a match) within the first 60 days.

---

## Phase 2 — Retention and Booking

**Goal:** Turn one-time users into repeat users; add real utility with booking.

### Features
- [ ] Lightweight accounts (email or Google sign-in)
- [ ] Session history ("your past dateflows")
- [ ] OpenTable / Resy integration for restaurant reservations
- [ ] Eventbrite / Fever integration for live events and experiences
- [ ] "Tonight" mode — filters for same-day availability
- [ ] Time-of-day awareness (lunch vs. dinner vs. late night)
- [ ] Noise level and "conversation-friendly" tags on venues
- [ ] Midpoint calculation — suggest venues equidistant from both users

### Success Metric
30% of sessions result in a booking through Dateflow.

---

## Phase 3 — Intelligence and Network

**Goal:** Make Dateflow smarter and stickier with personalization and social proof.

### Features
- [ ] Preference learning — Dateflow gets better the more you use it
- [ ] Post-date rating ("how did it go?") — feeds recommendation quality
- [ ] "Trending first date spots" by city — crowdsourced from session data
- [ ] Hinge / Bumble deep link integration (if partnership available)
- [ ] Push notifications for time-sensitive matches ("happy hour ends in 2 hours")
- [ ] Native iOS + Android app

---

## Tech Stack (Recommended)

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js (App Router) | Fast mobile web, easy share links, SSR for SEO |
| Backend | Next.js API routes | Keeps stack unified, serverless auto-scaling |
| Database | Supabase (Postgres) | Auth + DB + realtime + pg_cron in one |
| Cache | Upstash Redis | Venue result caching, rate limiting (serverless-compatible) |
| Job queue | Upstash QStash | Async venue generation, retries, exponential backoff |
| AI | Claude API (Sonnet 4.6) | Venue curation, scoring, preference parsing |
| Venue data | Google Places API | Best coverage, ratings, photos, hours |
| Events | Eventbrite API / Fever API | Live event supply (Phase 2) |
| Booking | OpenTable API / Resy API | Restaurant reservations (Phase 2) |
| Hosting | Vercel | Zero-config deploys, serverless auto-scaling |
| Analytics | PostHog | Session funnels, drop-off analysis per step |
| Error monitoring | Sentry | Error capture with session context |
| B2B API | Same Next.js app | Partner API routes under `/api/v1/` with API key auth |

---

## Go-to-Market

See `docs/strategy.md` for the full marketing rationale. Summary:

**Channel 1 — Creator content (highest ROI)**
Seed 15–20 mid-tier dating/relationship creators on TikTok and Instagram Reels (50K–500K followers). The product is demonstrable in 30 seconds. Don't pay for placements initially — let them organically discover the utility. The "stop texting, start planning" moment is inherently relatable content.

**Channel 2 — The share link as the ad**
Person B's first experience IS the acquisition channel. Every invite sent is a potential new Person A. The most important design investment at launch is Person B's first 60 seconds — zero friction, no account, obvious value.

**Channel 3 — Dating community presence**
Reddit (r/Tinder, r/hingeapp, r/dating_advice, r/datingoverthirty). Don't spam — contribute authentically to conversations about planning friction. Let the community discover the product.

**Channel 4 — City-first depth**
Launch in Austin or Chicago (dense, word-of-mouth-driven, strong venue scene, not so large that traction gets diluted). Manually curate the top 150–200 venues in the launch city before going live. Venue depth is the quality moat. Expand only after achieving 500 completed session pairs with >60% match rate.

**Channel 5 — Press**
Two strong editorial angles: (1) "The planning layer dating apps refuse to build" — the structural misalignment argument. (2) "The date planning app that puts women's safety first" — default first-date-safe venue filters. Both angles have clear placement targets (TechCrunch, The Cut, Refinery29, Global Dating Insights).

**Channel 6 — B2B / dating app partnerships**
Approach Thursday, The League, and Coffee Meets Bagel at launch. Position as: "We built the planning layer so you don't have to." See `docs/strategy.md` section 4 for the full B2B strategy.

---

## Monetization

**Consumer (Phase 2+):**
1. **Booking commission** — small % on restaurant reservations and event tickets booked through Dateflow (OpenTable / Resy / Eventbrite model)
2. **Venue promotion** — local venues pay to be surfaced in results for relevant sessions
3. **Dateflow Plus** — premium tier: unlimited session history, full itinerary mode, post-date recaps, priority venue curation

**B2B (Phase 2+):**
1. **API licensing** — per-session fee for dating apps embedding Dateflow's planning engine
2. **Revenue share** — % of bookings originating from embedded sessions flows back to Dateflow
3. **White-label** — branded Dateflow engine inside a dating app's native UI (higher tier, higher margin)

The B2B licensing model has the better unit economics at scale — one API deal with a mid-size dating app can deliver more session volume than months of consumer marketing.
