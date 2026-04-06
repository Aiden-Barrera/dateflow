"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HookScreen } from "../../../components/hook-screen";
import { LocationScreen } from "../../../components/location-screen";
import { VibeScreen } from "../../../components/vibe-screen";
import { LoadingScreen } from "../../../components/loading-screen";
import { createSessionStatusSync } from "../../../lib/session-status-sync";
import type { Location, BudgetLevel, Category } from "../../../lib/types/preference";
import { getPlanFlowSyncAction } from "./plan-flow-state";

type PlanFlowProps = {
  readonly sessionId: string;
  readonly creatorName: string;
  readonly demoMode?: boolean;
  readonly initialStep?: FlowStep;
};

/**
 * Client-side flow orchestrator for the Person B experience.
 *
 * Manages which screen is visible (hook → location → vibe → loading)
 * and holds the collected preference data as it accumulates across screens.
 *
 * When Person B completes the vibe screen, PlanFlow bundles all collected
 * data (location + categories + budget) and POSTs it to the preferences API.
 * The loading screen renders immediately while the request is in flight.
 */
type FlowStep = "hook" | "location" | "vibe" | "loading";

export function PlanFlow({
  sessionId,
  creatorName,
  demoMode = false,
  initialStep = "hook",
}: PlanFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>(initialStep);
  const [location, setLocation] = useState<Location | null>(null);
  const [inviteeDisplayName, setInviteeDisplayName] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function submitPreferences(
    loc: Location,
    vibeCategories: Category[],
    vibeBudget: BudgetLevel
  ) {
    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/preferences`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "b",
            displayName: inviteeDisplayName,
            location: { lat: loc.lat, lng: loc.lng, label: loc.label },
            budget: vibeBudget,
            categories: vibeCategories,
            demo: demoMode,
          }),
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message =
          body.error ?? "Something went wrong. Please try again.";
        setSubmitError(message);
      }
    } catch {
      setSubmitError("Could not connect. Check your internet and try again.");
    }
  }

  useEffect(() => {
    if (step !== "loading") {
      return;
    }

    const sync = createSessionStatusSync(sessionId, (snapshot) => {
      const action = getPlanFlowSyncAction(snapshot, sessionId, { demoMode });

      if (action.type === "redirect") {
        router.push(action.href);
        return;
      }

      if (action.type === "error") {
        setSubmitError(action.message);
      }
    });

    return () => sync.stop();
  }, [demoMode, router, sessionId, step]);

  if (step === "hook") {
    return (
        <HookScreen
          creatorName={creatorName}
          initialDisplayName={inviteeDisplayName}
          onContinue={(displayName) => {
            setInviteeDisplayName(displayName);
            setStep("location");
          }}
      />
    );
  }

  if (step === "location") {
    return (
      <LocationScreen
        onComplete={(loc) => {
          setLocation(loc);
          setStep("vibe");
        }}
        onBack={() => setStep("hook")}
      />
    );
  }

  if (step === "vibe") {
    return (
      <VibeScreen
        onComplete={(vibeData) => {
          if (!location) return;
          setStep("loading");
          submitPreferences(location, vibeData.categories, vibeData.budget);
        }}
        onBack={() => setStep("location")}
      />
    );
  }

  // step === "loading"
  if (submitError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-body text-error">{submitError}</p>
          <button
            onClick={() => {
              setSubmitError(null);
              setStep("vibe");
            }}
            className="cursor-pointer text-body font-medium text-secondary underline underline-offset-2"
          >
            Go back and try again
          </button>
        </div>
      </div>
    );
  }

  return <LoadingScreen demoMode={demoMode} />;
}
