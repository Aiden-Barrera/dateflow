"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../../components/button";
import { LoadingOrnament } from "../../../../components/loading-ornament";
import { Logo } from "../../../../components/logo";
import { createSessionStatusSync } from "../../../../lib/session-status-sync";
import type { BudgetLevel, Category, Role } from "../../../../lib/types/preference";
import type { Venue } from "../../../../lib/types/venue";
import { SwipeDeckCard } from "./swipe-deck-card";
import { FallbackEndingScreen } from "./fallback-ending-screen";
import {
  acceptFallbackDecision,
  getFallbackStartOverHref,
  requestFallbackRetryDecision,
} from "./fallback-actions";
import {
  buildFallbackExplanation,
  buildInitialRetryPreferences,
  resolveFallbackVenue,
} from "./fallback-ending-state";
import { getSwipeFlowStatusState, type WaitingStage } from "./swipe-flow-state";

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

type DemoRoundSwipe = {
  readonly venueId: string;
  readonly liked: boolean;
};

export function SwipeFlow({
  sessionId,
  role,
  creatorName,
  demoMode,
}: SwipeFlowProps) {
  const CATEGORY_LABELS: Record<Category, string> = {
    RESTAURANT: "Restaurant",
    BAR: "Bar",
    ACTIVITY: "Activity",
    EVENT: "Event",
  };
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "waiting" | "fallback" | "error">("loading");
  const [statusMessage, setStatusMessage] = useState("Loading your first round...");
  const [waitingStage, setWaitingStage] = useState<WaitingStage>("preferences");
  const [round, setRound] = useState(1);
  const [venues, setVenues] = useState<readonly Venue[]>([]);
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submittingFallbackAction, setSubmittingFallbackAction] = useState<"accept" | "retry" | null>(null);
  const [fallbackVenue, setFallbackVenue] = useState<Venue | null>(null);
  const [showDeckInfo, setShowDeckInfo] = useState(false);
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

  const logVenuePhotoSnapshot = useCallback(
    (source: "round" | "fallback", nextRound: number | null, nextVenues: readonly Venue[]) => {
      const firstVenue = nextVenues[0] ?? null;

      console.info("[SwipeFlow] Venue photo snapshot", {
        source,
        sessionId,
        role,
        round: nextRound,
        venueCount: nextVenues.length,
        firstVenueId: firstVenue?.id ?? null,
        firstVenueName: firstVenue?.name ?? null,
        photoUrl: firstVenue?.photoUrl ?? null,
        photoUrlsCount: firstVenue?.photoUrls.length ?? 0,
        firstPhotoUrl: firstVenue?.photoUrls[0] ?? null,
      });
    },
    [role, sessionId],
  );

  const fetchStatus = useCallback(async (): Promise<SessionStatusPayload> => {
    const response = await fetch(`/api/sessions/${sessionId}/status`);

    if (!response.ok) {
      throw new Error("Failed to fetch session status");
    }

    return (await response.json()) as SessionStatusPayload;
  }, [sessionId]);

  const loadFallback = useCallback(async (matchedVenueId: string | null) => {
    setStatus("loading");
    setStatusMessage("Preparing your fallback pick...");

    const response = await fetch(`/api/sessions/${sessionId}/venues`);

    if (!response.ok) {
      throw new Error("Failed to load the fallback suggestion.");
    }

    const body = (await response.json()) as { venues: Venue[] };
    const resolvedVenue = resolveFallbackVenue(matchedVenueId, body.venues);

    if (!resolvedVenue) {
      throw new Error("We couldn't find the fallback venue for this session.");
    }

    setVenues(body.venues);
    logVenuePhotoSnapshot("fallback", null, body.venues);
    setFallbackVenue(resolvedVenue);
    setStatus("fallback");
    setStatusMessage("");
  }, [logVenuePhotoSnapshot, sessionId]);

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
      logVenuePhotoSnapshot("round", nextRound, body.venues);
      setIndex(0);
      setStatus("ready");
      setStatusMessage("");
    } finally {
      if (loadingRoundRef.current === nextRound) {
        loadingRoundRef.current = null;
      }
    }
  }, [logVenuePhotoSnapshot, sessionId]);

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
        const nextState = getSwipeFlowStatusState(snapshot.status);

        if (nextState.kind === "fallback") {
          await loadFallback(snapshot.matchedVenueId);
          return;
        }

        setWaitingStage(nextState.stage);
        setStatus("waiting");
        setStatusMessage(nextState.message);
        return;
      }

      await loadRound(snapshot.currentRound ?? 1);
    } catch {
      setStatus("error");
      setStatusMessage("We couldn't load the swipe deck. Please refresh and try again.");
    }
  }, [fetchStatus, loadFallback, loadRound, router, sessionId]);

  useEffect(() => {
    const sync = createSessionStatusSync(sessionId, (snapshot) => {
      if (snapshot.status === "matched") {
        router.push(`/plan/${sessionId}/results`);
        return;
      }

      if (snapshot.status === "fallback_pending") {
        void loadFallback(snapshot.matchedVenueId).catch(() => {
          setStatus("error");
          setStatusMessage("We couldn't load the swipe deck. Please refresh and try again.");
        });
        return;
      }

      if (snapshot.status === "ready_to_swipe" && typeof snapshot.currentRound === "number") {
        void loadRound(snapshot.currentRound);
      }
    });

    return () => sync.stop();
  }, [loadFallback, loadRound, router, sessionId]);

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
      await loadFallback(lastResult.matchedVenueId);
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

    const swipedVenue = currentVenue;
    const swipedIndex = index;
    const hasNextVenue = swipedIndex < venues.length - 1;

    setSubmitting(true);
    setToast(null);

    if (hasNextVenue) {
      setIndex(swipedIndex + 1);
    }

    try {
      const swipeResult = await postSwipe(role, swipedVenue.id, liked);
      if (demoMode) {
        const currentRoundSwipes = roundSwipesRef.current[round] ?? [];
        roundSwipesRef.current[round] = [
          ...currentRoundSwipes,
          { venueId: swipedVenue.id, liked },
        ];
      }

      if (swipeResult.matched || swipeResult.sessionStatus === "matched") {
        router.push(`/plan/${sessionId}/results`);
        return;
      }

      if (!hasNextVenue && swipeResult.roundComplete && swipeResult.currentRound < 3) {
        await loadRound(swipeResult.currentRound + 1);
      } else if (!hasNextVenue && swipeResult.sessionStatus === "fallback_pending") {
        await loadFallback(swipeResult.matchedVenueId);
      } else if (!hasNextVenue) {
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
      if (hasNextVenue) {
        setIndex(swipedIndex);
      }
      setToast(error instanceof Error ? error.message : "Failed to record swipe.");
      throw error instanceof Error ? error : new Error("Failed to record swipe.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAcceptFallback() {
    setSubmittingFallbackAction("accept");
    setToast(null);

    try {
      const result = await acceptFallbackDecision(sessionId);

      if (result.status === "matched") {
        router.push(`/plan/${sessionId}/results`);
        return;
      }

      await bootstrap();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Failed to accept the fallback pick.");
    } finally {
      setSubmittingFallbackAction(null);
    }
  }

  async function handleRetryFallback(preferences: {
    readonly categories: readonly Category[];
    readonly budget: BudgetLevel;
  }) {
    setSubmittingFallbackAction("retry");
    setToast(null);

    try {
      const result = await requestFallbackRetryDecision(sessionId, preferences);
      setFallbackVenue(null);

      if (result.status === "ready_to_swipe") {
        loadedRoundRef.current = null;
        await loadRound(1);
        return;
      }

      const nextState = getSwipeFlowStatusState(result.status);
      if (nextState.kind === "waiting") {
        setWaitingStage(nextState.stage);
        setStatus("waiting");
        setStatusMessage(nextState.message);
        return;
      }

      await bootstrap();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Failed to refresh the fallback picks.");
    } finally {
      setSubmittingFallbackAction(null);
    }
  }

  function handleFallbackStartOver() {
    router.push(getFallbackStartOverHref());
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

  if (status === "fallback" && fallbackVenue) {
    const retryDefaults = buildInitialRetryPreferences(fallbackVenue);

    return (
      <SwipeShell creatorName={creatorName}>
        <FallbackEndingScreen
          key={fallbackVenue.id}
          creatorName={creatorName}
          venueName={fallbackVenue.name}
          venuePhotoUrl={fallbackVenue.photoUrl}
          venueCategoryLabel={CATEGORY_LABELS[fallbackVenue.category]}
          venueAddress={fallbackVenue.address}
          explanation={buildFallbackExplanation(fallbackVenue)}
          initialRetryCategories={retryDefaults.categories}
          initialRetryBudget={retryDefaults.budget}
          onAccept={handleAcceptFallback}
          onRetry={handleRetryFallback}
          onStartOver={handleFallbackStartOver}
          submittingAction={submittingFallbackAction}
          errorMessage={toast}
        />
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
        <div className="relative mb-4 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/88 px-3 py-2 text-caption font-medium text-text-secondary shadow-sm">
            <span className="rounded-full bg-secondary-muted px-2.5 py-1 font-semibold text-secondary">
              {progressLabel}
            </span>
            <span className="h-4 w-px bg-muted" />
            <span>
              Venue {index + 1} of {venues.length}
            </span>
          </div>
          <button
            type="button"
            aria-expanded={showDeckInfo}
            aria-label="Show swipe help"
            onClick={() => {
              setShowDeckInfo((current) => !current);
            }}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/70 bg-white/88 text-text-secondary shadow-sm transition-colors duration-200 hover:text-text"
          >
            <InfoIcon />
          </button>
          {showDeckInfo ? (
            <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[min(18rem,calc(100vw-3rem))] rounded-[1.35rem] border border-white/70 bg-white/90 p-4 shadow-[0_18px_40px_rgba(45,42,38,0.12)] backdrop-blur-xl">
              <p className="text-body text-text-secondary">
                Drag right to like, drag left to pass. You can also use the buttons at the bottom of the card.
              </p>
            </div>
          ) : null}
        </div>

        <div className="mb-5 flex gap-2">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`h-2.5 flex-1 rounded-full transition-colors duration-200 ${
                step < round
                  ? "bg-secondary"
                  : step === round
                    ? "bg-primary"
                    : "bg-muted"
              }`}
            />
          ))}
        </div>

        <SwipeDeckCard
          key={currentVenue.id}
          venue={currentVenue}
          nextVenue={nextVenue}
          cardIndex={index + 1}
          totalCards={venues.length}
          submitting={submitting}
          onSwipe={handleSwipe}
        />

        {toast ? (
          <p className="mt-4 text-center text-caption font-medium text-secondary">{toast}</p>
        ) : null}
      </div>
    </SwipeShell>
  );
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

function InfoIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6" />
      <path d="M12 7h.01" />
    </svg>
  );
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
