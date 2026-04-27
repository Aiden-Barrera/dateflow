"use client";

import Image from "next/image";
import { useState } from "react";
import { CategoryIcon } from "../../../../components/category-icon";
import type { BudgetLevel, Category } from "../../../../lib/types/preference";

type FallbackEndingScreenProps = {
  readonly creatorName: string;
  readonly venueName: string;
  readonly venuePhotoUrl?: string | null;
  readonly venueCategoryLabel: string;
  readonly initialRetryCategories: readonly Category[];
  readonly initialRetryBudget: BudgetLevel;
  readonly venueAddress: string;
  readonly explanation: string;
  readonly retryStep?: "default" | "partner_confirm" | "partner_accept";
  readonly onAccept: () => void;
  readonly onRetry: (preferences: {
    categories: readonly Category[];
    budget: BudgetLevel;
  }) => void;
  readonly onStartOver: () => void;
  readonly submittingAction: "accept" | "retry" | null;
  readonly errorMessage?: string | null;
};

const RETRY_CATEGORIES: readonly { value: Category; label: string }[] = [
  { value: "RESTAURANT", label: "Food" },
  { value: "BAR", label: "Drinks" },
  { value: "ACTIVITY", label: "Activity" },
  { value: "EVENT", label: "Event" },
];

const RETRY_BUDGETS: readonly { value: BudgetLevel; label: string; symbol: string }[] = [
  { value: "BUDGET", label: "Casual", symbol: "$" },
  { value: "MODERATE", label: "Mid-range", symbol: "$$" },
  { value: "UPSCALE", label: "Upscale", symbol: "$$$" },
];

