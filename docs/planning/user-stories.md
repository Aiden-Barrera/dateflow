# Dateflow — User Stories

## INVEST Framework Reference

Each story is evaluated across six dimensions, scored 1–5:

| Dimension | What it means |
|---|---|
| **I**ndependent | Can be built without requiring another story to be done first |
| **N**egotiable | The details are flexible — not a rigid contract |
| **V**aluable | Delivers clear value to the user or the business |
| **E**stimable | The team can reasonably estimate the work |
| **S**mall | Completable within a single sprint |
| **T**estable | There are clear acceptance criteria |

**Scoring: /30 total. Bottom 4 stories are cut after evaluation.**

---

## User Stories

---

### US-01 — Start a session without an account
**As a first-dater (Person A), I want to start a date planning session without creating an account so that I can use the service immediately with zero commitment.**

**What this is really about:** The single biggest conversion killer for a new tool is the signup wall. The moment Dateflow asks for an email and password before delivering any value, a large percentage of curious first-time users will drop off. This story is about radical accessibility — the product should be useful before it asks anything of the user. It also sets the tone: Dateflow is a lightweight, low-pressure tool, not another app to manage.

**Size: Small**

| I | N | V | E | S | T | Total |
|---|---|---|---|---|---|---|
| 5 | 5 | 5 | 5 | 5 | 5 | **30/30** |

---

### US-02 — Send an invite link to a match
**As a first-dater (Person A), I want to share a generated link with my match so that they can join the planning session from any device without installing anything.**

**What this is really about:** This is the product's entire acquisition flywheel in a single feature. The link is almost always pasted into iMessage, WhatsApp, or Instagram DMs — not sent from inside a dating app. That means the link preview is Person B's actual first impression of Dateflow. A bare UUID URL from a near-stranger looks like a phishing link; a rich preview with Person A's name and a one-line product description looks like a real tool. The quality of this handoff — how easy it is to copy, share, and receive, and what it looks like when it lands — determines whether the two-person mechanic ever fires.

**Acceptance criteria:**
- Generated URL works immediately on mobile web (no app install required)
- URL produces a rich Open Graph preview in iMessage and WhatsApp with: app name, Person A's first name in the title (e.g., "Alex wants to plan your date"), a one-line description, and a preview image
- Copy-to-clipboard action works on iOS and Android mobile browsers

**Size: Small**

| I | N | V | E | S | T | Total |
|---|---|---|---|---|---|---|
| 4 | 5 | 5 | 5 | 5 | 5 | **29/30** |

---

### US-03 — Join a session via link with no install required
**As a first-dater (Person B), I want to join a planning session by opening a link so that I can participate without downloading an app or creating an account.**

**What this is really about:** Person B is the most fragile point in the entire flow. They didn't seek out Dateflow — they received a link in a text conversation from someone they may barely know. They have zero context about the product and higher skepticism than a user who found Dateflow on their own. However, they also have genuine social motivation (they want the date to happen), which means the bar is not as extreme as cold landing page traffic — but it is higher than Person A's. Any unnecessary friction (App Store redirect, account creation, email verification, a form-heavy first screen) will cause abandonment before Person B delivers the preference input that makes the whole product work.

**Acceptance criteria:**
- No app install, no account creation, no email required
- Person B's first screen communicates what the product is and what to do next clearly and quickly — a single primary action, no scrolling required on a standard mobile viewport
- Person B's total preference input flow is maximum 3 screens and completable in under 60 seconds
- Page load is fast enough on a mobile connection that Person B does not see a blank screen (SSR or skeleton UI)

**Size: Small**

| I | N | V | E | S | T | Total |
|---|---|---|---|---|---|---|
| 4 | 5 | 5 | 5 | 5 | 5 | **29/30** |

---

### US-04 — Enter location for nearby suggestions
**As a first-dater, I want to enter my location (or allow GPS detection) so that every venue suggestion is actually reachable for me.**

**What this is really about:** Location is the foundation of the recommendation engine. Without accurate location input from both people, the midpoint calculation is wrong and the venue shortlist is useless. This story also contains an important UX decision: should it be a zip code input, a city search, or a GPS permission request? The answer matters — GPS is most accurate but some users will deny it, especially on a first interaction with an unfamiliar tool.

**Size: Small**

| I | N | V | E | S | T | Total |
|---|---|---|---|---|---|---|
| 3 | 4 | 5 | 5 | 5 | 5 | **27/30** |

---

### US-05 — Set a budget preference
**As a first-dater, I want to indicate my budget range so that I'm never shown venues that are outside what I'm comfortable spending on a first date.**

