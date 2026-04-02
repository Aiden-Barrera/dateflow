# FigmaMake Prompt — Swipe & Match Experience (DS-04)

> **Feature:** DS-04 — Swipe & Match System
> **Branch:** `feature/ui-discovery-swipe-match`
> **Screens:** 5 screens, 7 total mockups (some with variants)
> **Design decision:** Hinge-inspired hybrid layout (rich venue cards + tap buttons, swipe optional)

---

## Prompt

```
I need you to design the SWIPE & MATCH experience for a mobile-first web app
called Dateflow. This is the core interaction — where two people privately
swipe on AI-curated venue cards and discover their mutual match.

CONTEXT: Dateflow is an AI-powered first date planner. Person A creates a
session, Person B joins via link. Both submit preferences (location, vibe,
budget). The AI generates 12 nearby venue suggestions. Both people swipe
independently — the first mutual like becomes the plan. They swipe in 3
rounds of 4 venues each.

TARGET DEVICE: iPhone 14/15 (390x844), mobile-first web (not native app).
This is a Next.js web app rendered in a mobile browser.

EXISTING BRAND SYSTEM (match these exactly):
- Primary accent: Warm coral-rose (#E07468)
- Secondary accent: Muted teal/sage (#5B9A8B)
- Background: Warm off-white (#FAF8F5)
- Text primary: Warm near-black (#2D2A26)
- Text secondary: Warm medium gray (#7A756E)
- Font: Clean sans-serif (DM Sans or Inter)
- Logo: "Date" in text primary, "flow" in coral — two-tone wordmark
- Border radius: 16px on cards, 12-16px on buttons
- Existing screens use subtle gradient backgrounds (radial warm off-white
  with faint coral/teal tints) and organic decorative shapes

DESIGN FEEDBACK TO ADDRESS: The existing screens are clean and polished but
feel empty — too much white space with no visual richness. This swipe
experience needs to feel ALIVE, warm, and exciting. It's the emotional peak
of the product — "we're choosing where to go together."

---

SCREEN 1 — VENUE SWIPE CARD (the most important screen)

LAYOUT: Hinge-inspired single-card focus layout. NOT a Tinder card stack.
One venue card dominates the screen at a time, with rich detail. The user
should feel like they're evaluating a real place, not speed-swiping through
faces.

CARD STRUCTURE (top to bottom):
1. VENUE PHOTO: Large hero image taking up ~45% of the card height. Full
   width, 16px border radius on top corners. If no photo available, show a
   gradient placeholder in coral-to-teal with a subtle venue category icon
   (fork, cocktail glass, ticket, compass) centered at low opacity.

2. VENUE INFO SECTION (below photo, inside card):
   - Venue name: 20px Semibold, text primary. One line, truncate with
     ellipsis if needed.
   - Category pill: Small rounded pill (e.g., "Restaurant" "Bar" "Activity"
     "Event") — teal background with white text, positioned inline after
     the name or on a new line.
   - Address / neighborhood: 14px, text secondary. One line. Example:
     "East Village · 0.8 mi away"
   - Price indicator: Dollar signs ($ / $$ / $$$) — filled in coral for the
     venue's level, remaining in light gray.
   - AI Match Score: A small circular badge or meter showing how well this
     venue matches both people's preferences. Use a ring/arc in teal that
     fills proportionally (e.g., 87% filled). Label: "87% match" in 12px
     text secondary below the ring. This is a key differentiator from
     other swipe apps — it tells users WHY this venue was chosen.
   - Rating: Small star icon + "4.5" in text secondary, 14px.

3. CARD STYLING:
   - White card background (#FFFFFF) with a soft shadow
     (0 8px 32px rgba(0,0,0,0.08)) to lift it off the warm background
   - 16px border radius all corners
   - 16px horizontal margin from screen edges
   - Card should feel substantial — not floating in empty space

4. ACTION BUTTONS (below the card, fixed to bottom area):
   - Two large circular buttons side by side, centered:
     - LEFT: "Pass" — 64px circle, light gray background (#F0EDEA), dark X
       icon, subtle border
     - RIGHT: "Like" — 64px circle, coral background (#E07468), white heart
       icon, soft coral glow/shadow beneath
   - Spacing: ~40px between buttons, centered horizontally
   - These buttons are the PRIMARY interaction. Swipe gestures are a bonus
     but buttons must work perfectly for tap-only users.
   - Add a subtle scale animation hint: the Like button could have a very
     faint pulse (2-3% scale oscillation) to draw attention

ABOVE THE CARD:
- Round indicator: Show which round and card they're on. Example:
  "Round 1 of 3" in 14px text secondary, centered at top
- Progress dots: 4 dots below the round label, each representing a venue.
  Filled coral dot = swiped, empty dot = upcoming, current dot slightly
  larger or has a ring. This gives a sense of progress within the round.

BACKGROUND TREATMENT:
- NOT flat #FAF8F5. Use a subtle radial gradient — warm off-white center
  fading to a slightly warmer/peachy tone at edges (3-5% shift).
- Add 2-3 large, soft, blurred organic shapes in the background — very low
  opacity (6-10%):
  - One coral-tinted blob in the upper-right area
  - One teal-tinted blob in the lower-left area
  - These should feel atmospheric and ambient, not geometric or precise
- The background shapes should shift slightly between rounds (different
  position/size) to give a sense of progression.

SHOW 2 VARIANTS of this screen side by side:
- Variant A: Clean Hinge-style — venue photo + info stacked vertically,
  action buttons at bottom. More whitespace, more breathing room.
- Variant B: Immersive card — venue photo extends taller (~55% of card),
  venue info overlays the bottom of the photo with a gradient fade from
  transparent to white, making the card feel more editorial/magazine-like.
  Action buttons still at bottom.

---

SCREEN 2 — WAITING FOR PARTNER

This screen appears when one person finishes swiping a round before the
other. It's a pause moment — should feel patient and warm, not anxious.

THE EMOTION: "You're doing great. Your partner is still deciding. This is
exciting — you're both actively planning together right now."

CONTENT:
- Main text: "Waiting for your partner to finish Round 1..."
  - 24px Semibold, text primary, centered
- Subtitle: "You'll both see the next round together."
  - 16px, text secondary, centered
- Animated element: A pair of abstract shapes (one coral, one teal) that
  slowly orbit each other or breathe/pulse in sync — representing two
  people in motion together. Size: ~120px diameter. Positioned above
  the text. Should feel calming, not urgent.
- Progress summary: Below the subtitle, show a subtle recap:
  "You liked 2 of 4 places this round" in 14px text secondary with
  small heart icons for the liked ones.
- Round progress: Show the same round indicator (Round 1 of 3) and 4
  dots as Screen 1, but with all 4 dots filled since the user has
  finished.

BACKGROUND: Same gradient + organic blob treatment as Screen 1, but
the blobs could be slightly more prominent (8-12% opacity) since
there's less content competing for attention.

SHOW 1 VARIANT of this screen.

---

SCREEN 3 — MATCH REVEAL

This is the celebration moment. Both people liked the same venue. This
should feel like a confetti moment — joyful, surprising, rewarding.

THE EMOTION: "You both chose the same place! Your date is planned!"

CONTENT:
1. CELEBRATION HEADER:
   - "It's a match!" in 32px Bold, coral color, centered
   - Confetti or sparkle elements bursting from behind the text — small
     coral and teal particles/shapes/dots scattered outward. Not
     over-the-top — elegant and warm, not a party popper explosion.

2. MATCHED VENUE CARD (centered, prominent):
   - Same card design as Screen 1 but slightly smaller (80% width)
   - Show the venue photo, name, category, and address
   - The AI Match Score should be prominently displayed: "92% match" in
     a larger format (teal ring, fully filled)
   - Add a subtle golden/warm glow around the card (very faint, 5-8%
     opacity warm gold shadow) to make it feel special

3. PARTNER INDICATOR:
   - Below the card: "You and Alex both liked this spot"
   - 16px, text secondary, with two small overlapping circles (one coral,
     one teal) representing the two people — similar to the waiting screen
     animation but now static and unified.

4. CTA BUTTON:
   - "Plan your date" — full width, coral background, white text, 56px
     tall, same style as other screens
   - This leads to DS-05 (Post-Match Actions)

5. SECONDARY ACTION:
   - Below the CTA: "View all results" in 14px, text secondary, underlined
     — lets users see what else they both liked

BACKGROUND: More dramatic version of the gradient — the warm tones can be
slightly more saturated (5-8% coral warmth radiating from center). The
organic blobs can be more visible here (12-15% opacity) to make the
background feel celebratory and warm.

SHOW 2 VARIANTS of this screen:
- Variant A: Confetti burst — small particles exploding outward from behind
  the card when it appears. Elegant, not childish.
- Variant B: Glow reveal — no confetti, but the card has a warm golden
  glow that pulses once when revealed, and the background has subtle
  radial light rays emanating from the card center. More mature/premium
  feel.

---

SCREEN 4 — NO MATCH / ROUND TRANSITION

After all 4 venues in a round are swiped by both people and there's no
mutual like, the next round loads. This is a transition moment.

THE EMOTION: "No worries — there are more options coming. The best is yet
to come."

CONTENT:
- Main text: "No match this round — but more options are coming!"
  - 22px Semibold, text primary, centered
- Subtitle: "Round 2 has 4 new venues picked just for you."
  - 16px, text secondary, centered
- Visual: A simple illustration or icon set showing 4 new venue category
  icons (fork, glass, ticket, compass) fading in from the right,
  replacing the old set. Use coral and teal at 60% opacity.
- CTA: "See Round 2" — full-width coral button
- Round progress: Update the round indicator to show "Round 2 of 3"
  with the first set of 4 dots filled and the second set empty.

SHOW 1 VARIANT of this screen.

---

SCREEN 5 — END OF ALL ROUNDS (NO MATCH)

After all 3 rounds (12 venues) with no mutual match. This is the fallback
state.

THE EMOTION: "That's okay — here's our best suggestion, or you can try
again with adjusted preferences."

CONTENT:
- Main text: "No perfect match yet"
  - 24px Semibold, text primary, centered
- Subtitle: "Here's our best suggestion based on what you both liked."
  - 16px, text secondary, centered
- Suggested venue card: Same card design but with a "Best Match" badge
  in teal (small pill in top-right of the photo). Show the venue that
  had the closest alignment between both users.
- Two CTAs (stacked):
  - Primary: "Accept this suggestion" — full-width coral button
  - Secondary: "Try again with new preferences" — full-width outlined
    button (coral border, coral text, transparent background)
- Small text at bottom: "or start a new session" — 14px, text secondary,
  tappable link

SHOW 1 VARIANT of this screen.

---

DESIGN SYSTEM NOTES FOR ALL SCREENS:
- Use Framer Motion spring physics for card transitions (damping: 20,
  stiffness: 200) — cards should feel physically weighted, not floaty
- All touch targets minimum 44x44px
- Support prefers-reduced-motion — fall back to simple opacity fades
- Swipe gesture on venue card is OPTIONAL, not required — buttons are
  primary interaction
- Cards use translateX for swipe animation, opacity for enter/exit
- Never animate width/height — only transform and opacity for performance
- Keep all animations under 300ms for micro-interactions
- The organic background blobs should use CSS radial-gradient or positioned
  divs with blur, NOT images — for performance and flexibility

DO NOT redesign the existing screens (Hook, Location, Vibe, Loading).
Only deliver the 5 screens described above (Screen 1 in 2 variants,
Screen 2 in 1 variant, Screen 3 in 2 variants, Screen 4 in 1 variant,
Screen 5 in 1 variant). Total: 7 screen mockups.
```
