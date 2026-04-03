"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../../components/button";
import { CategoryIcon } from "../../../../components/category-icon";
import { LoadingOrnament } from "../../../../components/loading-ornament";
import { Logo } from "../../../../components/logo";
import { PriceBadge } from "../../../../components/price-badge";
import { createSessionStatusSync } from "../../../../lib/session-status-sync";
import type { Role, Category } from "../../../../lib/types/preference";
import type { Venue } from "../../../../lib/types/venue";

type SwipeFlowProps = {
  readonly sessionId: string;
  readonly role: Role;
  readonly creatorName: string;
  readonly demoMode: boolean;
};

type SessionStatusPayload = {
  readonly status: string;
  readonly matchedVenueId: string | null;
  readonly currentRound?: number;
  readonly roundComplete?: boolean;
};

type SwipeApiResult = {
  readonly matched: boolean;
  readonly matchedVenueId: string | null;
  readonly roundComplete: boolean;
  readonly currentRound: number;
  readonly sessionStatus: string;
};

type WaitingStage = "preferences" | "generation" | "round" | "session";
type DemoRoundSwipe = {
  readonly venueId: string;
  readonly liked: boolean;
};

const CATEGORY_LABELS: Record<Category, string> = {
  RESTAURANT: "Restaurant",
  BAR: "Bar",
  ACTIVITY: "Activity",
  EVENT: "Event",
};

