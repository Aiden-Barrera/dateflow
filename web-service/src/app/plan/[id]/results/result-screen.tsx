"use client";

import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import { AuthSheet } from "../../../../components/auth-sheet";
import {
  buildAuthRequest,
  validateAuthSubmission,
} from "../../../../components/auth-sheet-state";
import { Button } from "../../../../components/button";
import { Logo } from "../../../../components/logo";
import { PriceBadge } from "../../../../components/price-badge";
import type { MatchResult } from "../../../../lib/types/match-result";
import type { Category } from "../../../../lib/types/preference";
import {
  clearStoredSessionLink,
  loadStoredSessionLink,
} from "../../../../lib/session-link-storage";
import {
  getStoredAccountSummary,
  setStoredAuthToken,
  setStoredAccountSummary,
} from "../../../../lib/auth-token-storage";
import { beginAppleLogin, beginGoogleLogin, submitAuthRequest } from "../../../../lib/auth-client";
import {
  getResultDirectionsHref,
  getResultRevealMode,
  type ResultRevealMode,
} from "./result-screen-state";
import type { AuthDraft, AuthMode } from "../../../../components/auth-sheet-state";

type ResultScreenProps = {
  readonly matchedWithName: string | null;
  readonly matchResult: MatchResult;
  readonly initialAuthStatus?: "idle" | "saved";
  readonly initialAccountEmail?: string | null;
};

const CATEGORY_LABELS: Record<Category, string> = {
  RESTAURANT: "Restaurant",
  BAR: "Bar",
  ACTIVITY: "Activity",
  EVENT: "Event",
};