**What this is really about:** Budget misalignment is one of the most socially uncomfortable mismatches on a first date. Nobody wants to suggest a $200 omakase and realize the other person was expecting casual drinks, or vice versa. This story is about removing that awkwardness entirely by collecting both people's budget ceiling privately and filtering to the intersection. It's also a safety net — neither person has to reveal their financial situation; the system just filters it out quietly.

**Size: Small**

| I | N | V | E | S | T | Total |
|---|---|---|---|---|---|---|
| 3 | 5 | 4 | 5 | 5 | 5 | **27/30** |

---

### US-06 — Select activity category preferences
**As a first-dater, I want to choose what kind of activity I'm open to (restaurant, bar, activity, event, or "surprise me") so that suggestions align with what I actually want to do.**

**What this is really about:** Category selection is the primary input that shapes the recommendation pool. It's also a subtle compatibility signal — if Person A wants a low-key bar and Person B wants an activity, Dateflow needs to either find an overlap or surface both in a way that allows a middle-ground match. The "surprise me" option is important for users who are indifferent — it should expand the search space rather than pick randomly.

**Size: Small**

| I | N | V | E | S | T | Total |
|---|---|---|---|---|---|---|
| 3 | 5 | 4 | 5 | 5 | 5 | **27/30** |

---

### US-07 — Venues filtered for first-date safety
**As a woman going on a first date with someone I met online, I want venue suggestions to be filtered for safety (public, well-lit, independently accessible, easy to leave) so that I feel safe meeting a stranger.**

**What this is really about:** This is the most underserved concern in date planning and the feature with the clearest values statement. Women meeting strangers from dating apps have legitimate safety considerations that no existing tool addresses. "First-date safe" as a default filter — surfacing venues that are public, accessible by transit or rideshare, not too intimate, and easy to exit — is both the right thing to build and a strong product differentiator. It is also a story that women will share with other women.

**Size: Medium**

| I | N | V | E | S | T | Total |
|---|---|---|---|---|---|---|
| 4 | 5 | 5 | 4 | 4 | 4 | **26/30** |

---

### US-08 — Get directions to the matched venue
**As a first-dater, I want to open directions to the matched venue directly from the results page so that I can navigate there without leaving the app to search for it manually.**

**What this is really about:** This is a closure story — the moment of the match is exciting, but if the next step is "now go Google it," the momentum dies. A single "Get Directions" button that deep-links to Google Maps (or Apple Maps on iOS) keeps the energy of the match alive and removes the final logistical hurdle between the plan and the person actually showing up. Small lift, high perceived value.

**Size: Small**

| I | N | V | E | S | T | Total |
|---|---|---|---|---|---|---|
| 3 | 4 | 4 | 5 | 5 | 5 | **26/30** |

---

### US-09 — Add the date to my calendar from the results
**As a first-dater, I want to save the matched venue, date, and time to my calendar directly from the results page so that I don't lose the plan after leaving the app.**

**What this is really about:** A match that never gets committed to a calendar is a match that gets forgotten. Generating an ICS file download (or triggering a Google Calendar add) closes the loop from "we agreed on a place" to "it is on my calendar." This also implicitly creates a sense of mutual commitment — once it's in the calendar, it's a real plan, not a maybe. It's a small feature with an outsized effect on whether the date actually happens.

**Size: Small**

| I | N | V | E | S | T | Total |
|---|---|---|---|---|---|---|
| 3 | 4 | 4 | 5 | 5 | 5 | **26/30** |

---

### US-10 — Swipe on venue options privately before seeing a match
**As a first-dater, I want to independently like or pass on venues without my match seeing my choices until we both agree on the same place so that I can be honest about my preferences without social pressure.**

**What this is really about:** Private swiping is the core mechanic that removes the vulnerability asymmetry (see strategy doc). If swipes were public, users would anchor on each other's choices ("they liked that, so I should too") or perform positivity ("I'll like everything so I seem easy-going"). Private swipes until a mutual match fires is what makes the tool psychologically safe to use honestly — and honest inputs produce better matches.

**Size: Medium**

| I | N | V | E | S | T | Total |
|---|---|---|---|---|---|---|
| 2 | 4 | 5 | 4 | 4 | 5 | **24/30** |

---

### US-11 — See a clear match reveal when both people liked the same venue
**As a first-dater, I want to see a satisfying match reveal the moment both of us have liked the same venue so that the agreed plan feels exciting and confirmed rather than ambiguous.**

