"use client";

import { useState } from "react";
import { Button } from "./button";
import type { DayOfWeek, ScheduleWindow, TimeOfDay } from "../lib/types/preference";

type ScheduleScreenProps = {
  readonly onComplete: (data: {
    scheduleWindow?: ScheduleWindow;
    availableDays?: DayOfWeek[];
    timeOfDay?: TimeOfDay;
  }) => void;
  readonly onBack: () => void;
  readonly stepLabel?: string;
};

const WINDOWS: { value: ScheduleWindow; label: string; sub: string }[] = [
  { value: "this_week", label: "This week", sub: "Next 7 days" },
  { value: "next_week", label: "Next week", sub: "Week after next" },
  { value: "two_weeks", label: "Two weeks", sub: "Flexible window" },
  { value: "flexible", label: "Flexible", sub: "Whenever works" },
];

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: "mon", label: "Mo" },
  { value: "tue", label: "Tu" },
  { value: "wed", label: "We" },
  { value: "thu", label: "Th" },
  { value: "fri", label: "Fr" },
  { value: "sat", label: "Sa" },
  { value: "sun", label: "Su" },
];

const TIMES: { value: TimeOfDay; label: string; sub: string }[] = [
  { value: "afternoon", label: "Afternoon", sub: "12 – 5 pm" },
  { value: "evening", label: "Evening", sub: "5 – 10 pm" },
  { value: "night", label: "Night", sub: "8 pm – late" },
  { value: "any", label: "Any time", sub: "No preference" },
];

export function ScheduleScreen({
  onComplete,
  onBack,
  stepLabel = "Step 3 of 3",
}: ScheduleScreenProps) {
  const [window, setWindow] = useState<ScheduleWindow | null>(null);
  const [days, setDays] = useState<DayOfWeek[]>([]);
  const [time, setTime] = useState<TimeOfDay | null>(null);

  function toggleDay(day: DayOfWeek) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  function handleSubmit() {
    onComplete({
      ...(window ? { scheduleWindow: window } : {}),
      ...(days.length > 0 ? { availableDays: days } : {}),
      ...(time ? { timeOfDay: time } : {}),
    });
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-bg px-6 pb-24 pt-6">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="flex items-center justify-between">
          <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-caption font-medium text-text-secondary shadow-sm">
            {stepLabel}
          </span>
          <div className="flex gap-1.5">
            <div className="h-2 w-10 rounded-full bg-secondary" />
            <div className="h-2 w-10 rounded-full bg-secondary" />
            <div className="h-2 w-10 rounded-full bg-secondary" />
          </div>
        </div>

        <button onClick={onBack} className="cursor-pointer pb-4 pt-4" aria-label="Go back">
          <BackArrow />
        </button>

        <h1 className="text-[clamp(2.2rem,7.5vw,3.4rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-text">
          When works for you?
        </h1>
        <p className="mt-3 text-body text-text-secondary">
          All optional — skip anything you don&apos;t care about.
        </p>

        <div className="mt-8 space-y-8">
          {/* Schedule window */}
          <section>
            <h2 className="text-body font-semibold text-text">Time frame</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {WINDOWS.map(({ value, label, sub }) => {
                const selected = window === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setWindow(selected ? null : value)}
                    aria-pressed={selected}
                    className={`flex h-[72px] cursor-pointer flex-col items-start justify-center rounded-[1.45rem] border-[1.5px] px-4 transition-all duration-200 active:scale-[0.97] ${
                      selected
                        ? "border-primary bg-primary text-white"
                        : "border-muted bg-surface text-text shadow-sm hover:border-text-secondary"
                    }`}
                  >
                    <span className="text-body font-semibold">{label}</span>
                    <span className={`text-caption ${selected ? "text-white/75" : "text-text-secondary"}`}>
                      {sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Days of week */}
          <section>
            <h2 className="text-body font-semibold text-text">Available days</h2>
            <div className="mt-3 flex gap-2">
              {DAYS.map(({ value, label }) => {
                const selected = days.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleDay(value)}
                    aria-pressed={selected}
                    className={`flex h-10 flex-1 cursor-pointer items-center justify-center rounded-xl border-[1.5px] text-caption font-semibold transition-all duration-200 active:scale-[0.97] ${
                      selected
                        ? "border-primary bg-primary text-white"
                        : "border-muted bg-surface text-text shadow-sm hover:border-text-secondary"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Time of day */}
          <section>
            <h2 className="text-body font-semibold text-text">Time of day</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {TIMES.map(({ value, label, sub }) => {
                const selected = time === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTime(selected ? null : value)}
                    aria-pressed={selected}
                    className={`flex h-[72px] cursor-pointer flex-col items-start justify-center rounded-[1.45rem] border-[1.5px] px-4 transition-all duration-200 active:scale-[0.97] ${
                      selected
                        ? "border-secondary bg-secondary-muted text-secondary"
                        : "border-muted bg-surface text-text shadow-sm hover:border-text-secondary"
                    }`}
                  >
                    <span className="text-body font-semibold">{label}</span>
                    <span className={`text-caption ${selected ? "text-secondary/75" : "text-text-secondary"}`}>
                      {sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-bg/95 px-6 pb-8 pt-4 backdrop-blur">
        <div className="mx-auto max-w-sm">
          <Button onClick={handleSubmit}>Continue</Button>
        </div>
      </div>
    </div>
  );
}

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
