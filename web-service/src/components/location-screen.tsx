"use client";

import { useState } from "react";
import { Button } from "./button";
import type { Location } from "../lib/types/preference";

type LocationScreenProps = {
  readonly onComplete: (location: Location) => void;
  readonly onBack: () => void;
};

type GpsState = "idle" | "loading" | "denied";

/**
 * Screen 2 — Location.
 *
 * Primary path: one-tap GPS via the browser Geolocation API.
 * Fallback: type a zip code or city name manually.
 *
 * Calls onComplete with a Location object when either path succeeds.
 */
export function LocationScreen({ onComplete, onBack }: LocationScreenProps) {
  const [gpsState, setGpsState] = useState<GpsState>("idle");
  const [manualInput, setManualInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  function handleGpsRequest() {
    if (!navigator.geolocation) {
      setGpsState("denied");
      setShowManualInput(true);
      return;
    }

    setGpsState("loading");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onComplete({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: "Current Location",
        });
      },
      () => {
        // Permission denied or error — fall back to manual
        setGpsState("denied");
        setShowManualInput(true);
      }
    );
  }

  function handleManualSubmit() {
    const trimmed = manualInput.trim();
    if (trimmed.length === 0) return;

    // For MVP, we use a placeholder coordinate with the user's text as label.
    // DS-03 will add Google Geocoding API to convert city/zip → lat/lng.
    onComplete({
      lat: 0,
      lng: 0,
      label: trimmed,
    });
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-bg px-6">
      {/* Progress indicator */}
      <div className="flex flex-col items-center pt-6 pb-2">
        <span className="text-caption text-text-secondary">Step 1 of 2</span>
        <div className="mt-2 flex gap-1.5">
          <div className="h-1.5 w-8 rounded-full bg-secondary" />
          <div className="h-1.5 w-8 rounded-full bg-muted" />
        </div>
      </div>

      {/* Back arrow */}
      <button onClick={onBack} className="pt-2 pb-4 cursor-pointer" aria-label="Go back">
        <BackArrow />
      </button>

      {/* Main content */}
      <div className="flex flex-1 flex-col items-center pt-4">
        {/* Decorative location icon */}
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-secondary-muted">
          <LocationPinIcon />
        </div>

        <h1 className="text-center text-h1 font-semibold text-text">
          Where are you based?
        </h1>
        <p className="mt-2 text-center text-body text-text-secondary">
          {"We'll find places near both of you."}
        </p>

        {/* GPS button */}
        <div className="mt-8 w-full max-w-sm">
          <Button
            onClick={handleGpsRequest}
            loading={gpsState === "loading"}
            icon={<SmallPinIcon />}
          >
            {gpsState === "loading" ? "Finding you..." : "Use my location"}
          </Button>
        </div>

        {/* Divider */}
        <div className="my-5 flex w-full max-w-sm items-center gap-3">
          <div className="h-px flex-1 bg-muted" />
          <span className="text-caption text-text-secondary">or</span>
          <div className="h-px flex-1 bg-muted" />
        </div>

        {/* Manual input — always visible, but expanded when GPS denied or tapped */}
        <div className="w-full max-w-sm">
          {!showManualInput ? (
            <button
              onClick={() => setShowManualInput(true)}
              className="w-full cursor-pointer text-center text-body text-text-secondary underline underline-offset-2 transition-colors hover:text-text"
            >
              Enter a zip code or city
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleManualSubmit();
                }}
                placeholder="Enter a zip code or city"
                autoFocus
                className="h-14 w-full rounded-xl border-[1.5px] border-muted bg-surface px-4 text-body text-text placeholder:text-text-secondary/50 focus:border-primary focus:outline-none"
              />
              {manualInput.trim().length > 0 && (
                <Button variant="secondary" onClick={handleManualSubmit}>
                  Continue
                </Button>
              )}
            </div>
          )}
        </div>

        {/* GPS denied message */}
        {gpsState === "denied" && (
          <p className="mt-4 text-center text-caption text-text-secondary">
            {"No worries — just type your area above."}
          </p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------
 * Icons
 * ------------------------------------------------------------------- */

/** Teal location pin in the decorative circle */
function LocationPinIcon() {
  return (
    <svg
      className="h-6 w-6 text-secondary"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

/** Small white pin icon inside the GPS button */
function SmallPinIcon() {
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
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

/** Left-pointing arrow for back navigation */
function BackArrow() {
  return (
    <svg
      className="h-6 w-6 text-text-secondary"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}
