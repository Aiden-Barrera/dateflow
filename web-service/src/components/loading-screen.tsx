"use client";

import { useEffect, useState } from "react";
import { LoadingOrnament } from "./loading-ornament";
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
export function LoadingScreen({ demoMode = false }: { readonly demoMode?: boolean }) {
  const [subtitleIndex, setSubtitleIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSubtitleIndex((prev) => (prev + 1) % SUBTITLES.length);
    }, CYCLE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col justify-center overflow-hidden bg-bg px-6">
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--color-primary)" }}
        aria-hidden="true"
      />
      <div className="absolute top-10 left-6">
        <Logo />
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-10 rounded-[2rem] border border-white/70 bg-white/80 px-8 py-10 text-center shadow-[0_24px_80px_rgba(45,42,38,0.12)] backdrop-blur-sm">
        <LoadingOrnament variant={demoMode ? "demo-deck" : "venue"} />

        <div className="max-w-2xl">
          <p className="text-caption font-semibold uppercase tracking-[0.24em] text-secondary">
            Venue generation
          </p>
          <h1 className="mt-3 text-[clamp(2.5rem,8vw,4rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-text">
            {demoMode ? "Building your demo deck" : "Finding your spots"}
          </h1>
          <p
            key={subtitleIndex}
            className="mt-4 text-body text-text-secondary"
            style={{ animation: "fadeIn 0.4s ease-in" }}
          >
            {demoMode
              ? "Skipping the external APIs and assembling a local demo shortlist."
              : SUBTITLES[subtitleIndex]}
          </p>
        </div>

        <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          <LoadingCard label="Step A" body="Merge both preference profiles" />
          <LoadingCard label="Step B" body="Rank the first four options" />
          <LoadingCard label="Step C" body="Prepare the swipe deck" />
        </div>
      </div>
    </div>
  );
}

function LoadingCard({
  label,
  body,
}: {
  readonly label: string;
  readonly body: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-muted bg-bg/75 px-4 py-4">
      <p className="text-caption font-semibold uppercase tracking-[0.18em] text-secondary">
        {label}
      </p>
      <p className="mt-2 text-body text-text-secondary">{body}</p>
    </div>
  );
}
