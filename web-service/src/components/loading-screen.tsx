"use client";

import { useEffect, useState } from "react";
import { Logo } from "./logo";

const SUBTITLES = [
  "Checking what's open tonight...",
  "Looking for places you'll both love...",
  "Mixing your vibes together...",
  "Finding the perfect match...",
  "Almost there...",
];

const CYCLE_INTERVAL_MS = 2400;

/**
 * Screen 4 — Loading.
 *
 * Displayed while the API processes preferences and generates venue suggestions.
 * Two animated concentric rings (coral outer, teal inner) + cycling subtitle text
 * create the feeling of real work happening, not just a spinner.
 */
export function LoadingScreen() {
  const [subtitleIndex, setSubtitleIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSubtitleIndex((prev) => (prev + 1) % SUBTITLES.length);
    }, CYCLE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6">
      {/* Logo at top */}
      <div className="absolute top-10">
        <Logo />
      </div>

      {/* Animated rings */}
      <div className="relative flex items-center justify-center">
        {/* Outer ring — coral */}
        <div
          className="absolute h-32 w-32 rounded-full border-4 opacity-40"
          style={{
            borderColor: "var(--color-primary)",
            animation: "spin 3s linear infinite",
            borderTopColor: "transparent",
          }}
          aria-hidden="true"
        />
        {/* Middle ring — teal, counter-spin */}
        <div
          className="absolute h-20 w-20 rounded-full border-4 opacity-60"
          style={{
            borderColor: "var(--color-secondary)",
            animation: "spin 2s linear infinite reverse",
            borderTopColor: "transparent",
          }}
          aria-hidden="true"
        />
        {/* Inner dot */}
        <div
          className="h-3 w-3 rounded-full"
          style={{ background: "var(--color-primary)" }}
          aria-hidden="true"
        />
      </div>

      {/* Text */}
      <div className="mt-12 flex flex-col items-center gap-2 text-center">
        <h1 className="text-h2 font-semibold text-text">
          Finding your spots
        </h1>
        <p
          key={subtitleIndex}
          className="text-body text-text-secondary"
          style={{ animation: "fadeIn 0.4s ease-in" }}
        >
          {SUBTITLES[subtitleIndex]}
        </p>
      </div>
    </div>
  );
}
