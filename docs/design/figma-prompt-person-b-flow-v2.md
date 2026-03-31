# FigmaMake Prompt v2 — Person B Landing Experience

> **Issue:** #12 — DS-02 Person B landing experience (hook → location → vibe)
> **Branch:** `feature/issue-12-person-b-landing`
> **Iteration:** v2 — addresses visual warmth, emotional engagement, color depth, chip discoverability, and CTA anchoring issues from v1.

---

## Prompt

```
CONTEXT — READ THIS FIRST

You are designing the most important conversion flow in the product. The person
viewing these screens (Person B) received a link via text message from someone
they barely know. They have NEVER heard of Dateflow. They have zero investment
in this product. They are one bad impression away from closing the tab.

Every screen must earn trust immediately through visual quality. If the design
looks like a wireframe, a template, or a placeholder — Person B leaves. The
design must feel like a real, polished product from a company that cares about
the experience.

Study these reference apps for visual quality benchmarks:
- Hinge (onboarding flow) — warm gradients, soft illustration, intentional
  typography, never feels empty
- Headspace (sign-up flow) — friendly, warm, illustration-driven, feels safe
- Notion (landing page) — confident whitespace that feels designed, not empty
- Arc Browser (onboarding) — bold typography paired with subtle animations

The gap to close: v1 looked structurally correct but emotionally flat. A
stranger from a text message would not trust it. v2 must feel warm, polished,
and human on first impression.

---

BRAND IDENTITY

Name: Dateflow
Tagline: From "we should hang out" to "we have a plan" in under 2 minutes.
Personality: Warm, confident, low-pressure. Like a friend who's great at
making plans. Not corporate. Not cutesy. Not gamified.
Closest vibe: Hinge meets Headspace — intentional, calming, trustworthy.

Logo: Design a simple wordmark for "Dateflow" in a clean sans-serif. The "D"
or the full word should feel warm — consider a subtle accent color on part of
the wordmark, or a small custom flourish. It needs to look like a real brand,
not plain text in italic.

---

COLOR SYSTEM — TWO ACCENTS, NOT ONE

The v1 design used a single coral for everything — buttons, selections,
progress, loading. This created visual monotony. Fix this with a proper
two-accent system:

Primary accent: A warm coral-rose (#E8615A or similar) — used for primary
CTAs and the most important interactive elements only. Should feel inviting,
not alarming.

Secondary accent: A warm complementary tone — choose ONE of:
  - Muted teal/sage (#5B9A8B) — for progress indicators, secondary buttons,
    chip borders, subtle accents
  - Warm amber/honey (#D4A055) — for highlights, "surprise me", warmth accents
  - Deep rose-brown (#8B5E5E) — for text accents, secondary UI elements

Background: Warm off-white (#FAF8F5 or similar). NOT pure white. Should feel
like natural paper, slightly warm.

Surface: A slightly lighter or slightly elevated white (#FFFFFF) with soft
shadow (0 2px 8px rgba(0,0,0,0.06)) to create depth. Cards and input fields
use this.

Text primary: Warm near-black (#2D2A26). NOT pure #000000.
Text secondary: Warm medium gray (#7A756E).
Success: A real green (#4CAF7A or similar) — NOT the primary accent.
Error: Deep red (#C94545).

CRITICAL: The background, surface, and interactive elements must have enough
contrast that you can clearly see where one ends and another begins. The v1
palette was too monochrome — background, surface, and muted were nearly
identical.

---

TYPOGRAPHY

Font: Inter or DM Sans (modern, warm, highly legible on mobile).

Scale:
- Display: 36px / Bold / 1.2 line-height — used once per screen for the
  main message (e.g., "Alex wants to plan your first date.")
- Heading 1: 28px / Semibold / 1.3 line-height — screen headings
- Heading 2: 20px / Semibold / 1.4 line-height — section headings
- Body: 16px / Regular / 1.5 line-height — descriptions, subtitles
- Caption: 14px / Regular / 1.5 line-height — helper text, labels
- Button: 16px / Semibold / 1.0 line-height — all button text

Key change from v1: Headings should use Semibold or Bold, NOT Medium. Medium
headings looked weak and didn't create enough hierarchy.

---

TARGET DEVICE: iPhone 14/15 frame (390x844). All interactive elements must be
thumb-reachable. Minimum touch target: 48px, preferred: 56px.

===================================================================
SCREENS
===================================================================

SCREEN 1 — HOOK SCREEN (path: /plan/[id])

PURPOSE: This is the single most important screen in the entire product.
Person B decides in 2-3 seconds whether to engage or close the tab. It must
feel personal, trustworthy, and effortless.

LAYOUT (top to bottom):
- Top: Dateflow wordmark/logo, small but polished. Centered or left-aligned.
  Must look like a real brand.
- Middle (vertically centered, slight upward bias):
  - A subtle decorative element behind or near the text — a soft gradient
    blob, a minimal line illustration of two people or a location pin, or an
    abstract warm shape. This is what separates "designed" from "wireframe."
    The illustration should be decorative, not literal — think Headspace
    style, not clip art.
  - Main message in Display size: "{Name} wants to plan your first date."
    Person A's name ("Alex") should be in the primary accent color and
    slightly bolder to feel personal. The rest of the sentence in text
    primary.
  - Subtitle in Body size, text secondary: "It takes 60 seconds. No account
    needed."
  - Generous spacing (24-32px) between subtitle and button.
  - CTA button: "Add my preferences" — full-width, primary accent background,
    white text, 56px height, 16px rounded corners, soft shadow.
- Bottom: Nothing. No footer, no nav, no links. Clean negative space.

DESIGN REQUIREMENTS:
- The screen must NOT feel empty. The decorative element (gradient blob,
  illustration, or abstract shape) fills the visual space without adding
  content. Think of how Hinge uses soft gradients and shapes behind text.
- The CTA must be the single most visually dominant element — largest color
  block on screen.
- Overall feeling when Person B opens this: "Oh, this looks nice. Alex set
  something up for us. Let me check it out." Not: "What is this blank page?"

ANTI-PATTERNS TO AVOID:
- Plain text on a flat background with nothing else (this was v1's problem)
- A massive empty area above the content
- Logo that looks like unstyled text
- Button that blends into the background

---

SCREEN 2 — LOCATION

PURPOSE: Get location in one tap (GPS) or a few keystrokes. This screen should
feel fast and effortless.

LAYOUT (top to bottom):
- Top: Progress indicator — two dots or a thin progress bar. Use the secondary
  accent color for the active step, muted for inactive. Show "Step 1 of 2" as
  a caption above or near the indicator.
- Upper area: Small back arrow (left side, subtle) for navigation safety.
- Center:
  - A small decorative icon or illustration above the heading — a friendly
    location pin icon (not a generic map marker — something with personality,
    maybe with a small heart or warmth element).
  - Heading (H1): "Where are you based?"
  - Subtext (Body, text secondary): "We'll find places near both of you."
    This single line explains WHY we need their location — it's not just data
    collection, it serves them.
  - Spacing (24px)
  - Primary CTA: "Use my location" — full-width button, primary accent, with
    a location pin icon left of text. 56px height. This is the dominant action.
  - Spacing (16px)
  - Divider with "or" in the center (thin line — text — thin line), using
    text secondary color.
  - Spacing (16px)
  - Text input field: placeholder "Enter a zip code or city" — surface
    background, 1px border in muted color, rounded corners. 52px height.
    When focused: border changes to primary accent color.
  - "Continue" button appears below the input ONLY when text is entered.
    Styled as secondary button (outlined, not filled) to maintain hierarchy
    below the GPS button.

DESIGN REQUIREMENTS:
- GPS button and manual input must have clearly different visual weight. GPS
  is primary (filled coral). Manual input is secondary (neutral input + subtle
  continue button). v1 made them look equally prominent — three identical
  coral buttons stacked.
- The manual input border must be neutral gray, NOT coral/red. Coral on an
  input field reads as an error state.
- The "Continue" button for manual entry must be secondary style (outlined or
  muted fill), NOT the same style as "Use my location."
- Loading state variant: After GPS tap, button text changes to "Finding you..."
  with a spinner icon. Button goes to a slightly muted state.

---

SCREEN 3 — VIBE

PURPOSE: Collect categories + budget in a few quick taps. This is the meatiest
screen — it has the most interactive elements. Must feel fun, not like a form.

LAYOUT (top to bottom):
- Top: Progress indicator (step 2 of 2, active). Back arrow.
- Section 1 — Categories:
  - Heading (H1): "What sounds good?"
  - Spacing (20px)
  - 2x2 grid of category chips. Each chip:
    - Size: Fill half the content width, 72px tall (generous tap target)
    - Contains: Icon (top or left) + label text
    - UNSELECTED STATE: Surface background (#FFFFFF), visible border (1.5px,
      muted color like #D5D0CA), subtle shadow. Must look clearly tappable —
      like a card you want to press. NOT a barely-visible ghost element.
    - SELECTED STATE: Primary accent fill, white icon + text, no border
      visible. Optional: subtle checkmark in corner.
    - HOVER/PRESS: Slight scale (0.98) and shadow change for tactile feel.
    - Icons: Use simple, clean line icons or emoji-style icons. Each category
      should be instantly recognizable:
      - Food: fork & knife or plate icon
      - Drinks: cocktail glass icon
      - Activity: target/bowling/game icon
      - Event: ticket/confetti icon
  - Spacing (12px)
  - "Surprise me" — styled as a text link with a sparkle icon, centered below
    the grid. Uses the secondary accent color to stand out from the grid but
    not compete with it. Tapping selects all four chips.
  - Spacing (32px)
- Section 2 — Budget:
  - A subtle visual separator between sections — either extra spacing, a thin
    divider line, or a slight background color shift on this section.
  - Heading (H2): "Budget vibe?"
  - Spacing (16px)
  - 3 budget options in a horizontal row, each:
    - Size: One-third of content width, 64px tall (same visual weight as
      category chips — v1 made these too small)
    - Contains: Dollar signs ($, $$, $$$) + label (Casual, Mid-range, Upscale)
    - UNSELECTED STATE: Same card treatment as category chips — surface fill,
      visible border, shadow. Clearly tappable.
    - SELECTED STATE: Secondary accent outline (2px) with a very subtle
      secondary accent background tint. NOT the primary accent — this
      differentiates budget selection from category selection visually.
    - Single-select only.
- Bottom:
  - Spacing (24px)
  - CTA: "Find our places" — FIXED/STICKY at the bottom of the viewport.
    Must always be visible, never cut off by scrolling. Full-width, primary
    accent fill, 56px height.
  - DISABLED STATE: When no category or no budget is selected, button is
    muted (#D5D0CA background, text secondary color text). Must look clearly
    disabled — not just slightly lighter than active.
  - ENABLED STATE: Primary accent fill, white text, slight shadow lift.

DESIGN REQUIREMENTS:
- CRITICAL FIX FROM V1: Unselected chips must look interactive. v1's
  unselected chips had no visible border and blended into the background —
  they looked like labels, not buttons. Every chip must have a visible border,
  subtle shadow, and enough contrast to read as "tap me."
- The "Find our places" button must be fully visible at all times. In v1 it
  was cut off at the bottom of the viewport. Pin it to the bottom with padding.
- Budget options must be the same visual height/weight as category chips. v1
  made budget chips significantly smaller, which made them feel like an
  afterthought.
- Use the secondary accent for budget selection state to create visual variety.
  v1 used coral for everything — categories, budget, buttons — making the
  screen feel monotone.

---

SCREEN 4 — LOADING STATE (after submit)

PURPOSE: Build anticipation during the 3-8 second wait. This is an emotional
moment — "this is really happening, we're planning a date." It should feel
exciting, not like a loading screen.

LAYOUT (centered):
- Center:
  - Animated visual: A radial pulse animation using BOTH accent colors — e.g.,
    primary coral inner circle gently pulsing, with a secondary accent outer
    ring that breathes in and out. Sparkle or star elements that subtly
    twinkle. Should feel premium and alive.
  - Spacing (24px)
  - Primary text (H1): "Finding the best spots for both of you..."
  - Spacing (8px)
  - Secondary text (Caption, text secondary): A rotating set of messages that
    cycle every 2 seconds:
    - "Checking what's nearby..."
    - "Comparing your vibes..."
    - "Almost there..."
  - This cycling text makes the wait feel active and productive, not frozen.
- Bottom area: Subtle Dateflow wordmark in text secondary — small trust anchor.

DESIGN REQUIREMENTS:
- Must not feel like a generic loading screen. The animation should be unique
  to Dateflow — the dual-color pulse represents two people's preferences
  converging.
- The rotating subtitle text is key — it gives the illusion of progress and
  keeps the eye engaged during the wait.
- v1 had a single circle and one line of text on a blank screen. v2 needs
  more visual richness without adding clutter.

===================================================================
COMPONENT LIBRARY
===================================================================

Design each component with ALL of the following states clearly shown
side-by-side:

BUTTONS:
- Primary Default: coral fill, white text, soft shadow, 56px height, 16px
  border-radius
- Primary Hover: slightly darker coral, shadow lift
- Primary Disabled: muted background (#D5D0CA), text secondary text, no
  shadow, cursor not-allowed feel
- Primary Loading: muted coral background, spinner icon + "Finding you..."
  text, not tappable
- Secondary Default: white/surface fill, 1.5px border in muted color, text
  primary text
- Secondary Hover: border darkens, very subtle fill tint

CATEGORY CHIPS (2 variants shown side-by-side):
- Unselected: surface fill, 1.5px visible border (#D5D0CA), subtle drop
  shadow (0 1px 3px rgba(0,0,0,0.08)), icon in text secondary color, label
  in text primary. Must look tappable.
- Selected: primary accent fill, white icon, white label, no visible border,
  subtle inset or check indicator. Clear at a glance.
- Show all 4 chips (Food, Drinks, Activity, Event) in both states.

BUDGET OPTIONS (2 variants shown side-by-side):
- Unselected: Same card treatment as category chips — surface fill, visible
  border, shadow. NOT smaller than category chips.
- Selected: 2px border in secondary accent, very subtle secondary accent
  background tint (5-10% opacity), dollar signs in secondary accent color.
  Visually distinct from category chip selection (which uses primary accent).
- Show all 3 options (Casual, Mid-range, Upscale) in both states.

TEXT INPUT:
- Empty: surface fill, 1.5px border in muted, placeholder text in text
  secondary, 52px height, 12px border-radius
- Focused: border color changes to primary accent (2px), subtle accent
  glow/ring. Label text above input in caption size.
- Filled: same as focused styling but border returns to muted. Input text in
  text primary.
- Error: border in error red, helper text below in error red + caption size.

PROGRESS INDICATOR:
- Show as both dots and thin bar variants so we can pick the better one.
- Active step in secondary accent, inactive in muted.
- Include step label ("Step 1 of 2") in caption size.

COLOR PALETTE:
- Show each color as a large swatch (not tiny squares) with the hex value,
  name, and usage note:
  - Background — page background
  - Surface — cards, inputs, elevated elements
  - Primary Accent — primary CTAs, category chip selection, links
  - Secondary Accent — budget selection, progress indicator, "surprise me",
    visual variety
  - Muted — borders, dividers, disabled elements
  - Text Primary — headings, body text
  - Text Secondary — subtitles, captions, placeholder text
  - Success — confirmation states (must be GREEN, not coral)
  - Error — validation errors, destructive actions

TYPE SCALE:
- Show each level rendered with real example text, not lorem ipsum:
  - Display (36px Bold): "Alex wants to plan your first date."
  - Heading 1 (28px Semibold): "What sounds good?"
  - Heading 2 (20px Semibold): "Budget vibe?"
  - Body (16px Regular): "It takes 60 seconds. No account needed."
  - Caption (14px Regular): "Step 1 of 2"
  - Button (16px Semibold): "Find our places"
```
