# FigmaMake Prompt — Person B Landing Experience

> **Issue:** #12 — DS-02 Person B landing experience (hook → location → vibe)
> **Branch:** `feature/issue-12-person-b-landing`
> **Usage:** Paste the prompt below into FigmaMake. Screenshot the output and bring it back for implementation.

---

## Prompt

```
Design a mobile-first 3-screen flow for "Dateflow" — an AI-powered first date
planning tool. This is the Person B experience: they received a link via text
message from someone they matched with on a dating app. They have zero context
about the product. The entire flow must feel completable in 30-45 seconds.

BRAND FEEL: Warm, confident, low-pressure. Not corporate. Not cutesy. Think
"a friend who's good at making plans." Modern, clean, lots of whitespace.
Rounded corners, soft shadows. The vibe is closer to Hinge than Tinder —
intentional, not gamified.

COLOR DIRECTION: Warm neutral background (off-white or very light warm gray).
One primary accent color (coral/warm red or teal — pick one that feels
inviting, not aggressive). Text in near-black. Avoid pure white backgrounds
and pure black text.

TYPOGRAPHY: One sans-serif font. Large, confident headings. Body text at 16px
minimum (mobile readability). Generous line height.

TARGET DEVICE: iPhone 14/15 frame (390×844). Everything must be thumb-reachable.

---

SCREEN 1 — HOOK SCREEN (path: /plan/[id])

Purpose: Build trust and get one tap. This is NOT a form. Zero input fields.

Content:
- Person A's name displayed prominently: "{Name} wants to plan your first date."
- One subtitle line: "It takes 60 seconds. No account needed."
- One large CTA button: "Add my preferences"
- Dateflow wordmark/logo at top (small, not dominant)
- Nothing else. No navigation, no hamburger menu, no footer links, no scroll.

Design notes:
- The CTA button should be the most visually dominant element on screen
- Person A's name should feel personal — slightly larger or bolder than
  surrounding text
- The screen should feel like a text message conversation, not a product
  landing page
- Generous vertical centering — content floats in the middle of the screen

---

SCREEN 2 — LOCATION

Purpose: Get the user's location in one tap (GPS) or a few keystrokes (manual).

Content:
- Heading: "Where are you based?"
- Primary CTA: Large button "Use my location" with a location pin icon
  - This is the main action — make it visually dominant
  - When tapped, show a brief loading state ("Finding you...") that auto-
    advances to Screen 3
- Secondary fallback: Text link or subtle input below: "Or enter a zip code
  or city"
  - If they type manually, show a simple text input with a "Continue" button
- Progress indicator: subtle dots or step indicator showing 1 of 2 (screens
  2 and 3 only — screen 1 is not part of the progress)

Design notes:
- GPS button should look trustworthy, not alarming (the browser will show its
  own permission dialog)
- Manual input should be visible but clearly secondary — not hidden, not
  equally weighted
- Minimal chrome — no back button needed (though nice to have), no skip option

---

SCREEN 3 — VIBE

Purpose: Collect activity categories and budget in a few taps. Everything on
one screen — no additional navigation.

Content — Section 1 (Categories):
- Heading: "What sounds good?"
- 4 visual chip/pill selectors in a 2x2 grid, each with an icon + label:
  - 🍽 Food
  - 🍸 Drinks
  - 🎯 Activity
  - 🎪 Event
- Multi-select: chips toggle on/off with clear selected state (filled
  background vs outlined)
- Below the grid: "Surprise me" link/chip that selects all four
- Minimum 1 selection required

Content — Section 2 (Budget):
- Subheading: "Budget vibe?"
- 3 visual options in a horizontal row (NOT a dropdown):
  - $ Casual
  - $$ Mid-range
  - $$$ Upscale
- Single-select: one must be chosen, with clear active state

Content — CTA:
- Large button at bottom: "Find our places"
- Button disabled until at least 1 category + 1 budget selected

Design notes:
- Chips should have large tap targets (minimum 48px height, ideally 56px+)
- Selected state should be obvious — not just a subtle border change. Use
  filled background with white text, or a check mark, something unmistakable
- The two sections (categories + budget) should feel like one continuous
  screen, not two separate forms
- Same progress indicator as Screen 2 (now showing step 2 of 2)

---

SCREEN 4 — LOADING/TRANSITION STATE (after submit)

Purpose: Communicate that real work is happening and build anticipation.

Content:
- "Finding the best spots for both of you..."
- An animated visual element (abstract, not a spinner — think pulsing dots,
  a radial animation, or a subtle gradient shift)
- No user action required — this is a passive wait state

Design notes:
- Should feel premium, not loading-screen-y
- The copy "for both of you" is intentional — it tells Person B their input
  matters and is being combined with Person A's

---

ADDITIONAL DELIVERABLES:
- Component variants: button (default, hover, disabled, loading), chip
  (unselected, selected), budget option (unselected, selected), text input
  (empty, focused, filled)
- Color palette swatch with: background, surface, primary accent, text
  primary, text secondary, success, error
- Type scale: heading 1, heading 2, body, caption, button text
```
