# Dateflow — Competitive Landscape

## The Problem Space

The dating-to-date pipeline has three phases:
1. **Discovery** — find someone (dating apps)
2. **Planning** — decide what to do and where to go ← *completely unowned*
3. **Execution** — book, show up, enjoy

Every major player owns phase 1 or phase 3. Nobody owns phase 2.

---

## Direct Competitors

### Cobble
- Tinder-style swipe matching on curated activity/restaurant ideas
- Both people swipe independently; matches surface a shared plan
- Raised $3M, strong early reviews (4.8 stars App Store)
- **Weaknesses:** iOS only, limited to select US cities, growth appears stalled post-2023

### SoulPlan
- AI-powered suggestions filtered by mood, budget, energy level, location
- Scheduling and calendar features
- **Weaknesses:** Primarily aimed at established couples, not first dates

### DateNight (app)
- Generates 3–6 curated venue ideas via Google Maps
- Works in 200+ countries
- **Weaknesses:** Single-user only, no two-person coordination, no booking

### Cupla
- Calendar sync + AI suggestions + venue map
- Strong mutual availability features
- **Weaknesses:** Explicitly marketed to couples, not first-daters

---

## Adjacent Threats

### Happn "Perfect Date" (July 2025) — Most Relevant New Entrant
- AI (Mistral) + Foursquare: surfaces 5 hyper-local venue suggestions within a chat
- Targets first dates explicitly
- **Weaknesses:** Gated inside Happn — requires a Happn match. No booking, no calendar, no two-person swipe mechanic.

### Hinge / Bumble
- Both testing AI-powered conversation nudges and profile feedback
- No venue/activity planning features as of early 2026
- Hinge CEO departed Dec 2025 to launch "Overtone" (AI dating startup — worth monitoring)

### Fever
- Best-in-class for experience/event discovery and ticketing (immersive events, candlelight concerts, rooftop screenings)
- Acquired DICE and Atom Tickets (2025)
- **Not a planning tool** — no coordination, no personalization for first dates

### Google Maps (Ask Maps, March 2026)
- New AI conversational search: "romantic dinner near me under $80"
- Growing rapidly as a raw venue-finding engine
- **Not a date tool** — no two-person flow, no coordination, no booking integration

### ChatGPT / Claude / Gemini
- Can generate date itineraries conversationally when prompted
- No real-time venue availability, no booking, no two-person experience
- Require user to know to ask — not a product with a defined flow

---

## Feature Gap Matrix

| Feature | Cobble | Happn | DateNight | Cupla | Fever | Google Maps | **Dateflow** |
|---|---|---|---|---|---|---|---|
| Location-aware venues | Yes | Yes | Yes | Yes | Yes | Yes | **Yes** |
| Two-person coordination | Yes | Partial | No | Yes | No | No | **Yes** |
| First-date focused | Yes | Yes | Yes | No | No | No | **Yes** |
| Booking integration | Yes | No | No | No | Yes | Partial | **Phase 2** |
| Calendar / scheduling | Yes | No | No | Yes | No | No | **Phase 2** |
| Works without dating app | Yes | No | Yes | Yes | Yes | Yes | **Yes** |
| No install required (web) | No | No | No | No | No | Yes | **Yes (MVP)** |
| Multi-category (food+events) | No | No | No | No | Events only | Partial | **Yes** |

---

## Dateflow's Defensible Position

1. **Standalone tool** — not locked inside a dating app. Works for anyone planning any early-stage date.
2. **True two-person flow** — the only experience designed from the ground up for two people making a decision together, without requiring either to commit first.
3. **First-date context baked in** — filters and suggestions tuned for public spaces, conversation-friendly environments, appropriate budget, and low-pressure settings.
4. **Zero-friction invite** — Person B receives a link, no install, no account. The viral loop is built into the core mechanic.
