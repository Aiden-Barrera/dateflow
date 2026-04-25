import type { DayOfWeek, ScheduleWindow, TimeOfDay } from "../types/preference";

type PartialSchedulePref = {
  scheduleWindow?: ScheduleWindow;
  availableDays?: readonly DayOfWeek[];
  timeOfDay?: TimeOfDay;
};

type TimeRange = { start: number; end: number };

type ResolveScheduleResult = {
  startDate: Date;
  endDate: Date;
  timeRange: TimeRange;
  intersectedDays: DayOfWeek[];
  hasIntersection: boolean;
};

const ALL_DAYS: DayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const TIME_RANGES: Record<TimeOfDay, TimeRange> = {
  afternoon: { start: 12, end: 17 },
  evening: { start: 17, end: 22 },
  night: { start: 20, end: 24 },
  any: { start: 10, end: 23 },
};

const WINDOW_RANK: Record<ScheduleWindow, number> = {
  this_week: 0,
  next_week: 1,
  two_weeks: 2,
  flexible: 3,
};

function addUTCDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function windowDateRange(window: ScheduleWindow, now: Date): { start: Date; end: Date } {
  const start = new Date(now);
  // UTC day-of-week: Mon=0 … Sun=6
  const utcDow = (now.getUTCDay() + 6) % 7;

  if (window === "this_week") {
    return { start, end: addUTCDays(start, 6 - utcDow) };
  }

  if (window === "next_week") {
    const daysUntilNextMonday = ((7 - utcDow) % 7) || 7;
    const nextMonday = addUTCDays(start, daysUntilNextMonday);
    return { start: nextMonday, end: addUTCDays(nextMonday, 6) };
  }

  if (window === "two_weeks") {
    return { start, end: addUTCDays(start, 13) };
  }

  // flexible — 30 days
  return { start, end: addUTCDays(start, 30) };
}

function resolveWindow(
  a: ScheduleWindow | undefined,
  b: ScheduleWindow | undefined,
  now: Date,
): { startDate: Date; endDate: Date } {
  if (!a && !b) {
    return { startDate: now, endDate: addUTCDays(now, 30) };
  }

  const winner =
    a && b
      ? WINDOW_RANK[a] <= WINDOW_RANK[b]
        ? a
        : b
      : (a ?? b)!;

  const range = windowDateRange(winner, now);
  return { startDate: range.start, endDate: range.end };
}

function resolveDays(
  a: readonly DayOfWeek[] | undefined,
  b: readonly DayOfWeek[] | undefined,
): DayOfWeek[] {
  // Treat undefined as "any day" (all 7) so one-sided input is preserved.
  const daysA = a ?? ALL_DAYS;
  const daysB = b ?? ALL_DAYS;
  const setB = new Set(daysB);
  const intersection = daysA.filter((d) => setB.has(d));
  return intersection.length > 0 ? intersection : [...ALL_DAYS];
}

function resolveTimeRange(
  a: TimeOfDay | undefined,
  b: TimeOfDay | undefined,
): TimeRange {
  const specific = (t: TimeOfDay | undefined) => t && t !== "any";

  if (specific(a)) return TIME_RANGES[a!];
  if (specific(b)) return TIME_RANGES[b!];
  return TIME_RANGES["any"];
}

export function resolveSchedule(
  prefA: PartialSchedulePref,
  prefB: PartialSchedulePref,
): ResolveScheduleResult {
  const hasAnyData =
    prefA.scheduleWindow ||
    prefA.availableDays ||
    prefA.timeOfDay ||
    prefB.scheduleWindow ||
    prefB.availableDays ||
    prefB.timeOfDay;

  if (!hasAnyData) {
    const now = new Date();
    return {
      startDate: now,
      endDate: addUTCDays(now, 30),
      timeRange: TIME_RANGES["any"],
      intersectedDays: [],
      hasIntersection: false,
    };
  }

  const now = new Date();
  const { startDate, endDate } = resolveWindow(prefA.scheduleWindow, prefB.scheduleWindow, now);
  const intersectedDays = resolveDays(prefA.availableDays, prefB.availableDays);
  const timeRange = resolveTimeRange(prefA.timeOfDay, prefB.timeOfDay);

  return { startDate, endDate, timeRange, intersectedDays, hasIntersection: true };
}