**What this is really about:** The match reveal is the product's peak emotional moment — equivalent to the Tinder "It's a Match!" screen but for a concrete plan rather than a vague mutual interest. The design of this moment matters: it should feel like a small celebration, show both people that the choice is mutual, and immediately present the actionable next steps (directions, calendar, share). Getting this moment right is the difference between "oh cool" and "I have to tell my friends about this."

**Size: Medium**

| I | N | V | E | S | T | Total |
|---|---|---|---|---|---|---|
| 2 | 4 | 5 | 4 | 4 | 5 | **24/30** |

---

### US-12 — Suggest venues equidistant from both people
**As a first-dater, I want venue suggestions to be roughly equidistant from where both of us are so that neither person has to travel significantly more than the other.**

**What this is really about:** Travel fairness is an underrated friction point in early dating. If every suggestion is closer to Person A than to Person B, Person B feels like they always have to go out of their way — which creates a subtle power imbalance before the date even starts. Midpoint calculation is a technical feature, but what it represents socially is mutual consideration. It signals that Dateflow is designing for both people equally, not just whoever started the session.

**Size: Medium**

| I | N | V | E | S | T | Total |
|---|---|---|---|---|---|---|
| 3 | 4 | 4 | 4 | 4 | 4 | **23/30** |

---

### US-13 — Load a second and third round of options if no match is found
**As a first-dater, I want the app to automatically surface a new set of venue options if the first round produces no mutual match so that we never hit a dead end without a plan.**

**What this is really about:** The "no match" failure state is the worst possible user experience for a product whose entire job is producing an agreed plan. This story is really about ensuring the product always gives users a path forward. The progressive rounds mechanic (4 → 4 → 4, with the third round expanding constraints) means the app actively works to find something rather than simply shrugging. It also removes the pressure of "what if we don't agree" from the user's mental model before they even start.

**Size: Medium**

| I | N | V | E | S | T | Total |
|---|---|---|---|---|---|---|
| 2 | 4 | 4 | 4 | 3 | 4 | **21/30** |

---

### US-14 — View past sessions as a returning user
**As a returning user who has used Dateflow before, I want to view my past planning sessions so that I can avoid repeating the same venues and track where I've been.**

**What this is really about:** Session history is a retention feature — it gives returning users a reason to have an account and a reason to come back. It also solves a real annoyance: suggesting the same place to two different people is embarrassing. This story implies account creation is required, which is a Phase 2 concern. In the MVP, there is no history — this story is intentionally deferred.

**Size: Medium**

| I | N | V | E | S | T | Total |
|---|---|---|---|---|---|---|
| 2 | 4 | 3 | 4 | 4 | 4 | **21/30** |

---

### US-15 — Rate how the date went afterward
**As a returning user, I want to give a simple rating after a date so that Dateflow improves its recommendations for me over time.**

**What this is really about:** Post-date feedback is how the recommendation engine gets smarter over time — it's the data flywheel that turns Dateflow from a generic shortlist generator into a personalized planner. However, this story requires the user to return to the app after the date, which has a low natural rate without a reminder. It also requires account linkage to tie the rating to future recommendations. This is a Phase 3 feature — the intelligence layer depends on having enough users and sessions for the data to be meaningful.

**Size: Medium**

| I | N | V | E | S | T | Total |
|---|---|---|---|---|---|---|
| 2 | 4 | 3 | 4 | 4 | 4 | **21/30** |

---

### US-16 — Suggestions are appropriate for the time of day
**As a first-dater, I want venue suggestions to be filtered by the time of day (e.g., not showing dinner-only spots for a 3pm date) so that the results are actually relevant to when we're meeting.**

**What this is really about:** Time-of-day relevance is a quality-of-life detail — surfacing a venue that's only open for dinner at 2pm, or a brunch spot at 9pm, makes the product feel careless. This is less a strategic story and more a polish story. Google Places data includes hours, so the filter is technically straightforward. Its relatively lower INVEST score reflects that it's a refinement on top of the core mechanic, not a standalone value driver.

**Size: Medium**

| I | N | V | E | S | T | Total |
|---|---|---|---|---|---|---|
| 4 | 4 | 3 | 3 | 3 | 3 | **20/30** |

---

### US-17 — Dating app embeds Dateflow via API
**As a dating app product team, I want to integrate Dateflow's planning engine into my app via API so that my users can plan their first dates without leaving our platform.**

**What this is really about:** This is the B2B distribution play — Dateflow as infrastructure rather than a consumer product. A single partnership with a mid-size dating app delivers more session volume than months of consumer marketing. However, this story is very large, has significant external dependencies (API contract design, partner authentication, white-label rendering), and is not estimable at the MVP stage. It belongs in Phase 2 after the core product is proven. Its low INVEST score reflects size and estimability, not strategic importance.

