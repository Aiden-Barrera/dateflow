"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../../components/button";
import { CategoryIcon } from "../../../../components/category-icon";
import { Logo } from "../../../../components/logo";
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
  const [round, setRound] = useState(1);
  const [venues, setVenues] = useState<readonly Venue[]>([]);
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(
    demoMode ? "Demo assist is on. Your partner's swipes will be mirrored." : null,
  );

  const currentVenue = venues[index] ?? null;
  const nextVenue = venues[index + 1] ?? null;
  const progressLabel = useMemo(() => `Round ${round} of 3`, [round]);

  const fetchStatus = useCallback(async (): Promise<SessionStatusPayload> => {
    const response = await fetch(`/api/sessions/${sessionId}/status`);

    if (!response.ok) {
      throw new Error("Failed to fetch session status");
    }

    return (await response.json()) as SessionStatusPayload;
  }, [sessionId]);

  const loadRound = useCallback(async (nextRound: number) => {
    setStatus("loading");
    setStatusMessage(nextRound === 1 ? "Loading the first round..." : `Loading round ${nextRound}...`);

    const response = await fetch(`/api/sessions/${sessionId}/venues?round=${nextRound}`);

    if (!response.ok) {
      throw new Error("Failed to fetch venues");
    }

    const body = (await response.json()) as { venues: Venue[] };
    setRound(nextRound);
    setVenues(body.venues);
    setIndex(0);
    setStatus("ready");
    setStatusMessage("");
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
        setStatus("waiting");
        setStatusMessage(
          snapshot.status === "generating" || snapshot.status === "both_ready"
            ? "Your venue stack is still being generated."
            : "This session is not ready for swiping yet.",
        );
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

  async function handleSwipe(liked: boolean) {
    if (!currentVenue || submitting) {
      return;
    }

    setSubmitting(true);
    setToast(null);

    try {
      let swipeResult = await postSwipe(role, currentVenue.id, liked);

      if (demoMode) {
        const mirroredRole: Role = role === "a" ? "b" : "a";
        swipeResult = await postSwipe(mirroredRole, currentVenue.id, liked);
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
        setStatus("waiting");
        setStatusMessage("Waiting for the other side to finish this round...");
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Failed to record swipe.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <SwipeShell creatorName={creatorName} role={role}>
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
    return (
      <SwipeShell creatorName={creatorName} role={role}>
        <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center rounded-[2rem] border border-white/70 bg-white/85 px-6 py-10 text-center shadow-[0_20px_60px_rgba(45,42,38,0.12)] backdrop-blur-sm">
          <Orbit />
          <h1 className="mt-6 text-h1 font-semibold">Waiting on the other side</h1>
          <p className="mt-3 text-body text-text-secondary">{statusMessage}</p>
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
      <SwipeShell creatorName={creatorName} role={role}>
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
    <SwipeShell creatorName={creatorName} role={role}>
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
              {currentVenue.photoUrl ? (
                <Image
                  src={currentVenue.photoUrl}
                  alt={currentVenue.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 480px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-end bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.94),_transparent_58%),linear-gradient(135deg,var(--color-secondary),var(--color-primary))] p-6">
                  <div className="rounded-full border border-white/60 bg-white/15 px-3 py-1 text-caption font-medium text-white backdrop-blur">
                    Venue photo pending
                  </div>
                </div>
              )}

              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/88 px-3 py-2 text-caption font-medium text-text shadow-sm">
                <CategoryIcon category={currentVenue.category} />
                {CATEGORY_LABELS[currentVenue.category]}
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-h1 font-semibold">{currentVenue.name}</h2>
                  <p className="mt-2 text-body text-text-secondary">{currentVenue.address}</p>
                </div>
                <div className="rounded-[1.25rem] bg-primary-muted px-3 py-2 text-right">
                  <div className="text-caption uppercase tracking-[0.18em] text-text-secondary">
                    Price
                  </div>
                  <div className="text-h2 font-semibold text-primary">
                    {toPriceLabel(currentVenue.priceLevel)}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-secondary-muted px-3 py-1.5 text-secondary">
                  <StarIcon />
                  {currentVenue.rating.toFixed(1)} rating
                </div>
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

function SwipeShell({
  children,
  creatorName,
  role,
}: {
  readonly children: React.ReactNode;
  readonly creatorName: string;
  readonly role: Role;
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
            {role === "a" ? "Person A" : `${creatorName}'s invite`}
          </div>
        </div>

        {children}
      </div>
    </main>
  );
}

function Orbit() {
  return (
    <div className="relative h-20 w-20">
      <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
      <div className="absolute inset-3 rounded-full border-2 border-secondary/20" />
      <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
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

function HeartIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21s-6.72-4.32-9.33-8.35C.96 10.01 1.53 6.5 4.43 4.84c2.35-1.35 4.85-.48 6.1 1.33 1.25-1.81 3.75-2.68 6.1-1.33 2.9 1.66 3.47 5.17 1.76 7.81C18.72 16.68 12 21 12 21Z" />
    </svg>
  );
}

function toPriceLabel(priceLevel: number): string {
  return "$".repeat(Math.max(1, Math.min(priceLevel, 4)));
}
