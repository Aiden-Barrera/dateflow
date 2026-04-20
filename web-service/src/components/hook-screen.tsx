"use client";

import { useState } from "react";
import { Button } from "./button";
import type { BudgetLevel, Category, Location } from "../lib/types/preference";

type HookScreenProps = {
  readonly creatorName: string;
  readonly initialDisplayName?: string;
  readonly initialLocation?: Location | null;
  readonly onContinue: (data: {
    displayName: string;
    location: Location;
    categories: Category[];
    budget: BudgetLevel;
  }) => void;
};

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "RESTAURANT", label: "Food" },
  { value: "BAR", label: "Drinks" },
  { value: "ACTIVITY", label: "Activity" },
  { value: "EVENT", label: "Event" },
];

const BUDGETS: { value: BudgetLevel; label: string }[] = [
  { value: "BUDGET", label: "Casual" },
  { value: "MODERATE", label: "Mid" },
  { value: "UPSCALE", label: "Upscale" },
];

const INK = "#3d0e1f";

/**
 * Person B landing — single-page invitation flow.
 *
 * Petal pastel gradient with dark-ink type. Mirrors the Person A form
 * pattern: translucent card with Name, Location, Categories, Budget, and
 * Surprise me, then hands off to the loading screen.
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [budget, setBudget] = useState<BudgetLevel>("MODERATE");
  const [error, setError] = useState<string | null>(null);
  const initial = creatorName.trim().charAt(0).toUpperCase() || "?";

  const canSubmit =
    displayName.trim().length > 0 &&
    (location !== null || locationLabel.trim().length > 0) &&
    categories.length > 0;

  function toggleCategory(category: Category) {
    setCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }

  function handleSurpriseMe() {
    setCategories(CATEGORIES.map((c) => c.value));
    setBudget("MODERATE");
  }

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
    if (!canSubmit) {
      setError("Fill in your name, area, and at least one format.");
      return;
    }

    const trimmedLocation = locationLabel.trim();
    const resolvedLocation: Location =
      location ?? { lat: 0, lng: 0, label: trimmedLocation };

    setError(null);
    onContinue({
      displayName: displayName.trim(),
      location: resolvedLocation,
      categories,
      budget,
    });
  }

  return (
    <main
      className="relative min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top,_#f8cbd3_0%,_#e8a5b4_55%,_#c47a8e_100%)]"
      style={{ color: INK }}
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-10 pt-8">
        <p className="text-caption font-semibold uppercase tracking-[0.28em]">
          Dateflow
        </p>

        <div className="mt-8 flex items-center gap-4 rounded-[1.5rem] border border-[#3d0e1f]/10 bg-white/50 p-4 shadow-[0_20px_40px_rgba(61,14,31,0.12)] backdrop-blur-sm">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ background: INK }}
          >
            {initial}
          </div>
          <div>
            <p className="text-caption font-bold uppercase tracking-[0.14em] opacity-70">
              You&apos;re invited
            </p>
            <p className="mt-1 text-body font-semibold leading-tight">
              {creatorName} invited you to pick the vibe
            </p>
          </div>
        </div>

        <h1 className="mt-10 text-[clamp(2.4rem,8vw,3.2rem)] font-bold leading-[0.98] tracking-[-0.03em]">
          Let&apos;s find what works for both of you
        </h1>
        <p className="mt-5 text-body opacity-70">
          Add your preferences and Dateflow will find where you both align.
        </p>

        <div className="mt-8 rounded-[1.75rem] border border-[#3d0e1f]/10 bg-white/45 p-5 shadow-[0_24px_60px_rgba(61,14,31,0.12)] backdrop-blur-sm">
          <div className="space-y-5">
            <div>
              <label htmlFor="invitee-display-name" className="block text-body font-semibold">
                Your Name
              </label>
              <input
                id="invitee-display-name"
                type="text"
                autoComplete="given-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Alex"
                className="mt-3 h-12 w-full rounded-xl border border-[#3d0e1f]/15 bg-white/60 px-4 text-body placeholder:text-[#3d0e1f]/40 focus:border-[#3d0e1f]/50 focus:outline-none"
                style={{ color: INK }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="invitee-location" className="block text-body font-semibold">
                  Location
                </label>
                <button
                  type="button"
                  onClick={handleUseLocation}
                  className="cursor-pointer text-caption font-semibold opacity-70 transition-opacity hover:opacity-100"
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
                placeholder="Brooklyn or 11211"
                className="mt-3 h-12 w-full rounded-xl border border-[#3d0e1f]/15 bg-white/60 px-4 text-body placeholder:text-[#3d0e1f]/40 focus:border-[#3d0e1f]/50 focus:outline-none"
                style={{ color: INK }}
              />
            </div>

            <div>
              <p className="text-body font-semibold">Categories</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {CATEGORIES.map((category) => {
                  const selected = categories.includes(category.value);
                  return (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => toggleCategory(category.value)}
                      className={`h-14 rounded-xl border text-body font-semibold transition-all duration-200 active:scale-[0.97] ${
                        selected
                          ? "border-[#3d0e1f]/60 bg-[#3d0e1f]/10"
                          : "border-[#3d0e1f]/15 bg-white/55 hover:border-[#3d0e1f]/35"
                      }`}
                      style={{ color: INK }}
                    >
                      {category.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-body font-semibold">Budget</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {BUDGETS.map((option) => {
                  const selected = budget === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setBudget(option.value)}
                      className={`h-12 rounded-xl border text-body font-semibold transition-all duration-200 active:scale-[0.97] ${
                        selected
                          ? "border-[#3d0e1f]/60 bg-[#3d0e1f]/10"
                          : "border-[#3d0e1f]/15 bg-white/55 hover:border-[#3d0e1f]/35"
                      }`}
                      style={{ color: INK }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSurpriseMe}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#3d0e1f]/20 bg-white/55 text-body font-semibold transition-colors hover:bg-white/70"
              style={{ color: INK }}
            >
              <span aria-hidden>✨</span> Surprise me
            </button>
          </div>
        </div>

        {error ? <p className="mt-4 text-body text-error">{error}</p> : null}

        <div className="mt-6">
          <Button onClick={handleContinue} disabled={!canSubmit}>
            Join this date plan
          </Button>
        </div>
      </div>
    </main>
  );
}
