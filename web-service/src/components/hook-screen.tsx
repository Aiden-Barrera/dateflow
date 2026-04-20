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

const BUDGETS: { value: BudgetLevel; label: string; emoji: string }[] = [
  { value: "BUDGET", label: "Casual", emoji: "☕" },
  { value: "MODERATE", label: "Mid-range", emoji: "🍽️" },
  { value: "UPSCALE", label: "Upscale", emoji: "✨" },
];

/**
 * Person B landing — single-page invitation flow.
 *
 * Collects display name, area, categories, and budget in one warm peach canvas,
 * then hands off to the loading screen in plan-flow.
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
  const [budget, setBudget] = useState<BudgetLevel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initial = creatorName.trim().charAt(0).toUpperCase() || "?";

  const canSubmit =
    displayName.trim().length > 0 &&
    (location !== null || locationLabel.trim().length > 0) &&
    categories.length > 0 &&
    budget !== null;

  function toggleCategory(category: Category) {
    setCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
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
    if (!canSubmit || !budget) {
      setError("Fill in your name, area, at least one format, and a budget.");
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
    <main className="relative min-h-dvh overflow-hidden bg-[linear-gradient(180deg,_#fdf1ec_0%,_#fbe4dc_55%,_#f8d9d0_100%)] text-text">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-10 pt-8">
        <p className="text-center text-caption font-semibold uppercase tracking-[0.28em] text-text">
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

        <div className="mt-8 space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="invitee-display-name"
              className="block text-caption font-semibold uppercase tracking-[0.18em] text-text-secondary"
            >
              Your name
            </label>
            <input
              id="invitee-display-name"
              type="text"
              autoComplete="given-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="What should Dateflow call you?"
              className="h-14 w-full rounded-2xl border border-white/80 bg-white/80 px-4 text-body text-text shadow-sm outline-none transition placeholder:text-text-secondary/55 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
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
              placeholder="Brooklyn or 11211"
              className="h-14 w-full rounded-2xl border border-white/80 bg-white/80 px-4 text-body text-text shadow-sm outline-none transition placeholder:text-text-secondary/55 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <p className="text-caption font-semibold uppercase tracking-[0.18em] text-text-secondary">
              What sounds good?
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {CATEGORIES.map((category) => {
                const selected = categories.includes(category.value);
                return (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => toggleCategory(category.value)}
                    className={`h-16 rounded-2xl border text-body font-semibold shadow-sm transition-all duration-200 active:scale-[0.97] ${
                      selected
                        ? "border-primary bg-primary text-white"
                        : "border-white/80 bg-white/80 text-text hover:border-primary/40"
                    }`}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-caption font-semibold uppercase tracking-[0.18em] text-text-secondary">
              Budget preference
            </p>
            <div className="mt-3 space-y-3">
              {BUDGETS.map((option) => {
                const selected = budget === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setBudget(option.value)}
                    className={`flex h-14 w-full items-center gap-3 rounded-2xl border px-5 text-body font-semibold shadow-sm transition-all duration-200 active:scale-[0.99] ${
                      selected
                        ? "border-primary bg-white text-text ring-2 ring-primary/30"
                        : "border-white/80 bg-white/80 text-text hover:border-primary/40"
                    }`}
                  >
                    <span aria-hidden className="text-lg">
                      {option.emoji}
                    </span>
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error ? <p className="text-caption text-error">{error}</p> : null}
        </div>

        <div className="mt-auto pt-10">
          <Button onClick={handleContinue} disabled={!canSubmit}>
            Join this date plan
          </Button>
        </div>
      </div>
    </main>
  );
}
