# Dateflow — Person B Experience: The Critical Gap

## The Missing Insight

Every existing document assumes the planning conversation happens inside a dating app. It doesn't.

By the time two people are genuinely close to meeting, they have almost always moved to a different platform — iMessage, WhatsApp, Instagram DMs. The dating app becomes a notification inbox. The real conversation — "we should actually hang out," "what are you doing this weekend," "where should we go" — is happening somewhere else entirely.

This has two immediate consequences that are not addressed anywhere in the current documentation:

**1. The B2B dating app embed solves for a minority of sessions.** The users who plan a date without ever leaving the dating app are the outliers, not the norm. The embed strategy is still worth pursuing, but it captures a narrower slice of the actual planning moment than the docs suggest.

**2. The share link lands in a messaging app, not a dating app.** Person A is not sending this link from inside a product — they're pasting a URL into iMessage or typing it into an Instagram DM. The link is the product's entire first impression on Person B, and it exists in an environment Dateflow does not control.

---

## The Rich Link Preview: Entry Point, Not Solution

When a URL is pasted into iMessage, WhatsApp, or other messaging platforms, the platform fetches the page's Open Graph tags and renders a visual preview inline — app name, title, description, and an image. This preview is the first thing Person B sees before they've clicked anything.

A bare URL (`dateflow.app/s/a7f3bc2`) looks like a phishing link from a near-stranger.

A properly constructed rich preview looks like a real product:

```
┌─────────────────────────────────────┐
│  [Dateflow logo]  dateflow.app      │
│                                     │
│  Alex wants to plan your date       │
│  Add your preferences in 60 seconds │
│  — no account needed.               │
│                                     │
│  [preview image: the UI in action]  │
└─────────────────────────────────────┘
```

That is a meaningfully different first impression. It communicates:
- What the product is
- That someone they know initiated it
- That it's fast and low-friction
- That they don't need to create anything

**This needs to be built. It's not a nice-to-have.**

### Platform Reality Check

Rich link previews do not behave uniformly across platforms:

| Platform | Preview Behavior |
|----------|-----------------|
| iMessage (iOS) | Full OG preview rendered inline — title, description, image |
| WhatsApp | Full OG preview rendered inline |
| Instagram DMs | **Largely suppressed.** Meta does not reliably render external link previews in DMs to keep users on platform |
| Android Messages (RCS) | Rendered if the URL is from a known domain |
| Snapchat | Not rendered |

If a significant portion of your users move to Instagram DMs — which is likely given the demographic — the rich preview doesn't help you there. This is a platform risk you need to validate before assuming the preview solves the trust problem universally. The honest answer is: it solves it for iMessage and WhatsApp users, which is probably your largest segment, but not across the board.

---

## The 3-Second Rule: Person B's Landing Page Is the Real Product

Person B clicks the link. What happens in the next 3 seconds determines whether this session completes or dies.

Three seconds is not hyperbole. Research on mobile web landing pages consistently shows that if a user cannot understand what a page is, why it's trustworthy, and what they should do — in 3 seconds — they leave. Person B has additional friction on top of normal landing page bounce: they received this link from someone they've barely met. Their baseline skepticism is higher than a user who sought out a product on their own.

The existing documentation does not treat this landing screen with the gravity it deserves. **This page has higher leverage than any other screen in the product.** It determines whether the two-person mechanic ever fires. A beautiful match reveal UI is worthless if Person B never completes their preferences.

### What Those 3 Seconds Must Communicate

The landing screen needs to answer three questions before anything else happens:

1. **What is this?** — One sentence. Not a paragraph. "Alex wants to plan your first date together."
2. **Why should I trust it?** — Visual cues: clean design, recognizable branding, no ads, no popup asking for email, the other person's first name visible
3. **What do I do right now?** — One button. Not a form. One button.

If the first screen Person B sees is a form with four fields, they are gone. The current DS-02 preference input spec shows exactly this — a GPS request, followed by budget, followed by category selection, all treated as one form. This is the wrong UX for Person B.

---

## The Person B Flow Must Be Redesigned

Currently DS-02 treats Person A and Person B identically. They go through the same preference form in the same order. This is wrong.

Person A initiated this session voluntarily. They have context, they know what Dateflow is, and they're motivated — they want the date to happen. Person A can tolerate a slightly longer setup.

Person B clicked a link from a near-stranger on their phone. They have zero context, zero prior investment in the product, and full permission to close the tab at any moment. They need a completely different experience.

### Proposed Person B Flow (Max 3 Screens, Under 60 Seconds)

**Screen 1 — The Hook (3 seconds)**
```
[Dateflow logo]

Alex wants to plan
your first date.

It takes 60 seconds. No account needed.

[ Add my preferences → ]
```
Nothing else on this screen. No explanation of how the algorithm works. No feature list. One button.

**Screen 2 — Location (one tap ideally)**
```
Where are you based?

[ Use my location ]   ← primary CTA, auto-detects GPS

— or type a neighborhood / zip code —
[ __________________ ]
```
GPS detection on tap means this screen takes 2 seconds if they allow it. The manual input is the fallback, not the default. Do not ask for a full address. A neighborhood or zip code is enough.