export function FallbackEndingScreen({
  creatorName,
  venueName,
  venuePhotoUrl = null,
  venueCategoryLabel,
  initialRetryCategories,
  initialRetryBudget,
  venueAddress,
  explanation,
  retryStep = "default",
  onAccept,
  onRetry,
  onStartOver,
  submittingAction,
  errorMessage = null,
}: FallbackEndingScreenProps) {
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(
    [...initialRetryCategories],
  );
  const [selectedBudget, setSelectedBudget] = useState<BudgetLevel>(
    initialRetryBudget,
  );

  function toggleCategory(category: Category) {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }

  const isPartnerConfirmStep = retryStep === "partner_confirm";
  const isPartnerAcceptStep = retryStep === "partner_accept";

  const eyebrow = isPartnerAcceptStep
    ? "Lock-in request"
    : isPartnerConfirmStep
      ? "New mix request"
      : "Dateflow fallback pick";
  const title = isPartnerAcceptStep
    ? "Your partner wants to lock this in"
    : isPartnerConfirmStep
      ? "Your partner wants a new mix"
      : "No mutual match this time";
  const introCopy = isPartnerAcceptStep
    ? `${creatorName} is ready to commit to this venue. Lock it in to confirm — or try a new mix if you'd rather keep looking.`
    : isPartnerConfirmStep
      ? "Keep your current vibes or tweak them below, then confirm the retry together."
      : `You and ${creatorName} did not land on the same venue, so Dateflow pulled forward the best next option instead of ending the night flat.`;
  const retryEyebrow = isPartnerConfirmStep
    ? "Confirm the new mix"
    : "Try a new mix instead";
  const retryIntro = isPartnerConfirmStep
    ? "You can keep your current vibe selections as-is or update them before you confirm the refresh."
    : `If ${venueName} is not the move, tighten the vibe below and Dateflow will reshuffle the shortlist around a fresh direction.`;
  const retryButtonLabel = isPartnerConfirmStep ? "Confirm new mix" : "Try a new mix";
  const retryDisabled =
    submittingAction !== null || selectedCategories.length === 0;

  return (
    <section className="mx-auto max-w-3xl rounded-[2.25rem] border border-white/12 bg-white/[0.05] px-6 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-8 sm:py-10">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div>
          <p className="text-caption font-semibold uppercase tracking-[0.24em] text-secondary">
            {eyebrow}
          </p>
          <h1 className="mt-3 max-w-xl text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[0.94] tracking-[-0.05em] text-text">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-body text-text-secondary">
            {introCopy}
          </p>
          <p className="mt-4 max-w-2xl text-body text-white/75">
            {explanation}
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-white/15 bg-white/[0.07] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
          {venuePhotoUrl ? (
            <div className="mb-4 overflow-hidden rounded-[1.35rem] border border-white/15">
              <Image
                src={venuePhotoUrl}
                alt={venueName}
                width={640}
                height={384}
                unoptimized
                className="h-48 w-full object-cover"
              />
            </div>
          ) : null}
          <p className="text-caption font-semibold uppercase tracking-[0.2em] text-[#ff8da8]">
            Suggested venue
          </p>
          <h2 className="mt-3 text-[1.8rem] font-semibold leading-tight tracking-[-0.03em] text-white">
            {venueName}
          </h2>
          <p className="mt-3 inline-flex rounded-full border border-[rgba(208,61,106,0.4)] bg-[rgba(208,61,106,0.14)] px-3 py-1 text-caption font-medium text-[#ffb3c5]">
            {venueCategoryLabel}
          </p>
          <p className="mt-4 text-body text-white/70">{venueAddress}</p>
        </div>
      </div>

      <div className="mt-8 rounded-[1.75rem] border border-white/15 bg-white/[0.07] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <p className="text-caption font-semibold uppercase tracking-[0.2em] text-[#ff8da8]">
          {retryEyebrow}
        </p>
        <p className="mt-3 max-w-2xl text-body text-white/75">
          {retryIntro}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {RETRY_CATEGORIES.map(({ value, label }) => {
            const isSelected = selectedCategories.includes(value);

            return (
              <button
                key={value}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleCategory(value)}
                className={`flex cursor-pointer items-center gap-3 rounded-[1.35rem] border px-4 py-3 text-left transition-colors duration-200 ${
                  isSelected
                    ? "border-[rgba(208,61,106,0.75)] bg-[rgba(208,61,106,0.25)] text-white"
                    : "border-white/15 bg-white/[0.04] text-white/75 hover:border-white/35 hover:text-white"
                }`}
              >
                <CategoryIcon category={value} className="h-5 w-5" />
                <span className="text-body font-medium">{label}</span>
              </button>
            );
          })}
        </div>

        <div
          role="radiogroup"
          aria-label="Retry budget"
          className="mt-4 grid grid-cols-3 gap-3"
        >
          {RETRY_BUDGETS.map(({ value, label, symbol }) => {
            const isSelected = selectedBudget === value;

            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelectedBudget(value)}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-[1.25rem] border px-3 py-3 transition-colors duration-200 ${
                  isSelected
                    ? "border-[rgba(208,61,106,0.75)] bg-[rgba(208,61,106,0.22)] text-white"
                    : "border-white/15 bg-white/[0.04] text-white/70 hover:border-white/35 hover:text-white"
                }`}
              >
                <span className="text-body font-bold">{symbol}</span>
                <span className="text-caption">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {!isPartnerConfirmStep ? (
          <button
            type="button"
            onClick={onAccept}
            disabled={submittingAction !== null}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-[#10a37f] bg-[#10a37f] text-body font-semibold text-white shadow-[0_14px_30px_rgba(16,163,127,0.35)] transition-all duration-200 hover:bg-[#0e8e6f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submittingAction === "accept" ? "Locking it in..." : "Lock in this plan"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() =>
            onRetry({
              categories: selectedCategories,
              budget: selectedBudget,
            })
          }
          disabled={retryDisabled}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-[rgba(208,61,106,0.55)] bg-[rgba(208,61,106,0.14)] text-body font-semibold text-white transition-all duration-200 hover:bg-[rgba(208,61,106,0.22)] hover:border-[rgba(208,61,106,0.8)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/80 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {submittingAction === "retry" ? "Refreshing picks..." : retryButtonLabel}
        </button>
      </div>

      {errorMessage ? (
        <p className="mt-4 text-body font-medium text-[#ffb3c5]">{errorMessage}</p>
      ) : null}

      <div className="mt-4">
        <button
          type="button"
          onClick={onStartOver}
          className="cursor-pointer text-body font-medium text-white/60 transition-colors duration-200 hover:text-white"
        >
          Start over
        </button>
      </div>
    </section>
  );
}
