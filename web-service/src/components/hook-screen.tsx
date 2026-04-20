"use client";

import { useState } from "react";
import { Button } from "./button";

type HookScreenProps = {
  readonly creatorName: string;
  readonly initialDisplayName?: string;
  readonly onContinue: (displayName: string) => void;
};

/**
 * Person B landing — the invitation hook.
 *
 * A light, warm peach canvas with an invitation banner from Person A,
 * a welcoming headline, a single name field, and the "Join this date plan"
 * CTA. Location and vibe selections live on the next steps of the flow.
 */
export function HookScreen({
  creatorName,
  initialDisplayName = "",
  onContinue,
}: HookScreenProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [showError, setShowError] = useState(false);
  const errorId = "invitee-display-name-error";
  const initial = creatorName.trim().charAt(0).toUpperCase() || "?";

  function handleContinue() {
    const trimmed = displayName.trim();

    if (!trimmed) {
      setShowError(true);
      return;
    }

    setShowError(false);
    onContinue(trimmed);
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[linear-gradient(180deg,_#fdf1ec_0%,_#fbe4dc_55%,_#f8d9d0_100%)] text-text">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-10 pt-8">
        <p className="text-caption font-semibold uppercase tracking-[0.28em] text-text">
          Dateflow
        </p>

        <div className="mt-8 flex items-center gap-4 rounded-[1.5rem] bg-[#fbd7cc] p-4 shadow-[0_20px_40px_rgba(200,80,70,0.12)]">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
            {initial}
          </div>
          <div>
            <p className="text-caption font-bold uppercase tracking-[0.14em] text-primary">
              You&apos;re invited
            </p>
            <p className="mt-1 text-body font-semibold leading-tight text-text">
              {creatorName} invited you to pick the vibe
            </p>
          </div>
        </div>

        <h1 className="mt-10 text-[clamp(2.4rem,8vw,3.2rem)] font-bold leading-[0.98] tracking-[-0.03em] text-text">
          Let&apos;s find what works for both of you
        </h1>
        <p className="mt-5 text-body text-text-secondary">
          Add your preferences and Dateflow will find where you both align.
        </p>

        <div className="mt-8 space-y-3">
          <label
            htmlFor="invitee-display-name"
            className="block text-caption font-semibold uppercase tracking-[0.18em] text-text-secondary"
          >
            Your name
          </label>
          <input
            id="invitee-display-name"
            name="invitee-display-name"
            type="text"
            autoComplete="given-name"
            aria-invalid={showError}
            aria-describedby={showError ? errorId : undefined}
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              if (showError) {
                setShowError(false);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleContinue();
              }
            }}
            placeholder="What should Dateflow call you?"
            className="h-14 w-full rounded-2xl border border-white/80 bg-white/80 px-4 text-body text-text shadow-sm outline-none transition placeholder:text-text-secondary/55 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {showError ? (
            <p id={errorId} className="text-caption text-error">
              Add your name so the shared result feels like both of you.
            </p>
          ) : null}
        </div>

        <div className="mt-auto pt-10">
          <Button onClick={handleContinue}>Join this date plan</Button>

          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="h-1.5 w-8 rounded-full bg-primary" aria-hidden />
            <span className="h-1.5 w-6 rounded-full bg-text/15" aria-hidden />
            <span className="h-1.5 w-6 rounded-full bg-text/15" aria-hidden />
          </div>
        </div>
      </div>
    </main>
  );
}
