"use client";

import { useEffect, useState } from "react";
import { BudgetIcon } from "./budget-icon";
import { CategoryIcon } from "./category-icon";
import { getSupabaseClient } from "../lib/supabase";
import {
  getPartnerPresenceChannelName,
  PARTNER_PRESENCE_EVENT,
} from "../lib/partner-presence-channel";
import type { BudgetLevel, Category, Location } from "../lib/types/preference";

type HookScreenProps = {
  readonly creatorName: string;
  readonly sessionId?: string;
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

/**
 * Person B landing — single-page invitation flow.
 *
 * Magenta rose gradient mirroring the Person A form pattern.
 */
export function HookScreen({
  creatorName,
  sessionId,
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

  // Broadcast to Person A's waiting screen that Person B has opened the link.
  // Fire-and-forget — we don't need to await or handle errors here.
  useEffect(() => {
    if (!sessionId) return;
    const channel = getSupabaseClient()
      .channel(getPartnerPresenceChannelName(sessionId))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.send({
            type: "broadcast",
            event: PARTNER_PRESENCE_EVENT,
            payload: { type: PARTNER_PRESENCE_EVENT },
          });
        }
      });
    return () => { void channel.unsubscribe(); };
  }, [sessionId]);

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
      setError("Fill in your name, location, and select at least one category.");
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
    <main className="relative min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top,_#d03d6a_0%,_#8a2346_55%,_#4a1224_100%)] text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-10 pt-8">
        <p className="text-caption font-semibold uppercase tracking-[0.28em] text-white">
          Dateflow
        </p>

        <div className="mt-8 flex items-center gap-4 rounded-[1.5rem] border border-white/15 bg-white/[0.08] p-4 shadow-[0_20px_40px_rgba(0,0,0,0.25)] backdrop-blur-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/90 text-lg font-bold text-[#8a2346]">
            {initial}
          </div>
          <div>
            <p className="text-caption font-bold uppercase tracking-[0.14em] text-white/80">
              You&apos;re invited
            </p>
            <p className="mt-1 text-body font-semibold leading-tight text-white">
              {creatorName} invited you to pick the vibe
            </p>
          </div>
        </div>

        <h1 className="mt-10 text-[clamp(2.4rem,8vw,3.2rem)] font-bold leading-[0.98] tracking-[-0.03em] text-white">
          Let&apos;s find what works for both of you
        </h1>
        <p className="mt-5 text-body text-white/65">
          Add your preferences and Dateflow will find where you both align.
        </p>

        <div className="mt-8 rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.3)] backdrop-blur-sm">
          <div className="space-y-5">
            <div>
              <label htmlFor="invitee-display-name" className="block text-body font-semibold text-white">
                Your Name
              </label>
              <input
                id="invitee-display-name"
                type="text"
                autoComplete="given-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Alex"
                className="mt-3 h-12 w-full rounded-xl border border-white/15 bg-transparent px-4 text-body text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="invitee-location" className="block text-body font-semibold text-white">
                  Location
                </label>
                <button
                  type="button"
                  onClick={handleUseLocation}
                  className="cursor-pointer text-caption font-semibold text-white/80 transition-colors hover:text-white"
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
                className="mt-3 h-12 w-full rounded-xl border border-white/15 bg-transparent px-4 text-body text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
              />
            </div>

            <div>
              <p className="text-body font-semibold text-white">Categories</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {CATEGORIES.map((category) => {
                  const selected = categories.includes(category.value);
                  return (
                    <button
                      key={category.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleCategory(category.value)}
                      className={`flex h-14 items-center justify-center gap-2 rounded-xl border text-body font-semibold transition-all duration-200 active:scale-[0.97] ${
                        selected
                          ? "border-white/60 bg-white/15 text-white"
                          : "border-white/15 bg-white/[0.04] text-white/85 hover:border-white/30"
                      }`}
                    >
                      <CategoryIcon category={category.value} className="h-5 w-5" />
                      {category.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-body font-semibold text-white">Budget</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {BUDGETS.map((option) => {
                  const selected = budget === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setBudget(option.value)}
                      className={`flex h-12 items-center justify-center gap-1.5 rounded-xl border text-body font-semibold transition-all duration-200 active:scale-[0.97] ${
                        selected
                          ? "border-white/60 bg-white/15 text-white"
                          : "border-white/15 bg-white/[0.04] text-white/85 hover:border-white/30"
                      }`}
                    >
                      <BudgetIcon budget={option.value} className="h-4 w-4" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSurpriseMe}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.04] text-body font-semibold text-white transition-colors hover:bg-white/10"
            >
              <span aria-hidden>✨</span> Surprise me
            </button>
          </div>
        </div>

        {error ? <p className="mt-4 text-body text-error">{error}</p> : null}

        <div className="mt-6">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canSubmit}
            className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-body font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/80 ${
              canSubmit
                ? "cursor-pointer bg-white text-[#4a1224] shadow-[0_18px_40px_rgba(255,61,127,0.35),_inset_0_1px_0_rgba(255,255,255,0.9)] motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_22px_48px_rgba(255,61,127,0.45),_inset_0_1px_0_rgba(255,255,255,0.9)] active:translate-y-0"
                : "cursor-not-allowed bg-white/20 text-white/50 shadow-none"
            }`}
          >
            Join this date plan
            {canSubmit ? (
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            ) : null}
          </button>
        </div>
      </div>
    </main>
  );
}
