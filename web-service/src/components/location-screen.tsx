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
    <div className="relative flex min-h-dvh flex-col bg-bg px-6 pb-10 pt-6">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
        <div className="flex items-center justify-between">
          <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-caption font-medium text-text-secondary shadow-sm">
            Step 1 of 2
          </span>
          <div className="flex gap-1.5">
            <div className="h-2 w-10 rounded-full bg-secondary" />
            <div className="h-2 w-10 rounded-full bg-muted" />
          </div>
        </div>

        <button onClick={onBack} className="pt-4 pb-4 cursor-pointer" aria-label="Go back">
          <BackArrow />
        </button>

        <div className="grid flex-1 gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
          <section className="pt-2">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-secondary-muted">
              <LocationPinIcon />
            </div>

            <h1 className="text-[clamp(2.4rem,8vw,4rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-text">
              Where should Dateflow anchor your side?
            </h1>
            <p className="mt-3 max-w-lg text-body text-text-secondary">
              We use this to find places that feel fair for both of you. GPS is fastest, but a neighborhood, city, or zip works too.
            </p>

            <div className="mt-8 w-full max-w-sm">
              <Button
                onClick={handleGpsRequest}
                loading={gpsState === "loading"}
                icon={<SmallPinIcon />}
              >
                {gpsState === "loading" ? "Finding you..." : "Use my location"}
              </Button>
            </div>

            <div className="my-5 flex w-full max-w-sm items-center gap-3">
              <div className="h-px flex-1 bg-muted" />
              <span className="text-caption text-text-secondary">or</span>
              <div className="h-px flex-1 bg-muted" />
            </div>

            <div className="w-full max-w-sm">
              {!showManualInput ? (
                <button
                  onClick={() => setShowManualInput(true)}
                  className="w-full cursor-pointer rounded-2xl border border-muted bg-white px-4 py-4 text-left text-body text-text-secondary transition-colors hover:border-text-secondary hover:text-text"
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
                    placeholder="Williamsburg, Brooklyn"
                    autoFocus
                    className="h-14 w-full rounded-2xl border-[1.5px] border-muted bg-surface px-4 text-body text-text placeholder:text-text-secondary/50 focus:border-primary focus:outline-none"
                  />
                  {manualInput.trim().length > 0 && (
                    <Button variant="secondary" onClick={handleManualSubmit}>
                      Continue
                    </Button>
                  )}
                </div>
              )}
            </div>

            {gpsState === "denied" && (
              <p className="mt-4 text-body text-text-secondary">
                No problem. Type your area and Dateflow will use that instead.
              </p>
            )}
          </section>

          <aside className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_24px_80px_rgba(45,42,38,0.12)] backdrop-blur-sm">
            <p className="text-caption font-semibold uppercase tracking-[0.2em] text-secondary">
              Why we ask
            </p>
            <div className="mt-4 space-y-4">
              <InfoCard
                title="Midpoint fairness"
                body="Your location helps prevent one person from carrying the commute."
              />
              <InfoCard
                title="Low pressure"
                body="We only need an area label, not your exact home address."
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  title,
  body,
}: {
  readonly title: string;
  readonly body: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-muted bg-bg/75 p-4">
      <h2 className="text-body font-semibold text-text">{title}</h2>
      <p className="mt-2 text-body text-text-secondary">{body}</p>
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
