"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { AuthSheet } from "../../../../components/auth-sheet";
import {
  buildAuthRequest,
  validateAuthSubmission,
} from "../../../../components/auth-sheet-state";
import { Button } from "../../../../components/button";
import { CategoryIcon } from "../../../../components/category-icon";
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

  const sharedLikeCopy = matchedWithName
    ? `You and ${matchedWithName} both liked this spot.`
    : "You both liked this spot.";

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
        window.localStorage.setItem("dateflow:auth-token", payload.token);
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
              {sharedLikeCopy} The hard part is over.
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

            {authStatus === "saved" ? (
              <section
                className="mt-8 rounded-[1.75rem] border border-success/20 bg-white/88 p-5 shadow-[0_18px_50px_rgba(45,42,38,0.08)] backdrop-blur-sm"
                style={{
                  animation:
                    "savePromptReveal var(--motion-base) var(--ease-enter) both",
                }}
              >
                <p className="text-caption font-semibold uppercase tracking-[0.2em] text-secondary">
                  Saved to your history
                </p>
                <h2 className="mt-3 text-h2 font-semibold text-text">
                  This match is now tied to your account
                </h2>
                <p className="mt-2 max-w-xl text-body text-text-secondary">
                  You can come back to this plan later and save future matches in one place.
                </p>
                {accountEmail ? (
                  <p className="mt-3 text-caption font-medium text-text-secondary">
                    Signed in as {accountEmail}
                  </p>
                ) : null}
              </section>
            ) : (
              <section
                className="mt-8 rounded-[1.75rem] border border-white/70 bg-white/88 p-5 shadow-[0_18px_50px_rgba(45,42,38,0.08)] backdrop-blur-sm"
                style={{
                  animation:
                    "savePromptReveal var(--motion-base) var(--ease-enter) 120ms both",
                }}
              >
                <p className="text-caption font-semibold uppercase tracking-[0.2em] text-secondary">
                  Save this date
                </p>
                <h2 className="mt-3 text-h2 font-semibold text-text">
                  Keep this match in your history
                </h2>
                <p className="mt-2 max-w-xl text-body text-text-secondary">
                  Create an account to revisit this plan, save future matches, and pick up where you left off.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <div className="w-full max-w-sm">
                    <Button
                      onClick={() => {
                        setAuthMode("register");
                        setAuthDraft((current) => ({ ...current, mode: "register" }));
                        setAuthError(null);
                        setAuthOpen(true);
                      }}
                    >
                      Create account
                    </Button>
                  </div>
                  <div className="w-full max-w-sm">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setAuthMode("login");
                        setAuthDraft((current) => ({ ...current, mode: "login" }));
                        setAuthError(null);
                        setAuthOpen(true);
                      }}
                    >
                      Log in
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-caption text-text-secondary">
                  <span className="rounded-full border border-muted bg-bg px-3 py-1.5">
                    No effect on this match
                  </span>
                  <span className="rounded-full border border-muted bg-bg px-3 py-1.5">
                    Google or email
                  </span>
                  <span className="rounded-full border border-muted bg-bg px-3 py-1.5">
                    Continue without account
                  </span>
                </div>
              </section>
            )}
          </div>

          <section
            className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-[0_24px_80px_rgba(45,42,38,0.12)] backdrop-blur-sm"
            style={{
              animation:
                revealMode === "confetti"
                  ? "resultReveal 720ms cubic-bezier(0.2, 1, 0.22, 1) 520ms both"
                  : "resultReveal 520ms cubic-bezier(0.2, 1, 0.22, 1) both",
            }}
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-[linear-gradient(135deg,var(--color-secondary-muted),var(--color-primary-muted))]">
              {galleryImages.length > 0 ? (
                <Image
                  src={galleryImages[0]}
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
              {galleryImages.length > 1 ? (
                <section className="space-y-3" aria-label="Photo gallery">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-caption font-semibold uppercase tracking-[0.18em] text-secondary">
                        Photo gallery
                      </p>
                      <p className="mt-1 text-body text-text-secondary">
                        {galleryImages.length} photos
                      </p>
                    </div>
                    <div className="hidden rounded-full border border-muted bg-bg px-3 py-1.5 text-caption font-medium text-text-secondary sm:inline-flex">
                      Swipe-worthy details
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {galleryImages.slice(0, 3).map((photoUrl, photoIndex) => (
                      <div
                        key={`${photoUrl}-${photoIndex}`}
                        className="relative aspect-[5/4] overflow-hidden rounded-[1.25rem] border border-white/70 bg-bg shadow-[0_10px_24px_rgba(45,42,38,0.08)]"
                      >
                        <Image
                          src={photoUrl}
                          alt={`${venue.name} photo ${photoIndex + 1}`}
                          fill
                          sizes="(max-width: 1024px) 33vw, 150px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-h1 font-semibold text-text">{venue.name}</h2>
                    <p className="mt-2 text-body text-text-secondary">{venue.address}</p>
                  </div>
                  <PriceBadge priceLevel={venue.priceLevel} />
                </div>

                <div className="flex flex-wrap items-center gap-3 text-body text-text-secondary">
                  <div className="inline-flex items-center gap-2 rounded-full bg-secondary-muted px-3 py-1.5 text-secondary">
                    <StarIcon />
                    {venue.rating.toFixed(1)} rating
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary-muted px-3 py-1.5 text-primary">
                    <HeartIcon />
                    {matchedWithName
                      ? `You and ${matchedWithName} both liked this spot`
                      : "You both liked this spot"}
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
