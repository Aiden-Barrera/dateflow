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
| Backend | Next.js API routes or tRPC | Keeps stack unified |
| Database | Supabase (Postgres) | Auth + DB + realtime in one |
| AI | Claude API (Sonnet) | Itinerary generation, preference parsing |
| Venue data | Google Places API | Best coverage, ratings, photos, hours |
| Events | Eventbrite API / Fever API | Live event supply |
| Booking | OpenTable API / Resy API | Restaurant reservations |
| Hosting | Vercel | Zero-config deploys, edge functions |
| Analytics | PostHog | Session funnels, drop-off analysis |

---

## Go-to-Market

**Channel 1 — Dating app communities**
Reddit (r/Tinder, r/hingeapp, r/dating_advice), TikTok creators in the dating space. The "handoff problem" is a known pain point — it resonates immediately.

**Channel 2 — Organic from the share link**
Every Person A who sends an invite is an implicit referral. The Person B experience must be so smooth that they want to use it the next time they have a date.

**Channel 3 — City-by-city launch**
Start in one city (dense, dating-app-heavy — NYC, LA, Chicago, Austin). Build local venue quality before expanding.

---

## Monetization (Future)

1. **Booking commission** — small % on restaurant reservations and event tickets (same model as OpenTable/Fever)
2. **Venue promotion** — restaurants and bars pay to be surfaced in Dateflow results
3. **Premium features** — "Dateflow Plus" for unlimited sessions, AI-generated full itineraries, post-date recap
