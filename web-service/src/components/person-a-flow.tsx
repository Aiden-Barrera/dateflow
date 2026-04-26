"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./button";
import { BudgetIcon } from "./budget-icon";
import { CategoryIcon } from "./category-icon";
import { createSessionStatusSync } from "../lib/session-status-sync";
import { WaitingForPartnerScreen } from "./waiting-for-partner-screen";
import { LoadingScreen } from "./loading-screen";
import { ScheduleScreen } from "./schedule-screen";
import type { WaitingStatus } from "./waiting-for-partner-screen";
import type {
  BudgetLevel,
  Category,
  DayOfWeek,
  Location,
  ScheduleWindow,
  TimeOfDay,
} from "../lib/types/preference";

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
  | "both_ready"
  | "generating"
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

const BUDGETS: { value: BudgetLevel; label: string }[] = [
  { value: "BUDGET", label: "Casual" },
  { value: "MODERATE", label: "Mid" },
  { value: "UPSCALE", label: "Upscale" },
];

type FormStep = "form" | "schedule" | "submitting";

export function PersonAFlow() {
  const router = useRouter();
  const [formStep, setFormStep] = useState<FormStep>("form");
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

  function handleSurpriseMe() {
    setCategories(CATEGORIES.map((category) => category.value));
    setBudget("MODERATE");
  }

  function handleCreateSession() {
    if (!canSubmit) return;
    setFormStep("schedule");
  }

  async function handleScheduleComplete(schedule: {
    scheduleWindow?: ScheduleWindow;
    availableDays?: DayOfWeek[];
    timeOfDay?: TimeOfDay;
  }) {
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
          ...(schedule.scheduleWindow ? { scheduleWindow: schedule.scheduleWindow } : {}),
          ...(schedule.availableDays ? { availableDays: schedule.availableDays } : {}),
          ...(schedule.timeOfDay ? { timeOfDay: schedule.timeOfDay } : {}),
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

  if (formStep === "schedule" && !createdSession) {
    return (
      <ScheduleScreen
        stepLabel="Almost there"
        role="a"
        onBack={() => setFormStep("form")}
        onComplete={(schedule) => {
          // Move to loading immediately — don't bounce back to form first
          setFormStep("submitting");
          handleScheduleComplete(schedule);
        }}
      />
    );
  }

  // Show loading animation while session + preferences are being created
  if (formStep === "submitting" && !createdSession && !error) {
    return <LoadingScreen />;
  }

  if (createdSession) {
    const waitingStatus = toWaitingStatus(createdSessionStatus);
    return (
      <WaitingForPartnerScreen
        creatorName={name}
        shareUrl={createdSession.shareUrl}
        status={waitingStatus}
        copyState={copyState}
        errorMessage={error}
        onCopyInvite={handleCopyInvite}
      />
    );
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top,_#4a302a_0%,_#2a1a15_60%,_#1a0f0c_100%)] text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-10 pt-8">
        <p className="text-caption font-semibold uppercase tracking-[0.28em] text-white">
          Dateflow
        </p>

        <h1 className="mt-10 text-[clamp(2.6rem,8.5vw,3.4rem)] font-bold leading-[0.98] tracking-[-0.03em] text-white">
          Build the date invite before the vibe goes cold
        </h1>
        <p className="mt-5 text-body text-white/65">
          Start the session, set your preferences, and send one clean link.
        </p>

        <div className="mt-8 rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.3)] backdrop-blur-sm">
          <div className="space-y-5">
            <div>
              <label
                htmlFor="person-a-name"
                className="block text-body font-semibold text-white"
              >
                Your Name
              </label>
              <input
                id="person-a-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Alex"
                className="mt-3 h-12 w-full rounded-xl border border-white/15 bg-transparent px-4 text-body text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="person-a-location"
                  className="block text-body font-semibold text-white"
                >
                  Location
                </label>
                <button
                  type="button"
                  onClick={handleUseLocation}
                  className="cursor-pointer text-caption font-semibold text-white/80 transition-colors hover:text-white"
                >
                  {gpsState === "loading" ? "Finding you..." : "Use my location"}
                </button>
              </div>
              <input
                id="person-a-location"
                value={locationLabel}
                onChange={(event) => {
                  setLocation(null);
                  setLocationLabel(event.target.value);
                }}
                placeholder="Brooklyn or 11211"
                className="mt-3 h-12 w-full rounded-xl border border-white/15 bg-transparent px-4 text-body text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
              />
            </div>

            <div>
              <p className="text-body font-semibold text-white">Categories</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {CATEGORIES.map((category) => {
                  const selected = categories.includes(category.value);
                  return (
                    <button
                      key={category.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleCategory(category.value)}
                      className={`flex h-14 items-center justify-center gap-2 rounded-xl border text-body font-semibold transition-all duration-200 active:scale-[0.97] ${
                        selected
                          ? "border-white/60 bg-white/15 text-white"
                          : "border-white/15 bg-white/[0.04] text-white/85 hover:border-white/30"
                      }`}
                    >
                      <CategoryIcon category={category.value} className="h-5 w-5" />
                      {category.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-body font-semibold text-white">Budget</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {BUDGETS.map((option) => {
                  const selected = budget === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setBudget(option.value)}
                      className={`flex h-12 items-center justify-center gap-1.5 rounded-xl border text-body font-semibold transition-all duration-200 active:scale-[0.97] ${
                        selected
                          ? "border-white/60 bg-white/15 text-white"
                          : "border-white/15 bg-white/[0.04] text-white/85 hover:border-white/30"
                      }`}
                    >
                      <BudgetIcon budget={option.value} className="h-4 w-4" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSurpriseMe}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.04] text-body font-semibold text-white transition-colors hover:bg-white/10"
            >
              <span aria-hidden>✨</span> Surprise me
            </button>
          </div>
        </div>

        {error ? <p className="mt-4 text-body text-error">{error}</p> : null}

        <div className="mt-6">
          <Button onClick={handleCreateSession} disabled={!canSubmit} loading={submitting}>
            Create invite link
          </Button>
        </div>

        <p className="mt-6 text-center text-caption text-white/50">
          2,847 dates planned this week
        </p>
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
  const showLiveSessionAction = sessionStatus !== "pending_b";
  const liveSessionLabel =
    sessionStatus === "matched"
      ? "View your result"
      : sessionStatus === "ready_to_swipe"
        ? "Continue to your swipe deck"
        : sessionStatus === "expired"
          ? "Start a new session"
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
      <div>
        <p className="text-caption font-semibold uppercase tracking-[0.22em] text-white/70">
          Invite sent
        </p>
        <h2 className="mt-3 text-h1 font-semibold text-white">
          Your side is set. Now hand off the link.
        </h2>
        <p className="mt-3 text-body text-white/70">{statusMessage}</p>
      </div>

      <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
        <p className="text-caption font-semibold uppercase tracking-[0.18em] text-white/60">
          Share link
        </p>
        <p className="mt-3 break-all text-body font-medium text-white">{shareUrl}</p>
      </div>

      <div className="grid gap-3">
        <Button onClick={onCopyInvite}>
          {copyState === "copied" ? "Copied invite link" : "Copy invite link"}
        </Button>
        {showLiveSessionAction ? (
          <a
            href={liveSessionHref}
            className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/[0.04] text-body font-semibold text-white transition-colors hover:bg-white/10"
          >
            {liveSessionLabel}
          </a>
        ) : null}
      </div>

      {errorMessage ? <p className="text-body text-error">{errorMessage}</p> : null}
    </div>
  );
}

export function getInviteReadySessionStatus(status: string): InviteReadySessionState {
  if (status === "ready_to_swipe" || status === "fallback_pending") {
    return "ready_to_swipe";
  }
  if (status === "matched") return "matched";
  if (status === "both_ready") return "both_ready";
  if (status === "generating") return "generating";
  if (status === "generation_failed") return "generation_failed";
  if (status === "expired") return "expired";
  return "pending_b";
}

export function toWaitingStatus(status: InviteReadySessionState): WaitingStatus {
  if (status === "both_ready") return "both_ready";
  if (status === "generating") return "generating";
  if (status === "generation_failed") return "generation_failed";
  if (status === "expired") return "expired";
  // ready_to_swipe / matched trigger redirect before this is called — treat as pending
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