export function SwipeFlow({
  sessionId,
  role,
  creatorName,
  demoMode,
}: SwipeFlowProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "waiting" | "error">("loading");
  const [statusMessage, setStatusMessage] = useState("Loading your first round...");
  const [waitingStage, setWaitingStage] = useState<WaitingStage>("preferences");
  const [round, setRound] = useState(1);
  const [venues, setVenues] = useState<readonly Venue[]>([]);
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const loadedRoundRef = useRef<number | null>(null);
  const loadingRoundRef = useRef<number | null>(null);
  const roundSwipesRef = useRef<Record<number, DemoRoundSwipe[]>>({});
  const demoRoundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<string | null>(
    demoMode ? "Demo preview is on. Your partner will respond after each round." : null,
  );

  const currentVenue = venues[index] ?? null;
  const nextVenue = venues[index + 1] ?? null;
  const progressLabel = useMemo(() => `Round ${round} of 3`, [round]);
  const currentVenueSlides = currentVenue ? getVenueSlides(currentVenue) : [];

  const fetchStatus = useCallback(async (): Promise<SessionStatusPayload> => {
    const response = await fetch(`/api/sessions/${sessionId}/status`);

    if (!response.ok) {
      throw new Error("Failed to fetch session status");
    }

    return (await response.json()) as SessionStatusPayload;
  }, [sessionId]);

  const loadRound = useCallback(async (nextRound: number) => {
    if (
      loadedRoundRef.current === nextRound ||
      loadingRoundRef.current === nextRound
    ) {
      return;
    }

    loadingRoundRef.current = nextRound;
    setStatus("loading");
    setStatusMessage(nextRound === 1 ? "Loading the first round..." : `Loading round ${nextRound}...`);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/venues?round=${nextRound}`);

      if (!response.ok) {
        throw new Error("Failed to fetch venues");
      }

      const body = (await response.json()) as { venues: Venue[] };
      loadedRoundRef.current = nextRound;
      roundSwipesRef.current[nextRound] = [];
      setRound(nextRound);
      setVenues(body.venues);
      setIndex(0);
      setStatus("ready");
      setStatusMessage("");
    } finally {
      if (loadingRoundRef.current === nextRound) {
        loadingRoundRef.current = null;
      }
    }
  }, [sessionId]);

  const bootstrap = useCallback(async () => {
    setStatus("loading");
    setStatusMessage("Checking whether your venues are ready...");

    try {
      const snapshot = await fetchStatus();

      if (snapshot.status === "matched") {
        router.push(`/plan/${sessionId}/results`);
        return;
      }

      if (snapshot.status !== "ready_to_swipe") {
        const waitingState = getWaitingState(snapshot.status);
        setWaitingStage(waitingState.stage);
        setStatus("waiting");
        setStatusMessage(waitingState.message);
        return;
      }

      await loadRound(snapshot.currentRound ?? 1);
    } catch {
      setStatus("error");
      setStatusMessage("We couldn't load the swipe deck. Please refresh and try again.");
    }
  }, [fetchStatus, loadRound, router, sessionId]);

  useEffect(() => {
    const sync = createSessionStatusSync(sessionId, (snapshot) => {
      if (snapshot.status === "matched") {
        router.push(`/plan/${sessionId}/results`);
        return;
      }

      if (snapshot.status === "ready_to_swipe" && typeof snapshot.currentRound === "number") {
        void loadRound(snapshot.currentRound);
      }
    });

    return () => sync.stop();
  }, [loadRound, router, sessionId]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    return () => {
      if (demoRoundTimerRef.current) {
        clearTimeout(demoRoundTimerRef.current);
      }
    };
  }, []);

  async function postSwipe(nextRole: Role, venueId: string, liked: boolean) {
    const response = await fetch(`/api/sessions/${sessionId}/swipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        venueId,
        role: nextRole,
        liked,
      }),
    });

    const body = (await response.json()) as SwipeApiResult | { error: string };

    if (!response.ok) {
      throw new Error("error" in body ? body.error : "Failed to record swipe");
    }

    return body as SwipeApiResult;
  }

  async function runDemoPartnerRound(
    completedRound: number,
    swipes: readonly DemoRoundSwipe[],
  ) {
    const mirroredRole: Role = role === "a" ? "b" : "a";
    let lastResult: SwipeApiResult | null = null;

    for (const swipe of swipes) {
      lastResult = await postSwipe(mirroredRole, swipe.venueId, swipe.liked);

      if (lastResult.matched || lastResult.sessionStatus === "matched") {
        router.push(`/plan/${sessionId}/results`);
        return;
      }
    }

    if (!lastResult) {
      return;
    }

    if (lastResult.sessionStatus === "fallback_pending") {
      setStatus("error");
      setStatusMessage(
        "This session moved into fallback resolution. The no-match ending screen is still pending.",
      );
      return;
    }

    if (lastResult.roundComplete && completedRound < 3) {
      loadedRoundRef.current = null;
      await loadRound(completedRound + 1);
      return;
    }

    setWaitingStage("round");
    setStatus("waiting");
    setStatusMessage("Your partner is still finishing the date flow.");
  }

  async function handleSwipe(liked: boolean) {
    if (!currentVenue || submitting) {
      return;
    }

    setSubmitting(true);
    setToast(null);

    try {
      const swipeResult = await postSwipe(role, currentVenue.id, liked);
      if (demoMode) {
        const currentRoundSwipes = roundSwipesRef.current[round] ?? [];
        roundSwipesRef.current[round] = [
          ...currentRoundSwipes,
          { venueId: currentVenue.id, liked },
        ];
      }

      if (swipeResult.matched || swipeResult.sessionStatus === "matched") {
        router.push(`/plan/${sessionId}/results`);
        return;
      }

      if (index < venues.length - 1) {
        setIndex((current) => current + 1);
      } else if (swipeResult.roundComplete && swipeResult.currentRound < 3) {
        await loadRound(swipeResult.currentRound + 1);
      } else if (swipeResult.sessionStatus === "fallback_pending") {
        setStatus("error");
        setStatusMessage("This session moved into fallback resolution. The no-match ending screen is still pending.");
      } else {
        setWaitingStage("round");
        setStatus("waiting");
        setStatusMessage(
          demoMode
            ? "You are set for this round. Your demo partner will answer in a moment."
            : "You are set for this round. We will keep watch for your partner's next picks.",
        );

        if (demoMode) {
          const completedRound = round;
          const demoRoundSwipes = [...(roundSwipesRef.current[completedRound] ?? [])];

          if (demoRoundTimerRef.current) {
            clearTimeout(demoRoundTimerRef.current);
          }

          demoRoundTimerRef.current = setTimeout(() => {
            void runDemoPartnerRound(completedRound, demoRoundSwipes);
          }, 2200);
        }
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Failed to record swipe.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <SwipeShell creatorName={creatorName}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="max-w-sm text-center">
            <p className="text-caption font-semibold uppercase tracking-[0.24em] text-secondary">
              Swipe deck
            </p>
            <h1 className="mt-3 text-h1 font-semibold">Loading your venues</h1>
            <p className="mt-3 text-body text-text-secondary">{statusMessage}</p>
          </div>
        </div>
      </SwipeShell>
    );
  }

  if (status === "waiting") {
    const waitingCopy = getWaitingCopy(waitingStage);

    return (
      <SwipeShell creatorName={creatorName}>
        <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center rounded-[2rem] border border-white/70 bg-white/85 px-6 py-10 text-center shadow-[0_20px_60px_rgba(45,42,38,0.12)] backdrop-blur-sm sm:px-8">
          <LoadingOrnament variant={getWaitingLoaderVariant(waitingStage)} />
          <p className="mt-6 text-caption font-semibold uppercase tracking-[0.24em] text-secondary">
            {waitingCopy.eyebrow}
          </p>
          <h1 className="mt-3 max-w-lg text-[clamp(2.2rem,6vw,3.5rem)] font-semibold leading-[0.96] tracking-[-0.04em] text-text">
            {waitingCopy.title}
          </h1>
          <p className="mt-4 max-w-xl text-body text-text-secondary">
            {waitingCopy.body}
          </p>
          <p className="mt-3 max-w-lg text-body text-text-secondary">
            {statusMessage}
          </p>
          <div className="mt-6 grid w-full max-w-lg gap-3 sm:grid-cols-2">
            <WaitingCard
              title={waitingCopy.cardTitle}
              body={waitingCopy.cardBody}
            />
            <WaitingCard
              title="Keep this tab open"
              body="Dateflow will move you forward as soon as the session is ready."
            />
          </div>
          <div className="mt-6 w-full max-w-sm">
            <Button variant="secondary" onClick={() => void bootstrap()}>
              Refresh status
            </Button>
          </div>
        </div>
      </SwipeShell>
    );
  }

  if (status === "error" || !currentVenue) {
    return (
      <SwipeShell creatorName={creatorName}>
        <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center rounded-[2rem] border border-white/70 bg-white/85 px-6 py-10 text-center shadow-[0_20px_60px_rgba(45,42,38,0.12)] backdrop-blur-sm">
          <h1 className="text-h1 font-semibold">Swipe demo unavailable</h1>
          <p className="mt-3 text-body text-text-secondary">{statusMessage}</p>
          <div className="mt-6 w-full max-w-sm">
            <Button variant="secondary" onClick={() => void bootstrap()}>
              Try again
            </Button>
          </div>
        </div>
      </SwipeShell>
    );
  }

  return (
    <SwipeShell creatorName={creatorName}>
      <div className="mx-auto w-full max-w-md">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-caption font-semibold uppercase tracking-[0.24em] text-secondary">
              {progressLabel}
            </p>
            <h1 className="mt-2 text-h1 font-semibold">Swipe your picks</h1>
          </div>
          <div className="rounded-full border border-white/70 bg-white/85 px-3 py-2 text-caption font-medium text-text-secondary shadow-sm">
            Card {index + 1} of {venues.length}
          </div>
        </div>

        <div className="mb-4 flex gap-2">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`h-2 flex-1 rounded-full ${
                step <= round ? "bg-secondary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="relative min-h-[620px]">
          {nextVenue ? (
            <div className="absolute inset-x-3 top-3 h-full rounded-[2rem] border border-white/50 bg-white/60 shadow-sm" aria-hidden="true" />
          ) : null}
          <article className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_24px_80px_rgba(45,42,38,0.16)] backdrop-blur-sm">
            <div className="relative aspect-[4/3] overflow-hidden bg-[linear-gradient(135deg,var(--color-secondary-muted),var(--color-primary-muted))]">
              {currentVenueSlides.length > 0 ? (
                <Image
                  src={currentVenueSlides[0]}
                  alt={currentVenue.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 480px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="relative flex h-full items-end overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.92),_transparent_42%),linear-gradient(135deg,var(--color-secondary),var(--color-primary))] p-6">
                  <div className="absolute -right-8 top-8 h-28 w-28 rounded-[2rem] border border-white/18 bg-white/10 backdrop-blur-sm" />
                  <div className="absolute left-6 top-8 h-20 w-16 rounded-[1.3rem] border border-white/18 bg-white/10 backdrop-blur-sm" />
                  <div className="relative max-w-[15rem] rounded-[1.4rem] border border-white/18 bg-white/14 px-4 py-3 text-left text-white backdrop-blur">
                    <p className="text-caption font-semibold uppercase tracking-[0.18em] text-white/72">
                      Photo unavailable
                    </p>
                    <p className="mt-2 text-body text-white/88">
                      The venue is still worth considering. We will show a live photo once the generator resolves one.
                    </p>
                  </div>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(28,25,23,0.42))]" />

              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/88 px-3 py-2 text-caption font-medium text-text shadow-sm">
                <CategoryIcon category={currentVenue.category} />
                {CATEGORY_LABELS[currentVenue.category]}
              </div>

              {currentVenueSlides.length > 1 ? (
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/20 px-2 py-1 backdrop-blur-sm">
                  {currentVenueSlides.map((slide, slideIndex) => (
                    <span
                      key={`${slide}-${slideIndex}`}
                      className={`h-1.5 w-1.5 rounded-full ${
                        slideIndex === 0 ? "bg-white" : "bg-white/45"
                      }`}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-[1.6rem] border border-muted bg-bg/78 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-h1 font-semibold leading-tight">{currentVenue.name}</h2>
                    <p className="mt-1.5 text-body text-text-secondary">{currentVenue.address}</p>
                  </div>
                  <PriceBadge priceLevel={currentVenue.priceLevel} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-secondary-muted px-3 py-1.5 text-secondary">
                    <StarIcon />
                    {currentVenue.rating.toFixed(1)} rating
                  </div>
                  <div className="rounded-full border border-muted bg-white px-3 py-1.5 text-caption font-medium text-text-secondary">
                    {CATEGORY_LABELS[currentVenue.category]}
                  </div>
                  <div className="rounded-full border border-muted bg-white px-3 py-1.5 text-caption font-medium text-text-secondary">
                    Round {currentVenue.round}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {currentVenue.tags.map((tag) => (
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
                  See why it was picked
                </summary>
                <div className="mt-4 grid gap-3 text-body text-text-secondary">
                  <p className="rounded-2xl bg-white px-4 py-3">
                    Strong venue fit with a composite score of {(currentVenue.score.composite * 100).toFixed(0)}.
                  </p>
                  <p className="rounded-2xl bg-white px-4 py-3">
                    Built for conversation, midpoint fairness, and your combined vibe.
                  </p>
                </div>
              </details>
            </div>
          </article>
        </div>

        {toast ? (
          <p className="mt-4 text-center text-caption font-medium text-secondary">{toast}</p>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => void handleSwipe(false)}
            disabled={submitting}
            className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border-[1.5px] border-muted bg-white text-body font-semibold text-text transition-all duration-200 hover:border-text-secondary disabled:cursor-wait disabled:opacity-70"
          >
            <PassIcon />
            Pass
          </button>
          <button
            onClick={() => void handleSwipe(true)}
            disabled={submitting}
            className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-primary text-body font-semibold text-white shadow-sm transition-all duration-200 hover:bg-primary-hover disabled:cursor-wait disabled:opacity-70"
          >
            <HeartIcon />
            Like
          </button>
        </div>
      </div>
    </SwipeShell>
  );
}

function getVenueSlides(venue: Venue): readonly string[] {
  return venue.photoUrl ? [venue.photoUrl] : [];
}

function SwipeShell({
  children,
  creatorName,
}: {
  readonly children: React.ReactNode;
  readonly creatorName: string;
}) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-bg px-6 pb-10 pt-8 text-text sm:px-8">
      <div
        className="pointer-events-none absolute -left-20 top-12 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "var(--color-primary-muted)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-0 top-28 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "var(--color-secondary-muted)" }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Logo />
          <div className="rounded-full border border-white/70 bg-white/85 px-3 py-2 text-caption font-medium text-text-secondary shadow-sm">
            {creatorName}
            {"'"}s invite
          </div>
        </div>

        {children}
      </div>
    </main>
  );
}

function WaitingCard({
  title,
  body,
}: {
  readonly title: string;
  readonly body: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-muted bg-bg/75 px-4 py-4 text-left">
      <h2 className="text-body font-semibold text-text">{title}</h2>
      <p className="mt-2 text-body text-text-secondary">{body}</p>
    </div>
  );
}

function StarIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.75 14.78 9l5.72.78-4.13 4 1 5.72L12 16.98 6.63 19.5l1-5.72-4.13-4L9.22 9 12 3.75Z" />
    </svg>
  );
}

function PassIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function HeartIcon({ className = "h-5 w-5" }: { readonly className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21s-6.72-4.32-9.33-8.35C.96 10.01 1.53 6.5 4.43 4.84c2.35-1.35 4.85-.48 6.1 1.33 1.25-1.81 3.75-2.68 6.1-1.33 2.9 1.66 3.47 5.17 1.76 7.81C18.72 16.68 12 21 12 21Z" />
    </svg>
  );
}

function getWaitingState(status: string): {
  readonly stage: WaitingStage;
  readonly message: string;
} {
  if (status === "pending_b") {
    return {
      stage: "preferences",
      message: "Your partner still has a few quick preferences to share before the deck can open.",
    };
  }

  if (status === "both_ready" || status === "generating") {
    return {
      stage: "generation",
      message: "Both sides are in. Dateflow is shaping the first shortlist now.",
    };
  }

  return {
    stage: "session",
    message: "This session is not ready for swiping yet, but we are still watching for updates.",
  };
}

function getWaitingLoaderVariant(
  stage: WaitingStage,
): "partner-preferences" | "venue" | "partner-round" | "session-check" {
  if (stage === "preferences") {
    return "partner-preferences";
  }

  if (stage === "generation") {
    return "venue";
  }

  if (stage === "session") {
    return "session-check";
  }

  return "partner-round";
}

function getWaitingCopy(stage: WaitingStage): {
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
  readonly cardTitle: string;
  readonly cardBody: string;
} {
  switch (stage) {
    case "preferences":
      return {
        eyebrow: "Almost ready",
        title: "Waiting on your partner's preferences",
        body: "The moment both sides finish their quick picks, Dateflow can start building your shared date shortlist.",
        cardTitle: "What happens next",
        cardBody: "As soon as their preferences are in, the venue deck starts preparing automatically.",
      };
    case "generation":
      return {
        eyebrow: "Shortlist in progress",
        title: "Your date options are taking shape",
        body: "You are past the setup step. Now Dateflow is pulling the strongest options together for both of you.",
        cardTitle: "What happens next",
        cardBody: "Once the shortlist is ready, the swipe deck opens and you can start liking venues.",
      };
    case "round":
      return {
        eyebrow: "Round complete",
        title: "Waiting on your partner's picks",
        body: "Your side is done for now. The next reveal happens as soon as your partner finishes their round.",
        cardTitle: "What happens next",
        cardBody: "Dateflow will unlock the next round or reveal the match automatically.",
      };
    case "session":
    default:
      return {
        eyebrow: "Checking session",
        title: "Your date flow is still warming up",
        body: "This session has not opened the swipe deck yet, but the connection is still live and we are watching for changes.",
        cardTitle: "What happens next",
        cardBody: "The screen refreshes into the next state as soon as the session advances.",
      };
  }
}