export function ResultScreen({
  matchedWithName,
  matchResult,
  initialAuthStatus = "idle",
  initialAccountEmail = null,
}: ResultScreenProps) {
  const { venue } = matchResult;
  const galleryImages = getVenueGalleryImages(venue);
  const heroImage = galleryImages[0] ?? null;
  const sharedLikeCopy = matchedWithName
    ? `You and ${matchedWithName} both liked this spot.`
    : "You both liked this spot.";
  const matchedDateLabel = matchResult.matchedAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  const venueSummary = getVenueSummary({
    sharedLikeCopy,
    venue,
    matchedDateLabel,
  });
  const [directionsUrl, setDirectionsUrl] = useState(() =>
    getResultDirectionsHref(venue, ""),
  );
  const [revealMode, setRevealMode] = useState<ResultRevealMode>("fade");
  const [authMode, setAuthMode] = useState<AuthMode>("register");
  const [authOpen, setAuthOpen] = useState(false);
  const [authStatus, setAuthStatus] = useState<"idle" | "saved">(
    initialAccountEmail ? "saved" : initialAuthStatus,
  );
  const [accountEmail, setAccountEmail] = useState<string | null>(initialAccountEmail);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authDraft, setAuthDraft] = useState<AuthDraft>({
    mode: "register",
    email: "",
    password: "",
  });

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const summary = getStoredAccountSummary(window.localStorage);

    if (summary?.email) {
      setAccountEmail(summary.email);
      setAuthStatus("saved");
    }
  }, []);

  async function handleAuthSubmit(): Promise<void> {
    const validation = validateAuthSubmission(authDraft);

    if (!validation.valid) {
      setAuthError(validation.error);
      return;
    }

    setAuthSubmitting(true);
    setAuthError(null);

    try {
      const sessionLink =
        typeof window === "undefined"
          ? null
          : loadStoredSessionLink(window.localStorage);
      const request = buildAuthRequest(authDraft, sessionLink);
      const payload = await submitAuthRequest(request.endpoint, request.body);

      if (typeof window !== "undefined" && typeof payload.token === "string") {
        setStoredAuthToken(window.localStorage, payload.token);
        const account =
          payload.account && typeof payload.account === "object"
            ? payload.account
            : null;

        if (
          account &&
          "email" in account &&
          typeof account.email === "string"
        ) {
          setStoredAccountSummary(window.localStorage, {
            email: account.email,
          });
          setAccountEmail(account.email);
        }
        clearStoredSessionLink(window.localStorage);
      }

      setAuthStatus("saved");
      setAuthOpen(false);
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleGoogle(): Promise<void> {
    setAuthSubmitting(true);
    setAuthError(null);

    try {
      const redirectTo =
        typeof window === "undefined"
          ? "/history"
          : `${window.location.origin}/history`;
      const url = await beginGoogleLogin(redirectTo);

      if (typeof window !== "undefined") {
        window.location.href = url;
      }
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
      setAuthSubmitting(false);
    }
  }

  async function handleApple(): Promise<void> {
    setAuthSubmitting(true);
    setAuthError(null);

    try {
      const redirectTo =
        typeof window === "undefined"
          ? "/history"
          : `${window.location.origin}/history`;
      const url = await beginAppleLogin(redirectTo);

      if (typeof window !== "undefined") {
        window.location.href = url;
      }
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
      setAuthSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-bg text-text">
      <AuthSheet
        open={authOpen}
        mode={authMode}
        draft={authDraft}
        errorMessage={authError}
        submitting={authSubmitting}
        onClose={() => setAuthOpen(false)}
        onDraftChange={setAuthDraft}
        onModeChange={(mode) => {
          setAuthMode(mode);
          setAuthDraft((current) => ({ ...current, mode }));
          setAuthError(null);
        }}
        onSubmit={() => void handleAuthSubmit()}
        onGoogle={() => void handleGoogle()}
        onApple={() => void handleApple()}
      />
      {revealMode === "confetti" ? <CelebrationConfetti /> : null}
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

      <div className="mx-auto flex min-h-dvh w-full max-w-[54rem] flex-col px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
        <header className="flex items-center justify-between">
          <Logo />
          <span className="rounded-full border border-white/70 bg-white/85 px-3 py-1 text-caption text-text-secondary shadow-sm backdrop-blur">
            Shared result
          </span>
        </header>

        <div className="mx-auto mt-6 w-full max-w-[41.5rem]">
          <section
            className="relative overflow-hidden rounded-[2.25rem] border border-white/60 shadow-[0_24px_72px_rgba(45,42,38,0.16)]"
            style={{
              animation:
                revealMode === "confetti"
                  ? "resultReveal 720ms cubic-bezier(0.2, 1, 0.22, 1) 520ms both"
                  : "resultReveal 520ms cubic-bezier(0.2, 1, 0.22, 1) both",
            }}
          >
            <div className="relative aspect-[4/5] min-h-[28rem] bg-[linear-gradient(135deg,var(--color-secondary-muted),var(--color-primary-muted))] sm:aspect-[3/4]">
              {heroImage ? (
                <Image
                  src={heroImage}
                  alt={venue.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 664px"
                  loading="eager"
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

              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(250,248,245,0.16),rgba(250,248,245,0.14)_34%,rgba(250,248,245,0.45)_68%,rgba(250,248,245,0.88)_100%)]" />
              <div
                className="absolute inset-x-0 bottom-0 top-0"
                style={{
                  background:
                    "radial-gradient(circle at 50% 52%, rgba(250,248,245,0.08), rgba(250,248,245,0) 34%)",
                }}
                aria-hidden="true"
              />

              <div className="relative z-10 flex h-full flex-col justify-end px-5 pb-20 pt-12 text-center sm:px-8 sm:pb-24">
                <div className="mx-auto w-full max-w-[30rem]">
                  <p className="text-[clamp(3.2rem,10vw,5.8rem)] leading-[0.84] tracking-[-0.06em] text-[#2B211D] [font-family:Georgia,'Times_New_Roman',serif] [font-variant-ligatures:common-ligatures]">
                    It&apos;s a match
                  </p>
                  <p className="mt-5 text-[0.95rem] font-medium text-white/92 sm:text-[1.05rem]">
                    {matchedWithName
                      ? `${matchedWithName} & you both chose`
                      : "You both chose"}
                  </p>
                  <h1 className="mt-4 text-[clamp(2.8rem,8vw,4.6rem)] leading-[0.92] tracking-[-0.05em] text-white [font-family:Georgia,'Times_New_Roman',serif]">
                    {venue.name}
                  </h1>
                  <p className="mt-2 text-[1.05rem] italic text-white/88 [font-family:Georgia,'Times_New_Roman',serif]">
                    {CATEGORY_LABELS[venue.category]}
                  </p>
                </div>
              </div>

              <div className="pointer-events-none absolute left-1/2 top-[43%] z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-black/14 bg-white/72 shadow-[0_10px_24px_rgba(45,42,38,0.12)] backdrop-blur-sm">
                <HeartIcon />
              </div>
            </div>
          </section>

          <section
            className="-mt-14 rounded-[1.85rem] border border-white/80 bg-white/96 p-4 shadow-[0_20px_64px_rgba(45,42,38,0.14)] backdrop-blur sm:p-5"
            style={{
              animation: "savePromptReveal var(--motion-base) var(--ease-enter) 120ms both",
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href={directionsUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full"
              >
                <Button icon={<DirectionsIcon />} className="rounded-full">
                  Get directions
                </Button>
              </a>
              <a
                href={`/api/sessions/${matchResult.sessionId}/calendar`}
                className="w-full"
              >
                <Button
                  variant="secondary"
                  icon={<CalendarIcon />}
                  className="rounded-full border-0 bg-secondary text-white hover:bg-[#4e897b] hover:border-0"
                >
                  Add to calendar
                </Button>
              </a>
            </div>

            <div className="mt-4 border-t border-[#E7DDD2] pt-4">
              <div className="flex items-center justify-center gap-3 text-caption text-text-secondary">
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 transition-colors duration-200 hover:bg-bg"
                >
                  <ShareIcon />
                  Share
                </button>
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-success">
                  <CheckIcon />
                  Saved
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-[2rem] border border-white/75 bg-white/94 p-5 shadow-[0_18px_56px_rgba(45,42,38,0.12)] sm:p-7">
            <div className="grid gap-5 sm:grid-cols-[1.15fr_0.9fr_1.15fr] sm:items-start">
              <InfoBlock
                icon={<LocationPinIcon />}
                label="Location"
                value={venue.address}
              />
              <InfoBlock
                icon={<StarIcon />}
                label="Rating"
                value={`${venue.rating.toFixed(1)} / 5.0`}
              />
              <div className="flex items-start justify-between gap-4">
                <InfoBlock
                  icon={<PriceTagIcon />}
                  label="Price Range"
                  value={`${toPriceLabel(venue.priceLevel)} • ${CATEGORY_LABELS[venue.category]}`}
                />
                <PriceBadge priceLevel={venue.priceLevel} />
              </div>
            </div>

            <div className="mt-6 border-t border-[#E7DDD2] pt-7">
              <h2 className="text-[clamp(2rem,5vw,3.1rem)] leading-[0.95] tracking-[-0.04em] text-text [font-family:Georgia,'Times_New_Roman',serif]">
                About this place
              </h2>
              <p className="mt-4 max-w-3xl text-[1.15rem] leading-8 text-text-secondary">
                {venueSummary}
              </p>

              <div className="mt-7">
                <p className="text-caption font-semibold uppercase tracking-[0.28em] text-text-secondary">
                  Vibes
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {getVibes(venue).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[#E7DDD2] bg-[#F8F1E8] px-4 py-2 text-body text-text-secondary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <details className="mt-6 overflow-hidden rounded-[1.5rem] border border-[#E7DDD2] bg-[#F8F1E8]/90">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-5 text-caption font-semibold uppercase tracking-[0.28em] text-text-secondary">
                  Why this spot works
                  <ChevronDownIcon />
                </summary>
                <div className="border-t border-[#E7DDD2] px-5 py-5 text-body leading-7 text-text-secondary">
                  <p>
                    {sharedLikeCopy} Strong first-date fit, {toPriceLabel(venue.priceLevel)} pricing, and a{" "}
                    {venue.rating.toFixed(1)}-star rating made this one stand out.
                  </p>
                  <p className="mt-3">
                    Matched on {matchedDateLabel}, with a {CATEGORY_LABELS[venue.category].toLowerCase()} setting that stays easy to revisit later.
                  </p>
                </div>
              </details>

              {galleryImages.length > 0 ? (
                <section className="mt-8" aria-label="Photo gallery">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-caption font-semibold uppercase tracking-[0.28em] text-text-secondary">
                      Photo gallery
                    </p>
                    <p className="text-body text-text-secondary">
                      {galleryImages.length} photos
                    </p>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {galleryImages.slice(0, 3).map((photoUrl, photoIndex) => (
                      <div
                        key={`${photoUrl}-${photoIndex}`}
                        className="relative aspect-[4/5] overflow-hidden rounded-[1.4rem] border border-white/70 bg-bg shadow-[0_12px_28px_rgba(45,42,38,0.08)]"
                      >
                        <Image
                          src={photoUrl}
                          alt={`${venue.name} photo ${photoIndex + 1}`}
                          fill
                          sizes="(max-width: 640px) 100vw, 200px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </section>

          {authStatus === "saved" ? (
            <section
              className="mt-8 rounded-[2rem] border border-[#F0D7C2] bg-[linear-gradient(180deg,rgba(253,240,228,0.96),rgba(250,236,223,0.9))] px-6 py-8 text-center shadow-[0_18px_56px_rgba(224,116,104,0.08)]"
              style={{
                animation:
                  "savePromptReveal var(--motion-base) var(--ease-enter) both",
              }}
            >
              <p className="text-caption font-semibold uppercase tracking-[0.32em] text-success">
                Saved to your history
              </p>
              <h2 className="mt-4 text-[clamp(2.4rem,6vw,3.8rem)] leading-[0.95] tracking-[-0.04em] text-text [font-family:Georgia,'Times_New_Roman',serif]">
                This match is in your history
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-[1.1rem] leading-8 text-text-secondary">
                Come back to this plan anytime. Future matches will save here too.
              </p>
              {accountEmail ? (
                <p className="mt-6 text-body text-text-secondary">
                  Signed in as {accountEmail}
                </p>
              ) : null}
            </section>
          ) : (
            <section
              className="mt-8 rounded-[2rem] border border-[#F0D7C2] bg-[linear-gradient(180deg,rgba(253,240,228,0.96),rgba(250,236,223,0.9))] px-6 py-8 text-center shadow-[0_18px_56px_rgba(224,116,104,0.08)]"
              style={{
                animation:
                  "savePromptReveal var(--motion-base) var(--ease-enter) 120ms both",
              }}
            >
              <p className="text-caption font-semibold uppercase tracking-[0.32em] text-secondary">
                Save this date
              </p>
              <h2 className="mt-4 text-[clamp(2.4rem,6vw,3.8rem)] leading-[0.95] tracking-[-0.04em] text-text [font-family:Georgia,'Times_New_Roman',serif]">
                Keep this match in your history
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-[1.1rem] leading-8 text-text-secondary">
                Create a free account to save all your matched dates, track your plans, and never lose a great venue.
              </p>

              <div className="mx-auto mt-6 flex max-w-xl flex-col gap-3 sm:flex-row">
                <div className="w-full">
                  <Button
                    onClick={() => {
                      setAuthMode("register");
                      setAuthDraft((current) => ({ ...current, mode: "register" }));
                      setAuthError(null);
                      setAuthOpen(true);
                    }}
                    className="rounded-full"
                  >
                    Create account
                  </Button>
                </div>
                <div className="w-full">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setAuthMode("login");
                      setAuthDraft((current) => ({ ...current, mode: "login" }));
                      setAuthError(null);
                      setAuthOpen(true);
                    }}
                    className="rounded-full"
                  >
                    Log in
                  </Button>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-caption text-text-secondary">
                <span className="rounded-full border border-[#E7DDD2] bg-white/70 px-3 py-1.5">
                  No effect on this match
                </span>
                <span className="rounded-full border border-[#E7DDD2] bg-white/70 px-3 py-1.5">
                  Google or email
                </span>
                <span className="rounded-full border border-[#E7DDD2] bg-white/70 px-3 py-1.5">
                  Continue without account
                </span>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
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

function LocationPinIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s6-5.68 6-11a6 6 0 1 0-12 0c0 5.32 6 11 6 11Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="10" r="2.25" fill="currentColor" />
    </svg>
  );
}

function PriceTagIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 5H6.75A1.75 1.75 0 0 0 5 6.75v10.5C5 18.22 5.78 19 6.75 19h10.5c.97 0 1.75-.78 1.75-1.75V11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M14 5h5v5M11 13l8-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DirectionsIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m4 12 15-7-4.5 14-3.2-5.3L4 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 4v3M17 4v3M4.75 8.5h14.5M6.75 20h10.5c1.1 0 2-.9 2-2V8a2 2 0 0 0-2-2H6.75a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 8a3 3 0 1 0-2.83-4H12a3 3 0 0 0 .17 1L8.9 7.05A3 3 0 0 0 6 6a3 3 0 1 0 2.9 4.05l3.27 2.05a3 3 0 0 0-.17.95c0 .34.06.66.17.95L8.9 16.05A3 3 0 1 0 9 18c0-.34-.06-.66-.17-.95l3.27-2.05A3 3 0 1 0 15 8Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m5 12.5 4.2 4.2L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoBlock({
  icon,
  label,
  value,
}: {
  readonly icon: ReactNode;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 text-primary">
        {icon}
        <p className="text-caption font-semibold uppercase tracking-[0.28em] text-text-secondary">
          {label}
        </p>
      </div>
      <p className="mt-3 text-[1rem] leading-7 text-text sm:text-[1.1rem]">
        {value}
      </p>
    </div>
  );
}

function getVenueGalleryImages(
  venue: MatchResult["venue"],
): readonly string[] {
  if (venue.photoUrls.length > 0) {
    return venue.photoUrls;
  }

  return venue.photoUrl ? [venue.photoUrl] : [];
}

function toPriceLabel(priceLevel: number): string {
  return "$".repeat(Math.max(1, Math.min(priceLevel, 4)));
}

function getVenueSummary({
  sharedLikeCopy,
  venue,
  matchedDateLabel,
}: {
  readonly sharedLikeCopy: string;
  readonly venue: MatchResult["venue"];
  readonly matchedDateLabel: string;
}): string {
  const tags = getVibes(venue);
  const descriptor = tags.length > 0 ? tags.join(", ") : "thoughtful";

  return `${sharedLikeCopy} Known for ${descriptor}, ${toPriceLabel(venue.priceLevel)} pricing, ${venue.rating.toFixed(1)}-star ratings, and a strong first-date fit, matched on ${matchedDateLabel}.`;
}

function getVibes(venue: MatchResult["venue"]): readonly string[] {
  if (venue.tags.length > 0) {
    return venue.tags.slice(0, 4);
  }

  return [
    venue.rating >= 4.5 ? "top-rated" : "well-liked",
    venue.priceLevel <= 2 ? "easygoing" : "special-night",
    CATEGORY_LABELS[venue.category].toLowerCase(),
  ];
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

function CelebrationConfetti() {
  const particles = [
    { left: "10%", top: "14%", delay: "0ms", x: "-56px", y: "124px", rotate: "-18deg", color: "var(--color-primary)", shape: "circle", size: 10 },
    { left: "14%", top: "8%", delay: "40ms", x: "-24px", y: "150px", rotate: "24deg", color: "var(--color-secondary)", shape: "rect", size: 12 },
    { left: "22%", top: "12%", delay: "90ms", x: "12px", y: "168px", rotate: "-32deg", color: "var(--color-primary)", shape: "rect", size: 9 },
    { left: "28%", top: "6%", delay: "140ms", x: "38px", y: "142px", rotate: "18deg", color: "var(--color-secondary)", shape: "circle", size: 8 },
    { left: "36%", top: "10%", delay: "220ms", x: "54px", y: "164px", rotate: "-24deg", color: "var(--color-primary)", shape: "rect", size: 11 },
    { left: "44%", top: "5%", delay: "160ms", x: "-18px", y: "176px", rotate: "38deg", color: "var(--color-secondary)", shape: "rect", size: 10 },
    { left: "52%", top: "9%", delay: "120ms", x: "16px", y: "154px", rotate: "-14deg", color: "var(--color-primary)", shape: "circle", size: 9 },
    { left: "60%", top: "6%", delay: "260ms", x: "-42px", y: "170px", rotate: "34deg", color: "var(--color-secondary)", shape: "rect", size: 10 },
    { left: "68%", top: "12%", delay: "80ms", x: "22px", y: "148px", rotate: "-28deg", color: "var(--color-primary)", shape: "circle", size: 8 },
    { left: "76%", top: "9%", delay: "180ms", x: "46px", y: "166px", rotate: "20deg", color: "var(--color-secondary)", shape: "rect", size: 12 },
    { left: "84%", top: "13%", delay: "240ms", x: "-14px", y: "156px", rotate: "-22deg", color: "var(--color-primary)", shape: "rect", size: 9 },
    { left: "90%", top: "7%", delay: "300ms", x: "34px", y: "138px", rotate: "28deg", color: "var(--color-secondary)", shape: "circle", size: 10 },
    { left: "8%", top: "22%", delay: "130ms", x: "18px", y: "118px", rotate: "-26deg", color: "var(--color-secondary)", shape: "rect", size: 8 },
    { left: "20%", top: "24%", delay: "170ms", x: "-20px", y: "126px", rotate: "26deg", color: "var(--color-primary)", shape: "circle", size: 7 },
    { left: "32%", top: "20%", delay: "210ms", x: "30px", y: "132px", rotate: "-16deg", color: "var(--color-secondary)", shape: "rect", size: 10 },
    { left: "48%", top: "22%", delay: "250ms", x: "-28px", y: "124px", rotate: "16deg", color: "var(--color-primary)", shape: "rect", size: 8 },
    { left: "64%", top: "20%", delay: "290ms", x: "26px", y: "134px", rotate: "-20deg", color: "var(--color-secondary)", shape: "circle", size: 7 },
    { left: "78%", top: "24%", delay: "330ms", x: "-22px", y: "120px", rotate: "24deg", color: "var(--color-primary)", shape: "rect", size: 9 },
    { left: "88%", top: "19%", delay: "360ms", x: "16px", y: "128px", rotate: "-18deg", color: "var(--color-secondary)", shape: "circle", size: 8 },
  ] as const;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
      aria-hidden="true"
    >
      {particles.map((particle) => (
        <span
          key={`${particle.left}-${particle.top}-${particle.delay}`}
          className={`absolute opacity-0 ${
            particle.shape === "circle" ? "rounded-full" : "rounded-[3px]"
          }`}
          style={{
            left: particle.left,
            top: particle.top,
            width: `${particle.size}px`,
            height: `${particle.size * (particle.shape === "rect" ? 1.5 : 1)}px`,
            background: particle.color,
            "--confetti-x": particle.x,
            "--confetti-y": particle.y,
            "--confetti-rotate": particle.rotate,
            animation:
              `confettiLaunch 1100ms cubic-bezier(0.16, 0.84, 0.32, 1) ${particle.delay} forwards, ` +
              `confettiFloat 1800ms ease-out ${particle.delay} forwards`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
