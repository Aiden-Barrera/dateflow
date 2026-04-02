"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "../../../../components/button";
import { CategoryIcon } from "../../../../components/category-icon";
import { Logo } from "../../../../components/logo";
import type { MatchResult } from "../../../../lib/types/match-result";
import type { Category } from "../../../../lib/types/preference";
import {
  getResultDirectionsHref,
  getResultRevealMode,
  type ResultRevealMode,
} from "./result-screen-state";

type ResultScreenProps = {
  readonly creatorName: string;
  readonly matchResult: MatchResult;
};

const CATEGORY_LABELS: Record<Category, string> = {
  RESTAURANT: "Restaurant",
  BAR: "Bar",
  ACTIVITY: "Activity",
  EVENT: "Event",
};

export function ResultScreen({
  creatorName,
  matchResult,
}: ResultScreenProps) {
  const { venue } = matchResult;
  const [directionsUrl, setDirectionsUrl] = useState(() =>
    getResultDirectionsHref(venue, ""),
  );
  const [revealMode, setRevealMode] = useState<ResultRevealMode>("fade");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setDirectionsUrl(getResultDirectionsHref(venue, navigator.userAgent));
      setRevealMode(
        getResultRevealMode(
          window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        ),
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, [venue]);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-bg text-text">
      <div
        className="pointer-events-none absolute -left-20 top-14 h-64 w-64 rounded-full opacity-70 blur-3xl"
        style={{ background: "linear-gradient(135deg, var(--color-primary-muted), transparent)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-16 top-28 h-72 w-72 rounded-full opacity-80 blur-3xl"
        style={{ background: "linear-gradient(135deg, var(--color-secondary-muted), transparent)" }}
        aria-hidden="true"
      />

      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-6 pb-12 pt-8 sm:px-8">
        <header className="flex items-center justify-between">
          <Logo />
          <span className="rounded-full border border-white/60 bg-white/80 px-3 py-1 text-caption text-text-secondary shadow-sm backdrop-blur">
            Shared result
          </span>
        </header>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="max-w-2xl">
            <p className="text-caption font-semibold uppercase tracking-[0.24em] text-secondary">
              Match reveal
            </p>
            <h1 className="mt-4 text-[clamp(3rem,10vw,5.5rem)] font-semibold leading-[0.92] tracking-[-0.05em] text-text">
              It’s a match
            </h1>
            <p className="mt-5 max-w-xl text-[1.05rem] leading-7 text-text-secondary">
              You and {creatorName} both liked this spot. The hard part is over.
              Now you just need the plan.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={directionsUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full max-w-sm"
              >
                <Button>Get directions</Button>
              </a>
              <a
                href={`/api/sessions/${matchResult.sessionId}/calendar`}
                className="w-full max-w-sm"
              >
                <Button variant="secondary">Add to calendar</Button>
              </a>
            </div>
          </div>

          <section
            className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-[0_24px_80px_rgba(45,42,38,0.12)] backdrop-blur-sm"
            style={{ animation: "resultReveal 520ms cubic-bezier(0.2, 1, 0.22, 1)" }}
          >
            {revealMode === "confetti" ? <ConfettiHalo /> : null}
            <div className="relative aspect-[4/3] overflow-hidden bg-[linear-gradient(135deg,var(--color-secondary-muted),var(--color-primary-muted))]">
              {venue.photoUrl ? (
                <Image
                  src={venue.photoUrl}
                  alt={venue.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 520px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-end bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.92),_transparent_55%),linear-gradient(135deg,var(--color-secondary),var(--color-primary))] p-6">
                  <div className="rounded-full border border-white/60 bg-white/15 px-3 py-1 text-caption font-medium text-white backdrop-blur">
                    Photo coming soon
                  </div>
                </div>
              )}

              <div className="absolute left-5 top-5 z-10 flex items-center gap-2 rounded-full bg-white/88 px-3 py-2 text-caption font-medium text-text shadow-sm">
                <CategoryIcon category={venue.category} />
                {CATEGORY_LABELS[venue.category]}
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-h1 font-semibold text-text">{venue.name}</h2>
                    <p className="mt-2 text-body text-text-secondary">{venue.address}</p>
                  </div>
                  <div className="rounded-[1.25rem] bg-primary-muted px-3 py-2 text-right">
                    <div className="text-caption uppercase tracking-[0.18em] text-text-secondary">
                      Price
                    </div>
                    <div className="text-h2 font-semibold text-primary">
                      {toPriceLabel(venue.priceLevel)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-body text-text-secondary">
                  <div className="inline-flex items-center gap-2 rounded-full bg-secondary-muted px-3 py-1.5 text-secondary">
                    <StarIcon />
                    {venue.rating.toFixed(1)} rating
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary-muted px-3 py-1.5 text-primary">
                    <HeartIcon />
                    You and {creatorName} both liked this spot
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {venue.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-muted bg-bg px-3 py-1.5 text-caption font-medium text-text-secondary"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <details className="rounded-[1.5rem] border border-muted bg-bg/70 p-4">
                <summary className="cursor-pointer list-none text-body font-semibold text-text">
                  Why this spot works
                </summary>
                <div className="mt-4 grid gap-3 text-body text-text-secondary sm:grid-cols-2">
                  <div className="rounded-2xl bg-white px-4 py-3">
                    Strong first-date fit with a {venue.rating.toFixed(1)} rating
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    Fits a {CATEGORY_LABELS[venue.category].toLowerCase()} plan with{" "}
                    {toPriceLabel(venue.priceLevel)} pricing
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 sm:col-span-2">
                    Matched on{" "}
                    {matchResult.matchedAt.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>
              </details>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function toPriceLabel(priceLevel: number): string {
  return "$".repeat(Math.max(1, Math.min(priceLevel, 4)));
}

function StarIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 3.75 14.78 9l5.72.78-4.13 4 1 5.72L12 16.98 6.63 19.5l1-5.72-4.13-4L9.22 9 12 3.75Z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 21s-6.72-4.32-9.33-8.35C.96 10.01 1.53 6.5 4.43 4.84c2.35-1.35 4.85-.48 6.1 1.33 1.25-1.81 3.75-2.68 6.1-1.33 2.9 1.66 3.47 5.17 1.76 7.81C18.72 16.68 12 21 12 21Z" />
    </svg>
  );
}

function ConfettiHalo() {
  const particles = [
    { left: "8%", top: "10%", delay: "0ms", color: "var(--color-primary)" },
    { left: "18%", top: "2%", delay: "90ms", color: "var(--color-secondary)" },
    { left: "30%", top: "12%", delay: "160ms", color: "var(--color-primary)" },
    { left: "72%", top: "8%", delay: "40ms", color: "var(--color-secondary)" },
    { left: "84%", top: "15%", delay: "200ms", color: "var(--color-primary)" },
    { left: "90%", top: "4%", delay: "260ms", color: "var(--color-secondary)" },
  ] as const;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={`${particle.left}-${particle.top}`}
          className="absolute h-3 w-3 rounded-full opacity-0"
          style={{
            left: particle.left,
            top: particle.top,
            background: particle.color,
            animation: `confettiBurst 900ms ease-out ${particle.delay} forwards, confettiDrift 1400ms ease-out ${particle.delay} forwards`,
          }}
        />
      ))}
    </div>
  );
}
