import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resolveSchedule } from "../schedule-intersection";
import type { ScheduleWindow, DayOfWeek, TimeOfDay } from "../../types/preference";

// Pin "now" to a known Monday so day-of-week math is deterministic.
// 2026-04-27 is a Monday.
const MONDAY = new Date("2026-04-27T00:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(MONDAY);
});

afterEach(() => {
  vi.useRealTimers();
});

type PartialSchedule = {
  scheduleWindow?: ScheduleWindow;
  availableDays?: readonly DayOfWeek[];
  timeOfDay?: TimeOfDay;
};

function pref(p: PartialSchedule) {
  return p;
}

describe("resolveSchedule — window priority", () => {
  it("uses this_week when both say this_week", () => {
    const result = resolveSchedule(
      pref({ scheduleWindow: "this_week", availableDays: ["sat"], timeOfDay: "any" }),
      pref({ scheduleWindow: "this_week", availableDays: ["sat"], timeOfDay: "any" }),
    );
    // this_week from Monday 2026-04-27 → ends Sunday 2026-05-03
    expect(result.startDate.toISOString().slice(0, 10)).toBe("2026-04-27");
    expect(result.endDate.toISOString().slice(0, 10)).toBe("2026-05-03");
  });

  it("uses the earlier window when they differ", () => {
    const result = resolveSchedule(
      pref({ scheduleWindow: "next_week", availableDays: ["sat"], timeOfDay: "any" }),
      pref({ scheduleWindow: "this_week", availableDays: ["sat"], timeOfDay: "any" }),
    );
    expect(result.startDate.toISOString().slice(0, 10)).toBe("2026-04-27");
    expect(result.endDate.toISOString().slice(0, 10)).toBe("2026-05-03");
  });

  it("flexible spans the next 30 days", () => {
    const result = resolveSchedule(
      pref({ scheduleWindow: "flexible", availableDays: ["sat"], timeOfDay: "any" }),
      pref({ scheduleWindow: "flexible", availableDays: ["sat"], timeOfDay: "any" }),
    );
    expect(result.startDate.toISOString().slice(0, 10)).toBe("2026-04-27");
    expect(result.endDate.toISOString().slice(0, 10)).toBe("2026-05-27");
  });

  it("two_weeks spans 14 days", () => {
    const result = resolveSchedule(
      pref({ scheduleWindow: "two_weeks", availableDays: ["sat"], timeOfDay: "any" }),
      pref({ scheduleWindow: "two_weeks", availableDays: ["sat"], timeOfDay: "any" }),
    );
    expect(result.startDate.toISOString().slice(0, 10)).toBe("2026-04-27");
    expect(result.endDate.toISOString().slice(0, 10)).toBe("2026-05-10");
  });
});

describe("resolveSchedule — day intersection", () => {
  it("intersects overlapping days", () => {
    const result = resolveSchedule(
      pref({ scheduleWindow: "this_week", availableDays: ["fri", "sat", "sun"], timeOfDay: "any" }),
      pref({ scheduleWindow: "this_week", availableDays: ["sat", "sun", "mon"], timeOfDay: "any" }),
    );
    expect(result.intersectedDays).toEqual(["sat", "sun"]);
    expect(result.hasIntersection).toBe(true);
  });

  it("hasIntersection true even with no overlapping days — falls back to all days", () => {
    const result = resolveSchedule(
      pref({ scheduleWindow: "this_week", availableDays: ["mon", "tue"], timeOfDay: "any" }),
      pref({ scheduleWindow: "this_week", availableDays: ["fri", "sat"], timeOfDay: "any" }),
    );
    // No day overlap → fall back to all 7 days, but still hasIntersection
    expect(result.hasIntersection).toBe(true);
    expect(result.intersectedDays).toHaveLength(7);
  });

  it("hasIntersection false when both prefs have no schedule data", () => {
    const result = resolveSchedule(pref({}), pref({}));
    expect(result.hasIntersection).toBe(false);
  });
});

describe("resolveSchedule — time of day", () => {
  it("prefers specific over any", () => {
    const result = resolveSchedule(
      pref({ scheduleWindow: "this_week", availableDays: ["sat"], timeOfDay: "any" }),
      pref({ scheduleWindow: "this_week", availableDays: ["sat"], timeOfDay: "evening" }),
    );
    expect(result.timeRange).toEqual({ start: 17, end: 22 });
  });

  it("afternoon maps to 12–17", () => {
    const result = resolveSchedule(
      pref({ scheduleWindow: "this_week", availableDays: ["sat"], timeOfDay: "afternoon" }),
      pref({ scheduleWindow: "this_week", availableDays: ["sat"], timeOfDay: "afternoon" }),
    );
    expect(result.timeRange).toEqual({ start: 12, end: 17 });
  });

  it("night maps to 20–00", () => {
    const result = resolveSchedule(
      pref({ scheduleWindow: "this_week", availableDays: ["sat"], timeOfDay: "night" }),
      pref({ scheduleWindow: "this_week", availableDays: ["sat"], timeOfDay: "any" }),
    );
    expect(result.timeRange).toEqual({ start: 20, end: 24 });
  });

  it("any maps to 10–23", () => {
    const result = resolveSchedule(
      pref({ scheduleWindow: "this_week", availableDays: ["sat"], timeOfDay: "any" }),
      pref({ scheduleWindow: "this_week", availableDays: ["sat"], timeOfDay: "any" }),
    );
    expect(result.timeRange).toEqual({ start: 10, end: 23 });
  });
});
