"use client";

import { useState } from "react";
import { Button } from "./button";
import { CategoryIcon } from "./category-icon";
import type { BudgetLevel, Category } from "../lib/types/preference";

type VibeScreenProps = {
  readonly onComplete: (data: {
    categories: Category[];
    budget: BudgetLevel;
  }) => void;
  readonly onBack: () => void;
};

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "RESTAURANT", label: "Food" },
  { value: "BAR", label: "Drinks" },
  { value: "ACTIVITY", label: "Activity" },
  { value: "EVENT", label: "Event" },
];

const BUDGETS: { value: BudgetLevel; label: string; symbol: string }[] = [
  { value: "BUDGET", label: "Casual", symbol: "$" },
  { value: "MODERATE", label: "Mid-range", symbol: "$$" },
  { value: "UPSCALE", label: "Upscale", symbol: "$$$" },
];

/**
 * Screen 3 — Vibe.
 *
 * Category chips (multi-select) + budget options (single-select).
 * "Surprise me" selects all four categories.
 * CTA is disabled until at least 1 category and 1 budget are chosen.
 */
export function VibeScreen({ onComplete, onBack }: VibeScreenProps) {
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<BudgetLevel | null>(
    null
  );

  const isComplete =
    selectedCategories.length > 0 && selectedBudget !== null;

  function toggleCategory(category: Category) {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  }

  function selectAllCategories() {
    setSelectedCategories(CATEGORIES.map((c) => c.value));
  }

  function handleSubmit() {
    if (!isComplete) return;
    onComplete({
      categories: selectedCategories,
      budget: selectedBudget,
    });
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-bg px-6 pb-24">
      {/* Progress indicator */}
      <div className="flex flex-col items-center pt-6 pb-2">
        <span className="text-caption text-text-secondary">Step 2 of 2</span>
        <div className="mt-2 flex gap-1.5">
          <div className="h-1.5 w-8 rounded-full bg-secondary" />
          <div className="h-1.5 w-8 rounded-full bg-secondary" />
        </div>
      </div>

      {/* Back arrow */}
      <button onClick={onBack} className="pt-2 pb-4 cursor-pointer" aria-label="Go back">
        <BackArrow />
      </button>

      {/* --- Section 1: Categories --- */}
      <h1 className="text-h1 font-semibold text-text">What sounds good?</h1>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {CATEGORIES.map(({ value, label }) => {
          const isSelected = selectedCategories.includes(value);
          return (
            <button
              key={value}
              onClick={() => toggleCategory(value)}
              className={`flex h-[72px] cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-[1.5px] transition-all duration-200 active:scale-[0.97] ${
                isSelected
                  ? "border-primary bg-primary text-white shadow-sm"
                  : "border-muted bg-surface text-text shadow-sm hover:border-text-secondary"
              }`}
            >
              <CategoryIcon category={value} className="h-5 w-5" />
              <span className="text-body font-semibold">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Surprise me */}
      <button
        onClick={selectAllCategories}
        className="mt-3 flex cursor-pointer items-center justify-center gap-1.5 self-center text-body text-secondary transition-colors hover:text-secondary/80"
      >
        <span aria-hidden="true">+</span>
        <span className="font-medium">Surprise me</span>
      </button>

      {/* Divider */}
      <div className="my-6 h-px bg-muted" />

      {/* --- Section 2: Budget --- */}
      <h2 className="text-h2 font-semibold text-text">Budget vibe?</h2>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {BUDGETS.map(({ value, label, symbol }) => {
          const isSelected = selectedBudget === value;
          return (
            <button
              key={value}
              onClick={() => setSelectedBudget(value)}
              className={`flex h-[64px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl border-[1.5px] transition-all duration-200 active:scale-[0.97] ${
                isSelected
                  ? "border-secondary bg-secondary-muted text-secondary"
                  : "border-muted bg-surface text-text shadow-sm hover:border-text-secondary"
              }`}
            >
              <span className="text-body font-bold">{symbol}</span>
              <span className="text-caption">{label}</span>
            </button>
          );
        })}
      </div>

      {/* --- Sticky CTA --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-bg px-6 pb-8 pt-4">
        <div className="mx-auto max-w-sm">
          <Button disabled={!isComplete} onClick={handleSubmit}>
            Find our places
          </Button>
        </div>
      </div>
    </div>
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
