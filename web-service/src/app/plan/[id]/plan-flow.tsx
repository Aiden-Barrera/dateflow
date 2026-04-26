"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HookScreen } from "../../../components/hook-screen";
import { LoadingScreen } from "../../../components/loading-screen";
import { ScheduleScreen } from "../../../components/schedule-screen";
import { createSessionStatusSync } from "../../../lib/session-status-sync";
import type {
  Location,
  BudgetLevel,
  Category,
  DayOfWeek,
  ScheduleWindow,
  TimeOfDay,
} from "../../../lib/types/preference";
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
 * HookScreen collects display name, location, categories, and budget on a
 * single landing, then PlanFlow POSTs the bundled preferences and shows
 * the loading screen while the session transitions.
 */
type FlowStep = "hook" | "schedule" | "loading";

type HookData = {
  displayName: string;
  location: Location;
  categories: Category[];
  budget: BudgetLevel;
};

export function PlanFlow({
  sessionId,
  creatorName,
  demoMode = false,
  initialStep = "hook",
}: PlanFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>(initialStep);
  const [hookData, setHookData] = useState<HookData | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function submitPreferences(
    data: HookData,
    scheduleWindow?: ScheduleWindow,
    availableDays?: DayOfWeek[],
    timeOfDay?: TimeOfDay,
  ) {
    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/preferences`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "b",
            displayName: data.displayName,
            location: { lat: data.location.lat, lng: data.location.lng, label: data.location.label },
            budget: data.budget,
            categories: data.categories,
            ...(scheduleWindow ? { scheduleWindow } : {}),
            ...(availableDays ? { availableDays } : {}),
            ...(timeOfDay ? { timeOfDay } : {}),
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
        sessionId={sessionId}
        initialDisplayName={hookData?.displayName ?? ""}
        initialLocation={hookData?.location ?? null}
        onContinue={(data) => {
          setHookData(data);
          setStep("schedule");
        }}
      />
    );
  }

  if (step === "schedule") {
    return (
      <ScheduleScreen
        stepLabel="Step 2 of 2"
        role="b"
        onBack={() => setStep("hook")}
        onComplete={(schedule) => {
          if (!hookData) return;
          // Go straight to loading — skip the hook screen bounce
          setStep("loading");
          submitPreferences(
            hookData,
            schedule.scheduleWindow,
            schedule.availableDays,
            schedule.timeOfDay,
          );
        }}
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
              setStep("hook");
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
