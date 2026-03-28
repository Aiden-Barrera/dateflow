# Dateflow — B2B Pivot Strategy

## The Honest Reframe

The original strategy was built around a consumer product with a viral share link as the core distribution mechanic. That mechanic is broken — asking a near-stranger you just matched with to click a third-party link interrupts the natural flow of conversation rather than adding to it. It creates friction at the worst possible moment.

The real product is a B2B API and SDK that embeds the planning layer directly inside dating apps. Seamless integration means the feature feels like a native part of the app the user is already in — which is where it belongs.

This doc replaces the consumer GTM strategy and reframes the execution plan around B2B as the primary thesis.

---

## What Changes and What Stays

### Cut Entirely

The following are dead weight under a B2B-first strategy and should not be built for:

- **Creator seeding and influencer distribution** — wrong channel entirely; you're not selling to consumers first
- **Reddit community seeding** — same issue; valuable time spent on users who won't drive B2B deals
- **City-first manual venue curation** (150–200 venues per city) — expensive pre-work that only matters if you're doing consumer depth; B2B partners bring their own distribution
- **Dateflow Plus / consumer subscription** — wrong monetization layer
- **Booking commissions as primary revenue** — secondary to licensing
- **Native iOS/Android app (Phase 3 consumer)** — vestigial consumer thinking; don't build this until a B2B partner demands native parity
- **"No account required" as a marketing feature** — dating apps already have accounts; you inherit their auth

### Keep

- **The core mechanic** — private swiping, mutual match reveal, midpoint calculation, safety filters — this is still the product; just delivered inside a dating app's UI
- **Women's safety filters** — this is press-worthy and differentiates you in B2B pitches as a values-aligned partner
- **The venue generation algorithm and AI curation** — your technical differentiation and the thing a dating app can't rebuild in a sprint
- **The structural misalignment argument** — dating apps won't build this because faster dates = faster churn; this is still your best pitch
- **The data model** — it maps cleanly to a multi-tenant B2B architecture with minimal rework

---

## The Consumer App Is Still Required — But Its Purpose Changes Completely

You cannot sell a B2B product with zero proof it works. No dating app CTO will sign a contract based on a deck. They need to see:

1. Real sessions completed by real people
2. Match-to-date conversion data — the only metric they actually care about
3. A working demo they can hand to their product team to evaluate

This means the consumer app is not optional. But it is a **sales tool**, not a product. Its entire purpose is to generate the proof of concept that closes B2B deals.

### What This Means for How You Build It

- Build it to be demoable, not to grow organically
- Optimize for data capture: every session should emit metrics that map directly to the pitch (session completion rate, match rate, time to match, match-to-date conversion if you can track it)
- Don't invest in retention, session history, or accounts — none of that matters until you have a B2B partner. Build the core loop and stop
- Launch it in one city with enough real users to have honest numbers — the minimum viable proof is ~100 completed session pairs with a match rate you're willing to put in a pitch deck

### Getting Real Users Without a Consumer GTM

You don't need a full consumer GTM to get 100 session pairs. You need to be scrappy:

- Personal network: friends who are actively dating, their friends, anyone who will try it once and give you honest feedback
- Direct outreach in dating communities — not spam, but finding the specific Reddit threads and Discord servers where people complain about the planning problem and authentically offering the tool
- A single well-placed piece of press or one creator video that's earned, not paid — one genuine piece of organic content with real usage data behind it is worth more than 20 seeded posts

The goal is not growth. The goal is data. A hundred real sessions with clean metrics is enough to walk into a meeting with Thursday.

---

## The Revised Sales Pitch

The current strategy positions Dateflow as "the planning layer dating apps won't build." That's accurate but it's a feature pitch. The actual pitch that closes deals is a metric pitch:

> **"Apps using Dateflow show X% higher match-to-date conversion rate."**

That single number is what a dating app CEO will fund. Their entire product exists to create dates — if you can prove you make their product work better at its stated job, the conversation changes.

This means you need to design your analytics from day one to capture match-to-date conversion. It's harder than session metrics (you need some form of confirmation that the date happened) but even a proxy — like "directions opened" or "calendar event created" — is better than nothing.

### Women's Safety as a Pitch Differentiator

Dating apps are under increasing regulatory and cultural pressure around user safety, particularly for women. Dateflow's default safety filters (public venues, well-lit, accessible independently, easy exit) give a dating app partner a concrete, press-worthy way to say "we take first-date safety seriously." That's not a minor feature — it's a values alignment story that benefits their brand. Lead with it in B2B pitches.

---

## The Real Moat

The moat is not the mechanic — any competent team can build a two-person swipe interface in a few weeks.

The moat is **session data at scale**. Every completed session generates:

- Preference profiles (what two people wanted, filtered to what they agreed on)
- Venue performance data (which venues generate matches vs. which ones both people skip)
- Outcome data (match rate, time to match, whether the date actually happened)