**Size: XLarge**

| I | N | V | E | S | T | Total |
|---|---|---|---|---|---|---|
| 5 | 4 | 5 | 2 | 1 | 3 | **20/30** |

---

### US-18 — Book a restaurant reservation directly from the match result
**As a first-dater, I want to reserve a table at the matched restaurant without leaving Dateflow so that I can go from "we agreed" to "we're booked" in one step.**

**What this is really about:** Booking integration (OpenTable / Resy) is the most complete form of closing the loop — it transforms Dateflow from a planning tool into a full-service date concierge. It also unlocks the booking commission revenue model. However, it has significant external API dependencies, only applies to the subset of venues that are restaurants with OpenTable/Resy availability, and adds meaningful engineering complexity. It belongs in Phase 2 after the core swipe-and-match flow is validated.

**Size: Large**

| I | N | V | E | S | T | Total |
|---|---|---|---|---|---|---|
| 2 | 3 | 4 | 3 | 2 | 4 | **18/30** |

---

## INVEST Rankings — All Stories

| Rank | ID | Story | Size | Score |
|---|---|---|---|---|
| 1 | US-01 | Start a session without an account | S | **30** |
| 2 | US-02 | Send an invite link to a match | S | **29** |
| 3 | US-03 | Join a session via link, no install | S | **29** |
| 4 | US-04 | Enter location for nearby suggestions | S | **27** |
| 5 | US-05 | Set a budget preference | S | **27** |
| 6 | US-06 | Select activity category preferences | S | **27** |
| 7 | US-07 | Venues filtered for first-date safety | M | **26** |
| 8 | US-08 | Get directions to the matched venue | S | **26** |
| 9 | US-09 | Add the date to my calendar | S | **26** |
| 10 | US-10 | Swipe on venues privately | M | **24** |
| 11 | US-11 | Match reveal when both liked the same venue | M | **24** |
| 12 | US-12 | Venues equidistant from both people | M | **23** |
| 13 | US-13 | Second/third round if no match | M | **21** |
| 14 | US-14 | View past sessions | M | **21** |
| ~~15~~ | ~~US-15~~ | ~~Rate how the date went~~ | ~~M~~ | ~~**21**~~ |
| ~~16~~ | ~~US-16~~ | ~~Time-of-day appropriate suggestions~~ | ~~M~~ | ~~**20**~~ |
| ~~17~~ | ~~US-17~~ | ~~Dating app embeds Dateflow via API~~ | ~~XL~~ | ~~**20**~~ |
| ~~18~~ | ~~US-18~~ | ~~Book a reservation from match result~~ | ~~L~~ | ~~**18**~~ |

---

## Cut Stories (Bottom 4 by INVEST Score)

The following four stories are **removed from the active backlog**. They are not discarded as ideas — they are deferred to future phases when they will be more estimable, smaller in scope, and better supported by the product foundation.

| ID | Story | Why Cut |
|---|---|---|
| US-15 | Rate how the date went | Requires account infrastructure + post-date re-engagement loop. Not estimable or small enough for MVP. |
| US-16 | Time-of-day appropriate suggestions | Polish feature, not a standalone value driver. Low Estimable and Small scores reflect that it's a filter on top of other unbuilt features. |
| US-17 | Dating app API integration | Strategically important but XL in size, low estimability at current stage. Not Small or Estimable enough to be in the active backlog yet. |
| US-18 | Book a reservation from match result | External API dependencies (OpenTable/Resy), limited venue coverage, large effort for Phase 2+ only. |

---

## Retained Backlog (14 Stories)

The active backlog for planning and development:

| ID | Story | Size | Score |
|---|---|---|---|
| US-01 | Start a session without an account | S | 30 |
| US-02 | Send an invite link to a match | S | 29 |
| US-03 | Join a session via link, no install | S | 29 |
| US-04 | Enter location for nearby suggestions | S | 27 |
| US-05 | Set a budget preference | S | 27 |
| US-06 | Select activity category preferences | S | 27 |
| US-07 | Venues filtered for first-date safety | M | 26 |
| US-08 | Get directions to the matched venue | S | 26 |
| US-09 | Add the date to my calendar | S | 26 |
| US-10 | Swipe on venues privately | M | 24 |
| US-11 | Match reveal when both liked the same venue | M | 24 |
| US-12 | Venues equidistant from both people | M | 23 |
| US-13 | Second/third round if no match | M | 21 |
| US-14 | View past sessions | M | 21 |
