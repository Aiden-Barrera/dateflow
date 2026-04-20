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
import { Logo } from "../../../../components/logo";
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
  const venueTypeLabel = getVenueTypeLabel(venue);
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

        <div className="mx-auto mt-6 w-full max-w-[30rem]">
          <section
            className="relative"
            style={{
              animation:
                revealMode === "confetti"
                  ? "resultReveal 720ms cubic-bezier(0.2, 1, 0.22, 1) 520ms both"
                  : "resultReveal 520ms cubic-bezier(0.2, 1, 0.22, 1) both",
            }}
          >
            <div className="border-b border-[#E7DDD2] pb-8 text-center">
              <p className="text-caption font-semibold uppercase tracking-[0.22em] text-text-secondary">
                Match reveal
              </p>
              <div className="mt-6 flex items-center justify-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F8D8D0]">
                  <HeartIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#DDEBE6]">
                  <HeartIcon className="h-5 w-5 text-secondary" />
                </div>
              </div>
              <h1 className="mt-5 text-[clamp(2.6rem,8vw,3.5rem)] leading-[0.95] tracking-[-0.04em] text-text [font-family:Georgia,'Times_New_Roman',serif]">
                It&apos;s a match!
              </h1>
              <p className="mt-3 text-[1.15rem] text-text-secondary">
                {matchedWithName ? (
                  <>
                    You and <span className="text-primary">{matchedWithName}</span> both loved this spot
                  </>
                ) : (
                  "You both liked this spot."
                )}
              </p>
            </div>

            <div className="mt-7 overflow-hidden rounded-[2rem] border border-[#E7DDD2] bg-white shadow-[0_18px_50px_rgba(45,42,38,0.08)]">
              <div className="relative aspect-[4/3] overflow-hidden bg-[#E9E1D7]">
                {heroImage ? (
                  <Image
                    src={heroImage}
                    alt={venue.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 480px"
                    className="object-cover"
                    unoptimized
                  />
                ) : null}
                <button
                  type="button"
                  className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/92 text-text shadow-[0_8px_18px_rgba(45,42,38,0.14)]"
                >
                  <BookmarkIcon />
                </button>
              </div>

              <div className="px-6 pb-6 pt-5">
                <div className="inline-flex rounded-full bg-[#E6F0EB] px-3 py-1 text-caption font-semibold text-secondary">
                  {venueTypeLabel}
                </div>
                <h2 className="mt-4 text-[clamp(2rem,6vw,2.9rem)] leading-[0.98] tracking-[-0.04em] text-text [font-family:Georgia,'Times_New_Roman',serif]">
                  {venue.name}
                </h2>
                <div className="mt-4 grid gap-4 text-body text-text-secondary sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <LocationPinIcon />
                    <span>{venue.address}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <StarRatingIcon />
                    <span>{venue.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-[#ECE3D9] bg-white px-5 py-5 shadow-[0_14px_36px_rgba(45,42,38,0.06)]">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#D98E7A,#7A9B8E)] text-white">
                  <HeartIcon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[1.15rem] font-semibold text-text">Why this works</p>
                  <p className="mt-2 text-[1rem] leading-8 text-text-secondary">
                    Both of you liked activity-forward options. This spot feels playful, memorable, and makes conversation easy, perfect for breaking the ice.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <a
                href={directionsUrl}
                target="_blank"
                rel="noreferrer"
                className="block w-full"
              >
                <Button icon={<DirectionsIcon />} className="h-14 rounded-[1rem] text-[1rem] shadow-[0_12px_26px_rgba(224,116,104,0.18)]">
                  Get directions
                </Button>
              </a>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <a
                  href={`/api/sessions/${matchResult.sessionId}/calendar`}
                  className="col-span-2 w-full"
                >
                  <Button
                    variant="secondary"
                    icon={<CalendarIcon />}
                    className="h-12 w-full rounded-[1rem] !border-0 !bg-[#E7EFE9] !text-secondary shadow-none hover:!bg-[#dbe9e1]"
                  >
                    Calendar
                  </Button>
                </a>
              </div>
            </div>

            {galleryImages.length > 1 ? (
              <section className="mt-6" aria-label="Photo gallery">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-caption font-semibold uppercase tracking-[0.2em] text-text-secondary">
                    Photo gallery
                  </p>
                  <p className="text-caption text-text-secondary">{galleryImages.length} photos</p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2.5">
                  {galleryImages.slice(0, 3).map((photoUrl, photoIndex) => (
                    <div
                      key={`${photoUrl}-${photoIndex}`}
                      className="relative aspect-square overflow-hidden rounded-[1rem] bg-[#E9E1D7]"
                    >
                      <Image
                        src={photoUrl}
                        alt={`${venue.name} photo ${photoIndex + 1}`}
                        fill
                        sizes="(max-width: 640px) 33vw, 120px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </section>

          {authStatus === "saved" ? (
            <section
              className="mt-6 rounded-[1.5rem] border border-[#F0E6DC] bg-[linear-gradient(180deg,rgba(249,243,238,0.98),rgba(245,240,234,0.92))] px-6 py-6 text-center shadow-[0_14px_36px_rgba(45,42,38,0.06)]"
              style={{
                animation:
                  "savePromptReveal var(--motion-base) var(--ease-enter) both",
              }}
            >
              <p className="text-caption font-semibold uppercase tracking-[0.24em] text-text-secondary">
                Saved to your history
              </p>
              <div className="mx-auto mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#D98E7A,#7A9B8E)] text-white">
                <HeartIcon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-[2rem] leading-[1.05] tracking-[-0.03em] text-text [font-family:Georgia,'Times_New_Roman',serif]">
                This date is saved
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-[1rem] leading-7 text-text-secondary">
                Come back to this plan anytime. Future matches will save here too.
              </p>
              {accountEmail ? (
                <p className="mt-4 text-[0.98rem] text-text-secondary">
                  Signed in as {accountEmail}
                </p>
              ) : null}
            </section>
          ) : (
            <section
              className="mt-6 rounded-[1.5rem] border border-[#F0E6DC] bg-[linear-gradient(180deg,rgba(249,243,238,0.98),rgba(245,240,234,0.92))] px-6 py-6 text-center shadow-[0_14px_36px_rgba(45,42,38,0.06)]"
              style={{
                animation:
                  "savePromptReveal var(--motion-base) var(--ease-enter) 120ms both",
              }}
            >
              <p className="text-caption font-semibold uppercase tracking-[0.24em] text-text-secondary">
                Save this date
              </p>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#D98E7A,#7A9B8E)] text-white">
                <HeartIcon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-[2rem] leading-[1.05] tracking-[-0.03em] text-text [font-family:Georgia,'Times_New_Roman',serif]">
                Save your date plans
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-[1rem] leading-7 text-text-secondary">
                Create an account to save this plan and track all your future dates in one place
              </p>

              <div className="mx-auto mt-5 max-w-[15rem]">
                <Button
                  onClick={() => {
                    setAuthMode("register");
                    setAuthDraft((current) => ({ ...current, mode: "register" }));
                    setAuthError(null);
                    setAuthOpen(true);
                  }}
                  className="h-11 rounded-[0.95rem] bg-[#25201C] text-[1rem] text-white hover:bg-[#1d1916]"
                >
                  Create account
                </Button>
              </div>

              <div className="mt-4 flex items-center justify-center gap-4 text-caption text-text-secondary">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setAuthDraft((current) => ({ ...current, mode: "login" }));
                    setAuthError(null);
                    setAuthOpen(true);
                  }}
                  className="cursor-pointer underline decoration-[#CFC4B9] underline-offset-4"
                >
                  Log in
                </button>
                <span className="text-[#C7BDB3]">•</span>
                <span>Continue without account</span>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function LocationPinIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s6-5.68 6-11a6 6 0 1 0-12 0c0 5.32 6 11 6 11Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="10" r="2.25" fill="currentColor" />
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

function BookmarkIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 5.75A1.75 1.75 0 0 1 8.75 4h6.5A1.75 1.75 0 0 1 17 5.75V20l-5-3.1L7 20V5.75Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

function HeartIcon({
  className = "h-4 w-4",
}: {
  readonly className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 20.5c-4.9-3.13-8.5-5.9-8.5-10.02A4.48 4.48 0 0 1 8.02 6c1.57 0 3 .74 3.98 1.93A5.03 5.03 0 0 1 15.98 6a4.48 4.48 0 0 1 4.52 4.48c0 4.12-3.6 6.89-8.5 10.02Z"
        fill="currentColor"
      />
    </svg>
  );
}

function StarRatingIcon() {
  return (
    <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.75 14.78 9l5.72.78-4.13 4 1 5.72L12 16.98 6.63 19.5l1-5.72-4.13-4L9.22 9 12 3.75Z" />
    </svg>
  );
}

function getVenueTypeLabel(venue: MatchResult["venue"]): string {
  const name = venue.name.toLowerCase();

  if (name.includes("skate") || name.includes("rink") || name.includes("roller")) {
    return "Activity";
  }

  return CATEGORY_LABELS[venue.category];
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
