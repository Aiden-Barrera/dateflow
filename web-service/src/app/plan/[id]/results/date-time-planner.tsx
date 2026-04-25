"use client";

/**
 * DateTimePlanner (DS-07D)
 *
 * Renders the calendar / time-coordination section on the result screen.
 *
 * Case A — Live event (venue.scheduledAt is set):
 *   Shows the event time prominently and an immediately-available calendar link.
 *
 * Case B — Static venue (no scheduledAt):
 *   Shows date chip picker. First user proposes; second confirms via Supabase
 *   realtime broadcast. Calendar link is gated until both agree.
 *
 * Case C — No schedule data at all (neither scheduledAt nor intersected days):
 *   Falls back to immediate calendar link (ICS will use 7 PM next day).
 */

import { useEffect, useState, useCallback } from "react";
import { getSupabaseClient } from "../../../../lib/supabase";
import { getDateProposalChannelName } from "../../../../lib/date-proposal-channel";
import type { DateProposalChannelEvent } from "../../../../lib/date-proposal-channel";
import type { DayOfWeek } from "../../../../lib/types/preference";
import type { Venue } from "../../../../lib/types/venue";

// ─── Types ────────────────────────────────────────────────────────────────────

type DateTimePlannerProps = {
  readonly sessionId: string;
  readonly venue: Venue;
  readonly role: "a" | "b";
  /** Days available for both users, from the schedule intersection (DayOfWeek abbreviations). */
  readonly intersectedDays?: readonly DayOfWeek[];
  /** If already confirmed (e.g. page reload after agreement). */
  readonly initialConfirmedDateTime?: Date | null;
  readonly calendarHref: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WEEKDAY_LABELS: Record<DayOfWeek, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

const TIME_SLOTS = ["6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM"];

function formatEventTime(date: Date): string {
  return date.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DateTimePlanner({
  sessionId,
  venue,
  role,
  intersectedDays = [],
  initialConfirmedDateTime = null,
  calendarHref,
}: DateTimePlannerProps) {
  const [confirmedDateTime, setConfirmedDateTime] = useState<Date | null>(
    initialConfirmedDateTime,
  );
  const [proposedDateTime, setProposedDateTime] = useState<Date | null>(null);
  const [proposedBy, setProposedBy] = useState<"a" | "b" | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Subscribe to the date-proposal channel ─────────────────────────────────
  useEffect(() => {
    const channel = getSupabaseClient()
      .channel(getDateProposalChannelName(sessionId))
      .on("broadcast", { event: "date_proposal" }, (payload: { payload: DateProposalChannelEvent }) => {
        const event = payload.payload;
        if (event.type === "date_proposed") {
          setProposedDateTime(new Date(event.dateTime));
          setProposedBy(event.proposedBy);
        }
        if (event.type === "date_confirmed") {
          setConfirmedDateTime(new Date(event.confirmedAt));
          setProposedDateTime(null);
          setProposedBy(null);
        }
      })
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [sessionId]);

  // ── Propose a time ─────────────────────────────────────────────────────────
  const handlePropose = useCallback(async () => {
    if (!selectedDay || !selectedTime) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/date-proposal`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "propose", proposedBy: role, day: selectedDay, time: selectedTime }),
      });
      if (!res.ok) throw new Error("Failed to propose time");
    } catch {
      setError("Couldn't send your proposal. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [sessionId, role, selectedDay, selectedTime]);

  // ── Confirm a proposal ─────────────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    if (!proposedDateTime) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/date-proposal`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "confirm", confirmedAt: proposedDateTime.toISOString() }),
      });
      if (!res.ok) throw new Error("Failed to confirm time");
    } catch {
      setError("Couldn't confirm the time. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [sessionId, proposedDateTime]);

  // ── Case A: Live event — time already known ────────────────────────────────
  if (venue.scheduledAt) {
    return (
      <LiveEventTimeSection
        venue={venue}
        calendarHref={calendarHref}
      />
    );
  }

  // ── Case C: No schedule data — immediate fallback calendar ─────────────────
  if (intersectedDays.length === 0 && !confirmedDateTime) {
    return <CalendarButtonSection calendarHref={calendarHref} available />;
  }

  // ── Case B: Static venue — date chip picker ────────────────────────────────
  return (
    <div className="mt-5 rounded-[1.5rem] border border-white/12 bg-white/[0.06] px-5 py-5 shadow-[0_24px_56px_rgba(0,0,0,0.35)] backdrop-blur-md">
      <p className="text-caption font-semibold uppercase tracking-[0.2em] text-white/65">
        Pick a time
      </p>

      {confirmedDateTime ? (
        // Both confirmed
        <div className="mt-4 space-y-4">
          <div className="rounded-[1.1rem] border border-[rgba(16,163,127,0.35)] bg-[rgba(16,163,127,0.12)] px-4 py-3">
            <p className="text-caption font-semibold text-[#10a37f]">✓ Time confirmed</p>
            <p className="mt-1 text-body font-semibold text-white">
              {formatEventTime(confirmedDateTime)}
            </p>
          </div>
          <CalendarButtonSection calendarHref={calendarHref} available />
        </div>
      ) : proposedDateTime && proposedBy !== role ? (
        // Partner has proposed — show confirmation prompt
        <div className="mt-4 space-y-4">
          <div className="rounded-[1.1rem] border border-white/20 bg-white/[0.08] px-4 py-3">
            <p className="text-caption text-white/65">
              Your match suggested:
            </p>
            <p className="mt-1 text-body font-semibold text-white">
              {formatEventTime(proposedDateTime)}
            </p>
          </div>
          {error ? <p className="text-caption text-red-400">{error}</p> : null}
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleConfirm()}
            className="h-12 w-full rounded-[1rem] bg-[#10a37f] text-body font-semibold text-white transition hover:bg-[#0e8e6f] disabled:opacity-60"
          >
            {submitting ? "Confirming…" : "Confirm this time ✓"}
          </button>
          <p className="text-center text-caption text-white/50">
            Or pick a different time below
          </p>
          <DatePickerForm
            intersectedDays={intersectedDays}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
            selectedTime={selectedTime}
            setSelectedTime={setSelectedTime}
            onPropose={() => void handlePropose()}
            submitting={submitting}
            label="Suggest a different time"
          />
        </div>
      ) : proposedDateTime && proposedBy === role ? (
        // We proposed — waiting for partner
        <div className="mt-4 space-y-3">
          <div className="rounded-[1.1rem] border border-white/20 bg-white/[0.08] px-4 py-3">
            <p className="text-caption text-white/65">You proposed:</p>
            <p className="mt-1 text-body font-semibold text-white">
              {formatEventTime(proposedDateTime)}
            </p>
          </div>
          <p className="text-caption text-white/50">Waiting for your match to confirm…</p>
          <CalendarButtonSection calendarHref={calendarHref} available={false} />
        </div>
      ) : (
        // No proposal yet — show picker
        <div className="mt-4">
          <p className="mb-3 text-body text-white/65">
            Pick a time — we&apos;ll send you both a calendar invite.
          </p>
          {error ? <p className="mb-3 text-caption text-red-400">{error}</p> : null}
          <DatePickerForm
            intersectedDays={intersectedDays}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
            selectedTime={selectedTime}
            setSelectedTime={setSelectedTime}
            onPropose={() => void handlePropose()}
            submitting={submitting}
            label="Propose this time"
          />
          <div className="mt-3">
            <CalendarButtonSection calendarHref={calendarHref} available={false} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LiveEventTimeSection({ venue, calendarHref }: { readonly venue: Venue; readonly calendarHref: string }) {
  return (
    <div className="mt-5 rounded-[1.5rem] border border-white/12 bg-white/[0.06] px-5 py-5 shadow-[0_24px_56px_rgba(0,0,0,0.35)] backdrop-blur-md">
      <p className="text-caption font-semibold uppercase tracking-[0.2em] text-white/65">
        Event time
      </p>
      <div className="mt-3 rounded-[1.1rem] border border-white/20 bg-white/[0.08] px-4 py-3">
        <p className="text-body font-semibold text-white">
          {venue.scheduledAt ? formatEventTime(venue.scheduledAt) : ""}
        </p>
        {venue.durationMinutes ? (
          <p className="mt-1 text-caption text-white/65">
            {formatDuration(venue.durationMinutes)}
          </p>
        ) : null}
        {venue.eventUrl ? (
          <a
            href={venue.eventUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block text-caption text-primary hover:underline"
          >
            View event page ↗
          </a>
        ) : null}
      </div>
      <div className="mt-3">
        <CalendarButtonSection calendarHref={calendarHref} available />
      </div>
    </div>
  );
}

function CalendarButtonSection({
  calendarHref,
  available,
}: {
  readonly calendarHref: string;
  readonly available: boolean;
}) {
  if (available) {
    return (
      <a
        href={calendarHref}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[1rem] border border-white/20 bg-white/[0.08] text-body font-semibold text-white transition hover:bg-white/[0.14]"
      >
        <CalendarIcon />
        Add to Calendar
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled
      title="Waiting for both of you to agree on a time"
      className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-[1rem] border border-white/10 bg-white/[0.04] text-body font-semibold text-white/40"
    >
      <CalendarIcon />
      Waiting for agreement…
    </button>
  );
}

function DatePickerForm({
  intersectedDays,
  selectedDay,
  setSelectedDay,
  selectedTime,
  setSelectedTime,
  onPropose,
  submitting,
  label,
}: {
  readonly intersectedDays: readonly DayOfWeek[];
  readonly selectedDay: DayOfWeek | null;
  readonly setSelectedDay: (d: DayOfWeek) => void;
  readonly selectedTime: string | null;
  readonly setSelectedTime: (t: string) => void;
  readonly onPropose: () => void;
  readonly submitting: boolean;
  readonly label: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {intersectedDays.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => setSelectedDay(day)}
            className={`rounded-full px-4 py-2 text-caption font-semibold transition ${
              selectedDay === day
                ? "bg-primary text-white"
                : "border border-white/20 bg-white/[0.06] text-white/70 hover:bg-white/[0.12]"
            }`}
          >
            {WEEKDAY_LABELS[day] ?? day.toUpperCase()}
          </button>
        ))}
      </div>

      {selectedDay ? (
        <div className="flex flex-wrap gap-2">
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => setSelectedTime(slot)}
              className={`rounded-full px-3 py-1.5 text-caption transition ${
                selectedTime === slot
                  ? "bg-primary font-semibold text-white"
                  : "border border-white/20 bg-white/[0.06] text-white/65 hover:bg-white/[0.12]"
              }`}
            >
              {slot}
            </button>
          ))}
        </div>
      ) : null}

      {selectedDay && selectedTime ? (
        <button
          type="button"
          disabled={submitting}
          onClick={onPropose}
          className="h-12 w-full rounded-[1rem] bg-primary text-body font-semibold text-white transition hover:bg-[#b8304f] disabled:opacity-60"
        >
          {submitting ? "Sending…" : label}
        </button>
      ) : null}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