Over tens of thousands of sessions this becomes a dataset no dating app can replicate without you. Your venue recommendations get meaningfully better. Your AI curation gets measurably more accurate. A dating app that tries to rebuild Dateflow in-house starts at zero on this data — which is why moving fast and closing B2B deals early matters. The switching cost compounds over time.

This is what makes Dateflow acquirable rather than just licensable at scale. If your recommendation quality is noticeably better because of proprietary session data, that's a real acquisition thesis for any dating app that wants to own the planning layer rather than license it.

---

## Who to Target and When

### Phase 1: Get Proof (Consumer Demo Live)

No outreach to B2B targets until you have real session data. Cold outreach with zero proof is a waste of your credibility with the exact people you'll need later. Build the demo, get to 100 sessions, collect the metrics.

### Phase 2: Tier 1 Outreach (First LOIs)

**Thursday** is the first call you make. Their brand is entirely built around "get offline faster, have actual dates." Dateflow is the product they've been describing in their own marketing copy without knowing how to build it. Philosophical alignment is this strong once — use it.

- **The League** — premium users, intentional daters, higher budget per session = higher booking value per match. They will understand the quality pitch immediately.
- **Coffee Meets Bagel** — less swipe-gamification, more date-focused user base. Slower growth means they need differentiation more than Bumble does.

Target: **3 signed LOIs within 90 days of the consumer demo going live**.

### Phase 3: Tier 2 (After Booking Data Exists)

- **Bumble** — has "Suggest a Date" but it's a nudge, not a planning tool. Approach once you have booking volume data to show.
- **Hinge** — most likely to be interested if a competitor moves first. Don't lead with Hinge; let competitive pressure do the work.
- **Mid-tier international apps** (Hily, Badoo) — faster decisions, genuine need for feature differentiation.

Do not approach Tinder. Match Group will run this through procurement for six months and then have their team reverse-engineer it.

---

## Technical Direction: What Needs to Exist That Doesn't

The current dev specs describe a web app. The B2B product requires additional documentation that doesn't exist yet:

### 1. API/SDK Specification

This is the most important missing document. A dating app CTO needs to know exactly what they're integrating before they say yes. At minimum this document needs to define:

- Endpoint contracts (`POST /sessions`, `POST /sessions/:id/preferences`, `GET /sessions/:id/venues`, `POST /sessions/:id/swipes`)
- Auth handoff — dating app passes a user token, Dateflow returns a session token; their user never leaves the app's auth context
- Webhook events the dating app subscribes to (`session.matched`, `session.expired`, `swipe.submitted`)
- Three integration tiers (link handoff → embedded webview → full API with white-label UI)
- Data ownership terms — Dateflow retains anonymized aggregate data; per-user data is owned by the dating app

### 2. Integration Tiers in Practice

**Tier 1 — Link Handoff** (lowest friction to ship)
Dating app sends users to `dateflow.app/start?session_token=xxx` with preference data pre-filled from their profiles. User opens Dateflow as a separate web experience. Fastest to integrate, weakest UX.

**Tier 2 — Embedded Webview**
Dating app renders Dateflow's planning UI inside a native webview. User never leaves the dating app. Dateflow returns a result via webhook. Most realistic first integration for a mid-tier partner.

**Tier 3 — Full API / White-Label**
Dating app calls the API, gets back venue suggestions and match results, renders the UI in their own design system. Dateflow is invisible; all credit goes to the dating app. Best UX. Required for Tier 2 B2B targets who care about brand consistency.

### 3. Pricing Model (Work Out Before First Sales Call)

Per-session fees are the right structure — partners pay only when users are active, which aligns incentives. But the specific numbers need to exist:

- What does a mid-tier app with 500K MAU pay per month if 8% of active matches use the planning feature?
- What's the floor deal size that makes the integration overhead worth it for Dateflow?
- What does a white-label tier cost vs. the webview embed?

This math needs to be worked out before the first meeting. Walking in without a pricing model signals that you haven't thought about the business seriously.

---

## Revised Success Metrics

| Phase | Old Metric | New Metric |
|-------|-----------|------------|
| Consumer demo | 50 session pairs in 60 days | 100 session pairs with match rate ≥ 55% |
| B2B outreach | — | 3 signed LOIs in 90 days of demo launch |
| First integration live | — | 1 partner live with Tier 2 embed |
| Phase 2 | 30% of sessions result in booking | Match-to-date conversion rate baseline established |

---

## The Honest Risk

The B2B pivot is not easier than the consumer strategy — it trades one hard problem for a different one. Consumer distribution is hard because you have to find users at scale with no budget. B2B sales is hard because deal cycles are long (3–6 months from first contact to signed contract for a small app), require trust you haven't earned yet, and can fall apart at legal review.

The consumer demo bridge — using real session data to close B2B deals — is the right call, but it requires doing both things simultaneously for a period of time: keeping the consumer demo alive and generating data while also running an active B2B sales process. That's not a lot of runway if you're building solo or with a small team.

The upside is asymmetric. One B2B deal with a mid-size dating app can deliver more session volume than six months of consumer marketing. The math favors B2B once you have the proof. Get the proof first, get the deal second.
