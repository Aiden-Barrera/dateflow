"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./button";
import { CategoryIcon } from "./category-icon";
import { Logo } from "./logo";
import { createSessionStatusSync } from "../lib/session-status-sync";
import type { BudgetLevel, Category, Location } from "../lib/types/preference";

type CreatedSession = {
  readonly id: string;
  readonly shareUrl: string;
};

type InviteReadyStateProps = {
  readonly sessionId: string;
  readonly shareUrl: string;
  readonly sessionStatus?: InviteReadySessionState;
  readonly copyState: "idle" | "copied";
  readonly errorMessage: string | null;
  readonly onCopyInvite: () => void;
};

type InviteReadySessionState =
  | "pending_b"
  | "ready_to_swipe"
  | "matched"
  | "generation_failed"
  | "expired";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "RESTAURANT", label: "Food" },
  { value: "BAR", label: "Drinks" },
  { value: "ACTIVITY", label: "Activity" },
  { value: "EVENT", label: "Event" },
];

const BUDGETS: { value: BudgetLevel; label: string; symbol: string }[] = [
  { value: "BUDGET", label: "Casual", symbol: "$" },
  { value: "MODERATE", label: "Mid-range", symbol: "$$" },
  { value: "UPSCALE", label: "Upscale", symbol: "$$$" },
];

