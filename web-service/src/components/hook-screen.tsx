"use client";

import { useState } from "react";
import { Button } from "./button";
import type { Location } from "../lib/types/preference";

type HookScreenProps = {
  readonly creatorName: string;
  readonly initialDisplayName?: string;
  readonly initialLocation?: Location | null;
  readonly onContinue: (displayName: string, location: Location) => void;
};

/**
 * Person B landing — the invitation hook.
 *
 * Warm peach canvas. Collects display name and location (GPS or typed)
 * before handing off to the vibe screen.
 */
export function HookScreen({
  creatorName,
  initialDisplayName = "",
  initialLocation = null,
  onContinue,
}: HookScreenProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [locationLabel, setLocationLabel] = useState(initialLocation?.label ?? "");
  const [location, setLocation] = useState<Location | null>(initialLocation);
  const [gpsState, setGpsState] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [showNameError, setShowNameError] = useState(false);
  const nameErrorId = "invitee-display-name-error";
  const initial = creatorName.trim().charAt(0).toUpperCase() || "?";

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

  function handleContinue() {
    const trimmed = displayName.trim();
    const trimmedLocation = locationLabel.trim();

    if (!trimmed) {
      setShowNameError(true);
      return;
    }

    if (!location && trimmedLocation.length === 0) {
      setError("Add your area so we can find a fair midpoint.");
      return;
    }

    const resolvedLocation: Location =
      location ?? { lat: 0, lng: 0, label: trimmedLocation };

    setShowNameError(false);
    setError(null);
    onContinue(trimmed, resolvedLocation);
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

        <div className="mt-8 space-y-5">
          <div className="space-y-2">
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
              aria-invalid={showNameError}
              aria-describedby={showNameError ? nameErrorId : undefined}
              value={displayName}
              onChange={(event) => {
                setDisplayName(event.target.value);
                if (showNameError) {
                  setShowNameError(false);
                }
              }}
              placeholder="What should Dateflow call you?"
              className="h-14 w-full rounded-2xl border border-white/80 bg-white/80 px-4 text-body text-text shadow-sm outline-none transition placeholder:text-text-secondary/55 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {showNameError ? (
              <p id={nameErrorId} className="text-caption text-error">
                Add your name so the shared result feels like both of you.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="invitee-location"
                className="block text-caption font-semibold uppercase tracking-[0.18em] text-text-secondary"
              >
                Your area
              </label>
              <button
                type="button"
                onClick={handleUseLocation}
                className="cursor-pointer text-caption font-semibold text-primary transition-colors hover:text-primary-hover"
              >
                {gpsState === "loading" ? "Finding you..." : "Use my location"}
              </button>
            </div>
            <input
              id="invitee-location"
              type="text"
              value={locationLabel}
              onChange={(event) => {
                setLocation(null);
                setLocationLabel(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleContinue();
                }
              }}
              placeholder="Brooklyn or 11211"
              className="h-14 w-full rounded-2xl border border-white/80 bg-white/80 px-4 text-body text-text shadow-sm outline-none transition placeholder:text-text-secondary/55 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {error ? <p className="text-caption text-error">{error}</p> : null}
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
