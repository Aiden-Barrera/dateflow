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
 * Sits on the raspberry canvas (Person B's world) so the transition from
 * the invitation landing feels continuous. A translucent glass card holds
 * the ornament + cycling subtitle.
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
    <div className="bg-person-b relative flex min-h-dvh flex-col justify-center overflow-hidden px-6 text-white">
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: "var(--accent-hot)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-20 left-0 h-80 w-80 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--raspberry-600)" }}
        aria-hidden="true"
      />
      <div className="absolute top-10 left-6 text-white">
        <Logo />
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-10 rounded-[2rem] border border-white/15 bg-white/[0.06] px-8 py-10 text-center shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <LoadingOrnament variant={demoMode ? "demo-deck" : "venue"} />

        <div className="max-w-2xl">
          <p className="text-caption font-semibold uppercase tracking-[0.28em] text-white/70">
            Venue generation
          </p>
          <h1 className="mt-3 text-[clamp(2.5rem,8vw,4rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-white">
            {demoMode ? "Building your demo deck" : "Finding your spots"}
          </h1>
          <p
            key={subtitleIndex}
            className="mt-4 text-body text-white/70"
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
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-4 py-4 text-left backdrop-blur-sm">
      <p className="text-caption font-semibold uppercase tracking-[0.24em] text-white/65">
        {label}
      </p>
      <p className="mt-2 text-body text-white/85">{body}</p>
    </div>
  );
}
