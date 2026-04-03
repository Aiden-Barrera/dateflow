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
    <div className="relative flex min-h-dvh flex-col bg-bg px-6 pb-24 pt-6">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col">
        <div className="flex items-center justify-between">
          <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-caption font-medium text-text-secondary shadow-sm">
            Step 2 of 2
          </span>
          <div className="flex gap-1.5">
            <div className="h-2 w-10 rounded-full bg-secondary" />
            <div className="h-2 w-10 rounded-full bg-secondary" />
          </div>
        </div>

        <button onClick={onBack} className="pt-4 pb-4 cursor-pointer" aria-label="Go back">
          <BackArrow />
        </button>

        <div className="grid flex-1 gap-8 lg:grid-cols-[1fr_0.86fr]">
          <section>
            <h1 className="text-[clamp(2.4rem,8vw,4rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-text">
              What kind of date feels easy right now?
            </h1>
            <p className="mt-3 max-w-xl text-body text-text-secondary">
              Pick the formats you would actually say yes to. The shortlist gets better when this stays honest.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {CATEGORIES.map(({ value, label }) => {
                const isSelected = selectedCategories.includes(value);
                return (
                  <button
                    key={value}
                    onClick={() => toggleCategory(value)}
                    className={`flex h-[84px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[1.6rem] border-[1.5px] transition-all duration-200 active:scale-[0.97] ${
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

            <button
              onClick={selectAllCategories}
              className="mt-4 flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-muted bg-white px-4 py-2 text-body text-secondary transition-colors hover:border-secondary/50 hover:text-secondary/80"
            >
              <span aria-hidden="true">+</span>
              <span className="font-medium">Surprise me</span>
            </button>

            <div className="my-8 h-px bg-muted" />

            <h2 className="text-h2 font-semibold text-text">Budget vibe?</h2>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {BUDGETS.map(({ value, label, symbol }) => {
                const isSelected = selectedBudget === value;
                return (
                  <button
                    key={value}
                    onClick={() => setSelectedBudget(value)}
                    className={`flex h-[70px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[1.45rem] border-[1.5px] transition-all duration-200 active:scale-[0.97] ${
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
          </section>

          <aside className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_24px_80px_rgba(45,42,38,0.12)] backdrop-blur-sm">
            <p className="text-caption font-semibold uppercase tracking-[0.2em] text-secondary">
              Final check
            </p>
            <div className="mt-4 space-y-4">
              <SummaryCard
                title="Formats"
                body={
                  selectedCategories.length > 0
                    ? `${selectedCategories.length} selected`
                    : "Choose at least one"
                }
              />
              <SummaryCard
                title="Budget"
                body={selectedBudget ?? "Pick one tier"}
              />
              <SummaryCard
                title="What happens next"
                body="Once you submit, Dateflow starts building the shared venue deck."
              />
            </div>
          </aside>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-bg/95 px-6 pb-8 pt-4 backdrop-blur">
          <div className="mx-auto max-w-sm">
            <Button disabled={!isComplete} onClick={handleSubmit}>
              Find our places
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  body,
}: {
  readonly title: string;
  readonly body: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-muted bg-bg/75 p-4">
      <h3 className="text-body font-semibold text-text">{title}</h3>
      <p className="mt-2 text-body text-text-secondary">{body}</p>
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
