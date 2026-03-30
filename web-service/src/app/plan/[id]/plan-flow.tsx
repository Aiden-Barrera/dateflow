"use client";

import { useState, useCallback } from "react";
import { HookScreen } from "../../../components/hook-screen";
import { LocationScreen } from "../../../components/location-screen";
import { VibeScreen } from "../../../components/vibe-screen";
import { LoadingScreen } from "../../../components/loading-screen";
import type { Location, BudgetLevel, Category } from "../../../lib/types/preference";

type PlanFlowProps = {
  readonly sessionId: string;
  readonly creatorName: string;
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

export function PlanFlow({ sessionId, creatorName }: PlanFlowProps) {
  const [step, setStep] = useState<FlowStep>("hook");
  const [location, setLocation] = useState<Location | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submitPreferences = useCallback(
    async (
      loc: Location,
      vibeCategories: Category[],
      vibeBudget: BudgetLevel
    ) => {
      try {
        const response = await fetch(
          `/api/sessions/${sessionId}/preferences`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role: "b",
              location: { lat: loc.lat, lng: loc.lng, label: loc.label },
              budget: vibeBudget,
              categories: vibeCategories,
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
    },
    [sessionId]
  );

  if (step === "hook") {
    return (
      <HookScreen
        creatorName={creatorName}
        onContinue={() => setStep("location")}
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

  return <LoadingScreen />;
}
