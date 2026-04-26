"use client";

import { useState } from "react";
import type { DayOfWeek, ScheduleWindow, TimeOfDay } from "../lib/types/preference";

type Role = "a" | "b";

type ScheduleScreenProps = {
  readonly onComplete: (data: {
    scheduleWindow?: ScheduleWindow;
    availableDays?: DayOfWeek[];
    timeOfDay?: TimeOfDay;
  }) => void;
  readonly onBack: () => void;
  readonly stepLabel?: string;
  /** Controls gradient background + accent color. Default "b" (raspberry). */
  readonly role?: Role;
};

const WINDOWS: { value: ScheduleWindow; label: string; sub: string }[] = [
  { value: "this_week", label: "This week", sub: "Next 7 days" },
  { value: "next_week", label: "Next week", sub: "Upcoming week" },
  { value: "two_weeks", label: "Two weeks", sub: "Next 14 days" },
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

// Per-role theme tokens
const ROLE_THEME = {
  a: {
    bg: "bg-person-a",
    selectedCard: "border-[#c9a899] bg-[rgba(74,48,42,0.7)] text-white",
    selectedCardSub: "text-[#c9a899]",
    selectedDay: "bg-[#8a5a4a] border-[#c9a899] text-white",
    submitBtn: "bg-[#8a5a4a] hover:bg-[#4a302a] active:scale-[0.98]",
    progressFill: "bg-[#c9a899]",
    stepBadge: "border-[#c9a899]/40 bg-[#2a1a15]/70 text-[#c9a899]",
  },
  b: {
    bg: "bg-person-b",
    selectedCard: "border-[#e88aa6] bg-[rgba(138,35,70,0.55)] text-white",
    selectedCardSub: "text-[#f8d6e0]",
    selectedDay: "bg-[#d03d6a] border-[#e88aa6] text-white",
    submitBtn: "bg-[#d03d6a] hover:bg-[#8a2346] active:scale-[0.98]",
    progressFill: "bg-[#e88aa6]",
    stepBadge: "border-[#e88aa6]/40 bg-[#4a1224]/70 text-[#f8d6e0]",
  },
} as const;

export function ScheduleScreen({
  onComplete,
  onBack,
  stepLabel = "Step 2 of 2",
  role = "b",
}: ScheduleScreenProps) {
  const [window, setWindow] = useState<ScheduleWindow | null>(null);
  const [days, setDays] = useState<DayOfWeek[]>([]);
  const [time, setTime] = useState<TimeOfDay | null>(null);

  const theme = ROLE_THEME[role];

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
    <div className={`${theme.bg} min-h-dvh`}>
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-10 pt-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <span className={`rounded-full border px-3 py-1 text-caption font-medium backdrop-blur-sm ${theme.stepBadge}`}>
            {stepLabel}
          </span>
          <div className="flex gap-1.5">
            <div className={`h-2 w-10 rounded-full ${theme.progressFill}`} />
            <div className={`h-2 w-10 rounded-full ${theme.progressFill}`} />
          </div>
        </div>

        {/* Back button */}
        <button
          onClick={onBack}
          className="mt-4 flex items-center gap-1.5 self-start text-caption font-medium text-white/70 transition hover:text-white"
          aria-label="Go back"
        >
          <BackArrow />
          Back
        </button>

        {/* Title */}
        <h1 className="mt-6 text-[clamp(2.2rem,7.5vw,3.2rem)] font-bold leading-[0.95] tracking-[-0.04em] text-white">
          When works for you?
        </h1>
        <p className="mt-3 text-body text-white/65">
          All optional — skip anything you don&apos;t care about.
        </p>

        {/* Sections */}
        <div className="mt-8 space-y-8">

          {/* Time frame */}
          <section>
            <h2 className="text-caption font-semibold uppercase tracking-[0.18em] text-white/60">
              Time frame
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {WINDOWS.map(({ value, label, sub }) => {
                const selected = window === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setWindow(selected ? null : value)}
                    aria-pressed={selected}
                    className={`flex h-[72px] cursor-pointer flex-col items-start justify-center rounded-2xl border-[1.5px] px-4 transition-all duration-200 active:scale-[0.97] ${
                      selected
                        ? theme.selectedCard
                        : "border-white/15 bg-white/[0.06] text-white backdrop-blur-sm hover:border-white/30 hover:bg-white/[0.1]"
                    }`}
                  >
                    <span className="text-body font-semibold">{label}</span>
                    <span className={`text-caption ${selected ? theme.selectedCardSub : "text-white/55"}`}>
                      {sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Available days */}
          <section>
            <h2 className="text-caption font-semibold uppercase tracking-[0.18em] text-white/60">
              Available days
            </h2>
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
                        ? theme.selectedDay
                        : "border-white/15 bg-white/[0.06] text-white/80 hover:border-white/30"
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
            <h2 className="text-caption font-semibold uppercase tracking-[0.18em] text-white/60">
              Time of day
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {TIMES.map(({ value, label, sub }) => {
                const selected = time === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTime(selected ? null : value)}
                    aria-pressed={selected}
                    className={`flex h-[72px] cursor-pointer flex-col items-start justify-center rounded-2xl border-[1.5px] px-4 transition-all duration-200 active:scale-[0.97] ${
                      selected
                        ? theme.selectedCard
                        : "border-white/15 bg-white/[0.06] text-white backdrop-blur-sm hover:border-white/30 hover:bg-white/[0.1]"
                    }`}
                  >
                    <span className="text-body font-semibold">{label}</span>
                    <span className={`text-caption ${selected ? theme.selectedCardSub : "text-white/55"}`}>
                      {sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Submit — inline, scrolls with content, not sticky */}
        <div className="mt-10 pb-2">
          <button
            type="button"
            onClick={handleSubmit}
            className={`h-14 w-full rounded-2xl text-body font-semibold text-white shadow-lg transition-all duration-200 ${theme.submitBtn}`}
          >
            Continue
          </button>
          <p className="mt-3 text-center text-caption text-white/45">
            You can skip any section above
          </p>
        </div>
      </div>
    </div>
  );
}

function BackArrow() {
  return (
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
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}