**Screen 3 — Vibe (visual, not a form)**
```
What are you up for?

[ 🍽 Food ]  [ 🍸 Drinks ]  [ 🎯 Activity ]  [ 🎲 Surprise me ]

Budget?
[ $  Casual ]  [ $$  Mid-range ]  [ $$$  Upscale ]

[ Find our places → ]
```
Visual chips, large tap targets, no dropdowns, no text input. Both questions on the same screen to reduce navigation. This screen should take under 15 seconds.

**After submission — Loading State**
```
Finding places near both of you...

[animated visual — not a spinner]

"Checking 40+ spots near the midpoint between you and Alex"
```
This is not a dead wait screen. It communicates that something real is happening, that Dateflow is working, and that the result will be relevant to both people specifically. The loading state is doing trust work.

**Total expected time: 30–45 seconds for Person B.**

That is the target. Anything longer and the drop-off rate climbs steeply.

---

## What This Means for the Retention Flywheel

The consumer growth loop is not "the share link goes viral." That framing was in the original strategy and it's too passive. The real loop is:

```
Person B has a seamless 45-second setup
    ↓
Person B sees a great match
    ↓
Person B goes on a good date
    ↓
Person B's next match leads to the same conversation: "we should hang out"
    ↓
Person B, now Person A, remembers Dateflow solved this last time
    ↓
Person B becomes Person A and sends the next link
```

This loop only fires if Person B's first experience is fast, smooth, and results in something that feels like magic — a match that neither person had to awkwardly negotiate. If Person B bounces before completing their preferences, the loop is dead on arrival. Every percentage point of improvement in Person B's setup completion rate compounds directly into the growth rate.

This means the Person B landing page and preference input flow are not UI polish. They are the growth engine. They should be treated with the same engineering and design priority as the core swipe mechanic.

---

## What Needs to Change in Existing Documents

### DS-02 — Preference Input

**Problem:** Person A and Person B are treated identically. The flow spec shows one preference form for both roles without distinguishing the UX context.

**What needs to change:**
- Split the flow into two explicitly separate paths: Person A (initiated session, higher tolerance) and Person B (cold link click, 3-second window)
- Person B's flow should be maximum 3 screens as described above
- The state diagram should show Person B's landing screen as a distinct state before preference input begins — a "hook screen" that precedes the form
- The flowchart should branch at "User opens preference form" based on role
- The GPS permission request for Person B should be a primary CTA on a dedicated screen, not a conditional branch buried in a form

### User Stories — US-02 and US-03

**US-02 (Send an invite link):** Currently scored entirely on link generation mechanics. The story says nothing about what the link looks like when it lands. A new acceptance criterion needs to be added: the generated URL must produce a rich Open Graph preview with a title that includes Person A's name and a description that communicates the product in one line. This is not optional polish — it is part of the story's definition of done.

**US-03 (Join a session via link, no install):** The story correctly identifies Person B as the most fragile conversion point but its framing is about technical access (no App Store redirect, no account creation). The acceptance criteria need to explicitly cover the landing experience: Person B's first screen must communicate what the product is and what to do next within 3 seconds, contain a single primary action, and require no scrolling on a standard mobile viewport.

**New story needed — US-02a: Rich link preview in messaging apps**
This story does not exist and it should be in the active backlog:

> *As Person A, I want the link I share to display a rich preview in iMessage and WhatsApp showing the other person's name and what Dateflow does, so that Person B understands what they're clicking before they tap.*

This is a Small story (OG meta tags + a designed preview image) with high value at the most critical conversion point.

### strategy.md — Channel 2: The Share Link as the Ad

The section currently says: *"Person B has never heard of Dateflow. They open a link that says 'Aiden wants to plan a date. Here's how it works.'"*

This description doesn't acknowledge that the link is being sent via iMessage or Instagram DMs, not via the dating app. The section needs to be updated to reflect:
1. The link is shared in a messaging app, not in-app
2. The rich preview is the actual first impression
3. Instagram DMs are a platform risk (previews suppressed)
4. Person B's landing page is the most important design investment in the product

### overview.md — Core User Flow

Step 2 currently reads: *"Person A generates a shareable link and sends it to Person B."*

This needs to acknowledge where that send happens — almost always in a messaging app. The overview should note that the link preview design is part of the core flow, not an implementation detail.

### pivot-b2b-strategy.md — Consumer Demo Section

The pivot doc correctly identifies the consumer app as a sales tool for B2B deals, but the "how to get real users" section is under-specified given this insight. The scrappy consumer acquisition approach should explicitly target the iMessage/WhatsApp distribution channel, since that's where the natural link-sharing behavior already happens. Getting 100 completed sessions is easier if the link preview is compelling from day one.

---

## Priority Order for Addressing These Gaps

1. **Person B landing screen design** — highest leverage item in the entire product, must be specced before any frontend work begins on the join flow
2. **DS-02 Person B flow** — split the preference input spec into two distinct paths before it gets built
3. **Rich link preview (OG tags)** — small build, massive impact on Person B conversion; ship with the first version of the share link
4. **US-02a** — add to active backlog, treat as part of the share link story scope
5. **US-03 acceptance criteria** — update to explicitly cover the 3-second landing screen requirement
6. **strategy.md Channel 2** — update to reflect messaging app reality and Instagram DM risk
