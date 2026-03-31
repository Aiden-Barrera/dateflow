# FigmaMake Prompt v3 — Hook Screen + Loading Screen Only

> **Issue:** #12 — DS-02 Person B landing experience (hook → location → vibe)
> **Branch:** `feature/issue-12-person-b-landing`
> **Iteration:** v3 — targeted redesign of screens 1 and 4 only. Screens 2 and 3 from v2 are approved.

---

## Prompt

```
I need you to redesign ONLY 2 screens for a mobile app called Dateflow. The
other screens in this flow are already approved — I am only showing you these
two because they need more visual richness and emotional impact.

CONTEXT: Dateflow is an AI-powered first date planning tool. Person B received
a link via text message from someone they matched with on a dating app. They
have never heard of Dateflow. These screens must earn trust in 2-3 seconds.

EXISTING BRAND SYSTEM (already established — match these exactly):
- Primary accent: Warm coral-rose (~#E07468)
- Secondary accent: Muted teal/sage (~#5B9A8B)
- Background: Warm off-white (#FAF8F5)
- Text primary: Warm near-black (#2D2A26)
- Text secondary: Warm medium gray (#7A756E)
- Font: Clean sans-serif (Inter or DM Sans)
- Logo: "Date" in text primary, "flow" in coral — two-tone wordmark
- Border radius: 12-16px on buttons and cards
- Target device: iPhone 14/15 (390x844)

---

SCREEN 1 — HOOK SCREEN (the most important screen in the entire product)

The previous versions of this screen were structurally correct but emotionally
flat — text and a button floating on a near-blank background. A stranger
opening this from a text message did not feel compelled to engage. This
version must fix that.

THE PROBLEM TO SOLVE: When Person B opens this link, the screen has about
2-3 seconds to communicate three things:
  1. "Someone you know set this up for you" (personal)
  2. "This is a real, polished product" (trustworthy)
  3. "This will be fast and easy" (low effort)

If the screen looks empty, generic, or unfinished — they close the tab.

CONTENT (same as before — do not change the copy):
- Dateflow two-tone wordmark at top (small, centered)
- Main message: "{Name} wants to plan your first date."
  - "Alex" must be in the coral accent color and bold
  - The rest of the sentence in text primary, bold
  - This should be Display size (36px Bold)
- Subtitle: "It takes 60 seconds. No account needed."
  - Body size (16px), text secondary color
- CTA button: "Add my preferences"
  - Full-width, coral background, white text, 56px tall, 16px radius
  - Soft drop shadow to lift it off the background
  - This must be the largest color block on screen

WHAT MUST CHANGE — VISUAL RICHNESS:

1. BACKGROUND TREATMENT: The background must not be a flat solid color. Use
   ONE of these approaches:
   - A very subtle radial gradient — warm off-white in the center fading to a
     slightly warmer/peachy tone at the edges. Think a 3-5% color shift, not
     dramatic. Just enough to feel warm and intentional.
   - OR a large, soft, blurred gradient blob/shape behind the text area — in
     a very faint coral or teal tint (10-15% opacity). Like the ambient color
     blobs you see on modern SaaS landing pages (Linear, Raycast, Vercel).
   The point: the background should feel DESIGNED, not default.

2. DECORATIVE ILLUSTRATION: Add a minimal, abstract decorative element. NOT
   clip art. NOT a literal drawing of two people. Think:
   - Two overlapping soft circles or organic shapes (one coral tinted, one
     teal tinted, both very low opacity — 8-12%) that sit behind the text
     area. They abstractly represent "two people coming together."
   - OR a set of very subtle, thin decorative lines or arcs that frame the
     content — like the minimal geometric decorations Stripe or Linear use.
   - OR a single elegant line illustration (continuous line style) of
     something date-related — a location pin, two paths converging, a small
     heart — positioned above or behind the main text at low opacity.
   The illustration should fill visual space without competing with the text.
   It should be the first thing that makes the screen feel "warm" rather than
   "empty."

3. VERTICAL RHYTHM: The content should sit in the center-to-upper-center of
   the screen (roughly 35-60% from the top), NOT the lower half. The CTA
   button should be positioned with enough space below it to breathe, but the
   main text group should be higher than previous versions. There should be
   visual interest in all three vertical thirds of the screen:
   - Top third: Logo + start of decorative element
   - Middle third: Main text + subtitle
   - Bottom third: CTA button + breathing room

4. TRUST MICRO-DETAIL: Below the CTA button, at the very bottom of the
   screen in caption size (14px, text secondary), add: "No sign-up required"
   with a small lock or shield icon. This is a trust signal — Person B
   doesn't need to create an account or give their email. It answers the
   unspoken question "what am I getting into?"

SHOW 2 VARIANTS of this screen side by side — each using a different
decorative approach from the options above. Label them "Variant A" and
"Variant B" so I can pick my favorite.

---

SCREEN 4 — LOADING STATE (after Person B submits preferences)

The previous version had a nice dual-color animation but the screen still
felt sparse — too much empty space, not enough visual richness for what should
be an exciting anticipation moment.

THE EMOTION TO HIT: "This is real. Something is happening. Our date is being
planned right now." It's the moment before the reveal — like the pause before
opening a gift. It should feel alive and promising.

CONTENT:
- Main text: "Finding the best spots for both of you..."
  - Heading 1 size (28px Semibold), text primary, centered
- Cycling subtitle (shown as one line, but in the real app these rotate every
  2 seconds):
  - "Checking what's nearby..."
  - "Comparing your vibes..."
  - "Almost ready..."
  - Show the first one: "Checking what's nearby..." in Caption (14px), text
    secondary
- Dateflow wordmark at the bottom in text secondary (muted trust anchor)

WHAT MUST CHANGE — VISUAL RICHNESS:

1. ANIMATION/VISUAL CENTERPIECE: The central animation should be larger and
   more visually interesting. Design it as:
   - A set of concentric rings — outermost ring in faint teal (10% opacity),
     middle ring in faint coral (15% opacity), inner circle in solid coral.
     The rings should feel like they're gently pulsing outward, like ripples.
   - Orbiting around the rings: 3-4 small icons or dots that represent the
     categories (a tiny fork, a tiny cocktail glass, a tiny pin, a tiny
     ticket) — in teal and coral, at small size (12-16px). These orbit slowly
     around the center. They represent "we're searching through venues for
     you."
   - Inside the center circle: A subtle sparkle/star element in white or
     light gold.
   The animation should be roughly 160-200px in diameter — bigger than v2's
   version. It should be the visual anchor of the screen.

2. BACKGROUND TREATMENT: Same approach as Screen 1 — not a flat background.
   Use a very subtle radial gradient emanating outward from the animation
   center. Warm off-white at the edges, very slight coral/teal warmth near
   the center. The animation should feel like it's glowing softly into the
   background.

3. VERTICAL BALANCE: The animation should sit slightly above center (40% from
   top). Text below it. Dateflow wordmark anchors the bottom. No large empty
   regions. The screen should feel balanced — visual weight in the top half
   (animation), text weight in the middle, brand anchor at the bottom.

4. PROGRESS FEEL: Below the cycling subtitle, add a very subtle thin
   progress bar (not a percentage — an indeterminate animated bar that slides
   back and forth). Use the secondary accent (teal) at low opacity. Width:
   about 40% of the screen, centered. This gives the subconscious feeling
   that work is being done, without committing to a specific completion time.

SHOW 2 VARIANTS of this screen side by side — one with the orbiting category
icons, one without (just the concentric rings + sparkle). Label them
"Variant A" and "Variant B" so I can compare.

---

DO NOT redesign Screens 2 (Location) or 3 (Vibe) — those are approved.
Only deliver Screen 1 (2 variants) and Screen 4 (2 variants).
```