export function PersonAFlow() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [location, setLocation] = useState<Location | null>(null);
  const [gpsState, setGpsState] = useState<"idle" | "loading">("idle");
  const [categories, setCategories] = useState<Category[]>(["RESTAURANT", "BAR"]);
  const [budget, setBudget] = useState<BudgetLevel>("MODERATE");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdSession, setCreatedSession] = useState<CreatedSession | null>(null);
  const [createdSessionStatus, setCreatedSessionStatus] =
    useState<InviteReadySessionState>("pending_b");
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  const canSubmit =
    name.trim().length > 0 &&
    (location !== null || locationLabel.trim().length > 0) &&
    categories.length > 0 &&
    !submitting;

  function toggleCategory(category: Category) {
    setCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }

  function handleUseLocation() {
    if (!navigator.geolocation) {
      setError("Location access is unavailable in this browser.");
      return;
    }

    setError(null);
    setGpsState("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: "Current Location",
        });
        setLocationLabel("Current Location");
        setGpsState("idle");
      },
      () => {
        setGpsState("idle");
        setError("We couldn't access your location. Enter your city or zip instead.");
      },
    );
  }

  async function handleCreateSession() {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setError(null);

    const resolvedLocation =
      location ??
      ({
        lat: 0,
        lng: 0,
        label: locationLabel.trim(),
      } satisfies Location);

    try {
      const sessionResponse = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorDisplayName: name.trim() }),
      });
      const sessionBody = await sessionResponse.json();

      if (!sessionResponse.ok) {
        throw new Error(sessionBody.error ?? "Couldn't create a session.");
      }

      const sessionId = sessionBody.session.id as string;
      const shareUrl = sessionBody.shareLink.url as string;

      const preferenceResponse = await fetch(`/api/sessions/${sessionId}/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "a",
          location: resolvedLocation,
          budget,
          categories,
        }),
      });
      const preferenceBody = await preferenceResponse.json().catch(() => ({}));

      if (!preferenceResponse.ok) {
        throw new Error(
          preferenceBody.error ?? "Session created, but your preferences were not saved.",
        );
      }

      setCreatedSession({
        id: sessionId,
        shareUrl,
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyInvite() {
    if (!createdSession) {
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.clipboard ||
      typeof navigator.clipboard.writeText !== "function"
    ) {
      setError("Copy is not available here yet. Please copy the invite link manually.");
      return;
    }

    try {
      await navigator.clipboard.writeText(createdSession.shareUrl);
      setCopyState("copied");
      setError(null);
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setError("We couldn't copy the invite link. Please copy it manually.");
    }
  }

  useEffect(() => {
    const createdSessionId = createdSession?.id;

    if (!createdSessionId) {
      return;
    }

    let active = true;
    const sync = createSessionStatusSync(createdSessionId, (snapshot) => {
      if (!active) {
        return;
      }

      setCreatedSessionStatus(getInviteReadySessionStatus(snapshot.status));
    });

    return () => {
      active = false;
      sync.stop();
    };
  }, [createdSession?.id]);

  useEffect(() => {
    if (!createdSession) {
      return;
    }

    const redirectHref = getInviteReadyRedirectHref(
      createdSession.id,
      createdSessionStatus,
    );

    if (!redirectHref) {
      return;
    }

    router.push(redirectHref);
  }, [createdSession, createdSessionStatus, router]);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-bg text-text">
      <div
        className="pointer-events-none absolute -left-16 top-10 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "var(--color-primary-muted)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-0 top-24 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "var(--color-secondary-muted)" }}
        aria-hidden="true"
      />

      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-6 pb-12 pt-8 sm:px-8 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:pb-16">
        <section className="relative z-10 flex flex-col justify-between">
          <div>
            <Logo />
            <h1 className="mt-10 max-w-2xl text-[clamp(3.2rem,10vw,6.8rem)] font-semibold leading-[0.92] tracking-[-0.06em]">
              Build the date invite before the vibe goes cold.
            </h1>
            <p className="mt-5 max-w-xl text-body text-text-secondary">
              Start the session, set your preferences, and send one clean link.
              For demo mode, you can open the invite yourself and run the full Person B journey.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <StatCard label="Time to start" value="60 sec" />
            <StatCard label="Accounts" value="None" />
            <StatCard label="Demo path" value="Built in" />
          </div>
        </section>

        <section className="relative z-10 mt-10 rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_24px_80px_rgba(45,42,38,0.12)] backdrop-blur-sm sm:p-7 lg:mt-0">
          {!createdSession ? (
            <div className="space-y-6">
              <div>
                <p className="text-caption font-semibold uppercase tracking-[0.24em] text-primary">
                  Setup
                </p>
                <h2 className="mt-2 text-h1 font-semibold">Create your invite</h2>
              </div>

              <label className="block">
                <span className="mb-2 block text-caption font-semibold uppercase tracking-[0.18em] text-text-secondary">
                  Your first name
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Alex"
                  className="h-14 w-full rounded-2xl border-[1.5px] border-muted bg-surface px-4 text-body text-text placeholder:text-text-secondary/55 focus:border-primary focus:outline-none"
                />
              </label>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-caption font-semibold uppercase tracking-[0.18em] text-text-secondary">
                    Your area
                  </span>
                  <button
                    onClick={handleUseLocation}
                    className="cursor-pointer text-caption font-semibold text-secondary transition-colors hover:text-secondary/75"
                  >
                    {gpsState === "loading" ? "Finding you..." : "Use my location"}
                  </button>
                </div>
                <input
                  value={locationLabel}
                  onChange={(event) => {
                    setLocation(null);
                    setLocationLabel(event.target.value);
                  }}
                  placeholder="Brooklyn or 11211"
                  className="h-14 w-full rounded-2xl border-[1.5px] border-muted bg-surface px-4 text-body text-text placeholder:text-text-secondary/55 focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-caption font-semibold uppercase tracking-[0.18em] text-text-secondary">
                    What sounds good?
                  </span>
                  <button
                    onClick={() => setCategories(CATEGORIES.map((category) => category.value))}
                    className="cursor-pointer text-caption font-semibold text-secondary transition-colors hover:text-secondary/75"
                  >
                    Surprise me
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {CATEGORIES.map((category) => {
                    const selected = categories.includes(category.value);

                    return (
                      <button
                        key={category.value}
                        onClick={() => toggleCategory(category.value)}
                        className={`flex h-[78px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] transition-all duration-200 active:scale-[0.97] ${
                          selected
                            ? "border-primary bg-primary text-white shadow-sm"
                            : "border-muted bg-surface text-text shadow-sm hover:border-text-secondary"
                        }`}
                      >
                        <CategoryIcon category={category.value} className="h-5 w-5" />
                        <span className="text-body font-semibold">{category.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-caption font-semibold uppercase tracking-[0.18em] text-text-secondary">
                  Budget vibe
                </span>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {BUDGETS.map((option) => {
                    const selected = budget === option.value;

                    return (
                      <button
                        key={option.value}
                        onClick={() => setBudget(option.value)}
                        className={`flex h-[68px] cursor-pointer flex-col items-center justify-center rounded-2xl border-[1.5px] transition-all duration-200 active:scale-[0.97] ${
                          selected
                            ? "border-secondary bg-secondary-muted text-secondary"
                            : "border-muted bg-surface text-text shadow-sm hover:border-text-secondary"
                        }`}
                      >
                        <span className="text-body font-bold">{option.symbol}</span>
                        <span className="text-caption">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {error ? <p className="text-body text-error">{error}</p> : null}

              <Button onClick={handleCreateSession} disabled={!canSubmit} loading={submitting}>
                Create invite link
              </Button>
            </div>
          ) : (
            <InviteReadyState
              sessionId={createdSession.id}
              shareUrl={createdSession.shareUrl}
              sessionStatus={createdSessionStatus}
              copyState={copyState}
              errorMessage={error}
              onCopyInvite={handleCopyInvite}
            />
          )}
        </section>
      </div>
    </main>
  );
}

export function InviteReadyState({
  sessionId,
  shareUrl,
  sessionStatus = "pending_b",
  copyState,
  errorMessage,
  onCopyInvite,
}: InviteReadyStateProps) {
  const liveSessionLabel =
    sessionStatus === "matched"
      ? "View your result"
      : sessionStatus === "ready_to_swipe"
        ? "Continue to your swipe deck"
        : sessionStatus === "expired"
          ? "Start a new session"
          : sessionStatus === "generation_failed"
            ? "Open live session"
        : "Open live session";
  const liveSessionHref = sessionStatus === "expired" ? "/" : `/plan/${sessionId}`;
  const statusMessage =
    sessionStatus === "expired"
      ? "This invite expired before the plan came together. Start a new session and send a fresh link."
      : sessionStatus === "generation_failed"
        ? "Venue generation hit a snag. Reopen the live session to retry or start over if the problem keeps happening."
        : "Share this link with your date, then come back here once they join.";

  return (
    <div className="space-y-6">
      <div className="rounded-[1.75rem] bg-[linear-gradient(140deg,#1f1a16,#57473c)] p-6 text-white shadow-[0_20px_50px_rgba(45,42,38,0.24)]">
        <p className="text-caption font-semibold uppercase tracking-[0.22em] text-white/70">
          Invite sent
        </p>
        <h2 className="mt-3 text-h1 font-semibold">
          Your side is set. Now hand off the link.
        </h2>
        <p className="mt-3 max-w-xl text-body text-white/80">
          {statusMessage}
        </p>
      </div>

      <div className="rounded-[1.5rem] border border-muted bg-bg p-4">
        <p className="text-caption font-semibold uppercase tracking-[0.18em] text-text-secondary">
          Share link
        </p>
        <p className="mt-3 break-all text-body font-medium">{shareUrl}</p>
      </div>

      <div className="grid gap-3">
        <Button onClick={onCopyInvite}>
          {copyState === "copied" ? "Copied invite link" : "Copy invite link"}
        </Button>
        <a
          href={liveSessionHref}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-muted bg-surface text-body font-semibold text-text transition-all duration-200 hover:border-text-secondary active:scale-[0.98] h-14 cursor-pointer"
        >
          {liveSessionLabel}
        </a>
      </div>

      {errorMessage ? <p className="text-body text-error">{errorMessage}</p> : null}
    </div>
  );
}

export function getInviteReadySessionStatus(status: string): InviteReadySessionState {
  if (status === "ready_to_swipe" || status === "fallback_pending") {
    return "ready_to_swipe";
  }

  if (status === "matched") {
    return "matched";
  }

  if (status === "generation_failed") {
    return "generation_failed";
  }

  if (status === "expired") {
    return "expired";
  }

  return "pending_b";
}

export function getInviteReadyRedirectHref(
  sessionId: string,
  sessionStatus: InviteReadySessionState,
): string | null {
  if (sessionStatus === "ready_to_swipe" || sessionStatus === "matched") {
    return `/plan/${sessionId}`;
  }

  return null;
}

function StatCard({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
      <p className="text-caption font-semibold uppercase tracking-[0.18em] text-text-secondary">
        {label}
      </p>
      <p className="mt-2 text-h2 font-semibold text-text">{value}</p>
    </div>
  );
}
