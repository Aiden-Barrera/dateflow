"use client";

import { useEffect, useState } from "react";
import { Logo } from "./logo";
import { getSupabaseClient } from "../lib/supabase";
import {
  getPartnerPresenceChannelName,
  PARTNER_PRESENCE_EVENT,
} from "../lib/partner-presence-channel";

export type WaitingStatus =
  | "pending_b"
  | "b_opened"
  | "both_ready"
  | "generating"
  | "generation_failed"
  | "expired";

type WaitingForPartnerScreenProps = {
  readonly creatorName: string;
  readonly shareUrl: string;
  readonly sessionId: string;
  readonly status: WaitingStatus;
  readonly copyState: "idle" | "copied";
  readonly errorMessage: string | null;
  readonly onCopyInvite: () => void;
};

const HEADLINE: Record<WaitingStatus, string> = {
  pending_b: "Waiting on them…",
  b_opened: "They opened it!",
  both_ready: "They're in!",
  generating: "Finding your spots",
  generation_failed: "Something went sideways",
  expired: "This one expired",
};

const SUBLINE: Record<WaitingStatus, string> = {
  pending_b:
    "The moment they open your link and lock in their side, you'll know.",
  b_opened: "They're looking at it right now — filling in their side.",
  both_ready: "Both sides locked in. Building your shortlist now.",
  generating: "Mixing your vibes and ranking what works for you both.",
  generation_failed:
    "Venue generation hit a snag. Open the session to retry.",
  expired: "The invite timed out. Start a fresh session and try again.",
};

type StepState = "done" | "active" | "pending";

function resolveSteps(
  status: WaitingStatus,
): readonly [StepState, StepState, StepState] {
  if (status === "pending_b" || status === "expired") {
    return ["done", "active", "pending"];
  }
  if (status === "b_opened") {
    // Partner opened link — step 2 is mid-way (active but with orb lit)
    return ["done", "active", "pending"];
  }
  return ["done", "done", "active"];
}

function isPartnerJoined(status: WaitingStatus) {
  return (
    status === "both_ready" ||
    status === "generating" ||
    status === "generation_failed"
  );
}

function isPartnerOpened(status: WaitingStatus) {
  return status === "b_opened";
}

export function WaitingForPartnerScreen({
  creatorName,
  shareUrl,
  sessionId,
  status,
  copyState,
  errorMessage,
  onCopyInvite,
}: WaitingForPartnerScreenProps) {
  // Track whether Person B has opened the link via realtime broadcast.
  // DB-driven status (prop) always takes precedence — once status moves past
  // pending_b the broadcast state is irrelevant.
  const [partnerOpened, setPartnerOpened] = useState(false);

  // Subscribe to the partner-presence broadcast channel.
  useEffect(() => {
    const channel = getSupabaseClient()
      .channel(getPartnerPresenceChannelName(sessionId))
      .on("broadcast", { event: PARTNER_PRESENCE_EVENT }, () => {
        setPartnerOpened(true);
      })
      .subscribe();
    return () => { void channel.unsubscribe(); };
  }, [sessionId]);

  // Derive the display status. DB status wins once B has submitted.
  const liveStatus: WaitingStatus =
    status !== "pending_b"
      ? status
      : partnerOpened
        ? "b_opened"
        : "pending_b";

  const joined = isPartnerJoined(liveStatus);
  const opened = isPartnerOpened(liveStatus);
  const [s1, s2, s3] = resolveSteps(liveStatus);
  const initial = creatorName.trim().charAt(0).toUpperCase() || "?";

  return (
    <main
      className="relative flex min-h-dvh flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_#4a302a_0%,_#2a1a15_60%,_#1a0f0c_100%)] px-6 pb-10 pt-8 text-white"
      aria-live="polite"
      aria-label={`Waiting screen — ${HEADLINE[status]}`}
    >
      {/* Top ambient bloom */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(232,160,138,0.22) 0%, transparent 72%)",
        }}
        aria-hidden="true"
      />
      {/* Bottom ambient bloom */}
      <div
        className="pointer-events-none absolute -bottom-16 right-0 h-56 w-56 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(74,48,42,0.55) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-sm flex-1 flex-col">
        <Logo />

        {/* Vertically centred main content */}
        <div className="flex flex-1 flex-col items-center justify-center gap-10 py-8">
          <OrbPair joined={joined} opened={opened} creatorInitial={initial} />

          {/* Status copy — keyed on liveStatus so it re-animates on change */}
          <div className="text-center" key={liveStatus}>
            <h1
              className="text-[clamp(1.85rem,7vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.035em] text-white"
              style={{ animation: "wfpFadeUp 0.42s var(--ease-enter) both" }}
            >
              {HEADLINE[liveStatus]}
            </h1>
            <p
              className="mx-auto mt-3 max-w-[22ch] text-[0.9375rem] leading-relaxed text-white/58"
              style={{
                animation: "wfpFadeUp 0.42s 0.06s var(--ease-enter) both",
              }}
            >
              {SUBLINE[liveStatus]}
            </p>
          </div>

          {/* Three-step progress */}
          <div className="flex items-start">
            <ProgressStep state={s1} label="Invite sent" index={0} />
            <ProgressConnector filled={s1 === "done"} />
            <ProgressStep state={s2} label="Partner joined" index={1} />
            <ProgressConnector filled={s2 === "done"} />
            <ProgressStep state={s3} label="Spots found" index={2} />
          </div>
        </div>

        {/* Share card — pinned to bottom, visually recessive */}
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 shadow-[0_16px_48px_rgba(0,0,0,0.4)] backdrop-blur-sm">
          <p className="text-[0.67rem] font-semibold uppercase tracking-[0.26em] text-white/45">
            Invite link
          </p>
          <p className="mt-2 break-all text-[0.8rem] font-medium leading-snug text-white/70">
            {shareUrl}
          </p>
          <button
            type="button"
            onClick={onCopyInvite}
            className={`mt-4 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-[0.875rem] font-semibold transition-all duration-200 active:scale-[0.98] ${
              copyState === "copied"
                ? "border border-white/25 bg-white/10 text-white"
                : "border border-white/12 bg-white/[0.06] text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            {copyState === "copied" ? (
              <>
                <CheckIcon className="h-4 w-4 text-[var(--color-success)]" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <CopyIcon className="h-4 w-4" />
                <span>Copy link</span>
              </>
            )}
          </button>
          {errorMessage ? (
            <p
              className="mt-3 text-[0.8125rem] text-[var(--color-error)]"
              role="alert"
            >
              {errorMessage}
            </p>
          ) : null}
        </div>
      </div>

      {/* All keyframes in one global block — wfp prefix avoids collisions */}
      <style jsx global>{`
        @keyframes wfpFadeUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes wfpGhostPulse {
          0%,
          100% {
            opacity: 0.48;
            transform: scale(0.95);
          }
          50% {
            opacity: 0.82;
            transform: scale(1.04);
          }
        }
        @keyframes wfpOrbIgnite {
          0% {
            transform: scale(0.6);
            opacity: 0;
          }
          60% {
            transform: scale(1.12);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes wfpLineFill {
          from {
            clip-path: inset(0 100% 0 0);
          }
          to {
            clip-path: inset(0 0% 0 0);
          }
        }
        @keyframes wfpShimmer {
          from {
            left: -40%;
          }
          to {
            left: 130%;
          }
        }
        @keyframes wfpDotPulse {
          0%,
          100% {
            transform: scaleY(0.65);
            opacity: 0.3;
          }
          50% {
            transform: scaleY(1.2);
            opacity: 0.75;
          }
        }
        @keyframes wfpBloomIn {
          from {
            opacity: 0;
            transform: scale(0.7);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </main>
  );
}

// ── Orb pair ────────────────────────────────────────────────────────────────

function OrbPair({
  joined,
  opened,
  creatorInitial,
}: {
  readonly joined: boolean;
  readonly opened: boolean;
  readonly creatorInitial: string;
}) {
  return (
    <div className="flex items-center" aria-hidden="true">
      {/* Person A — settled amber orb */}
      <div className="flex flex-col items-center gap-2.5">
        <div className="relative">
          <div
            className="pointer-events-none absolute -inset-5 rounded-full blur-2xl"
            style={{
              background:
                "radial-gradient(circle, rgba(232,160,138,0.38) 0%, transparent 70%)",
            }}
          />
          <div
            className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full text-xl font-bold text-[#1a0f0c] shadow-[0_10px_28px_rgba(232,160,138,0.42)]"
            style={{
              background: "linear-gradient(135deg, #e8c0a6, #c97a5e)",
            }}
          >
            {creatorInitial}
          </div>
        </div>
        <span className="text-[0.67rem] font-semibold uppercase tracking-[0.2em] text-white/40">
          You
        </span>
      </div>

      {/* Connection thread */}
      <div className="relative mx-5 mb-6 h-[2px] w-20 overflow-hidden rounded-full">
        {/* Dim base — always visible */}
        <div className="absolute inset-0 rounded-full bg-white/8" />
        {/* Pending: traveling shimmer */}
        {!joined ? (
          <div
            className="absolute h-full w-10 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(232,160,138,0.28), transparent)",
              animation: "wfpShimmer 2.6s ease-in-out infinite",
            }}
          />
        ) : null}
        {/* Joined: fills left-to-right */}
        {joined ? (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "linear-gradient(90deg, #c97a5e, #ff3d7f)",
              animation: "wfpLineFill 0.7s 0.1s var(--ease-enter) both",
            }}
          />
        ) : null}
      </div>

      {/* Person B — ghost → glowing (opened) → lit with checkmark (joined) */}
      <div className="flex flex-col items-center gap-2.5">
        <div className="relative">
          {(joined || opened) ? (
            <div
              className="pointer-events-none absolute -inset-5 rounded-full blur-2xl"
              style={{
                background: joined
                  ? "radial-gradient(circle, rgba(255,61,127,0.38) 0%, transparent 70%)"
                  : "radial-gradient(circle, rgba(255,61,127,0.18) 0%, transparent 70%)",
                animation: "wfpBloomIn 0.6s var(--ease-enter) both",
              }}
            />
          ) : null}
          {joined ? (
            // Fully submitted — lit orb with checkmark
            <div
              className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full text-white shadow-[0_10px_28px_rgba(255,61,127,0.42)]"
              style={{
                background: "linear-gradient(135deg, #ff6b9d, #c03060)",
                animation: "wfpOrbIgnite 0.55s var(--ease-enter) both",
              }}
            >
              <svg
                className="h-7 w-7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-label="Partner joined"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          ) : opened ? (
            // Opened link but still filling in — pulsing pink orb, no checkmark yet
            <div
              className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full border border-[rgba(255,61,127,0.4)] text-white"
              style={{
                background: "linear-gradient(135deg, rgba(255,107,157,0.35), rgba(192,48,96,0.35))",
                animation: "wfpGhostPulse 2s ease-in-out infinite",
                boxShadow: "0 8px 24px rgba(255,61,127,0.22)",
              }}
            >
              {/* Typing dots — still filling out their form */}
              <div className="flex items-center gap-[3.5px]">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-[5px] w-[5px] rounded-full bg-white/60"
                    style={{
                      animation: `wfpDotPulse 1.5s ${i * 0.2}s ease-in-out infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            // Not yet opened — fully ghost
            <div
              className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full border border-white/12"
              style={{
                background: "rgba(255,255,255,0.04)",
                animation: "wfpGhostPulse 3.2s ease-in-out infinite",
              }}
            >
              <div className="flex items-center gap-[3.5px]">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-[5px] w-[5px] rounded-full bg-white/28"
                    style={{
                      animation: `wfpDotPulse 1.5s ${i * 0.2}s ease-in-out infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        <span className="text-[0.67rem] font-semibold uppercase tracking-[0.2em] text-white/40">
          {joined ? "Joined" : opened ? "Active" : "Them"}
        </span>
      </div>
    </div>
  );
}

// ── Progress steps ───────────────────────────────────────────────────────────

function ProgressStep({
  state,
  label,
  index,
}: {
  readonly state: StepState;
  readonly label: string;
  readonly index: number;
}) {
  const isDone = state === "done";
  const isActive = state === "active";

  return (
    <div
      className="flex flex-col items-center gap-2"
      style={{
        animation: `wfpFadeUp 0.4s ${index * 0.07}s var(--ease-enter) both`,
      }}
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-[0.7rem] font-bold transition-all duration-500 ${
          isDone
            ? "bg-[#e8a08a] text-[#1a0f0c] shadow-[0_5px_14px_rgba(232,160,138,0.38)]"
            : isActive
              ? "border border-white/25 bg-white/10 text-white"
              : "border border-white/10 bg-transparent text-white/20"
        }`}
      >
        {isDone ? (
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-label="Complete"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <span>{index + 1}</span>
        )}
      </div>
      <span
        className={`w-[68px] text-center text-[0.62rem] font-semibold uppercase leading-tight tracking-[0.14em] ${
          isDone
            ? "text-white/58"
            : isActive
              ? "text-white/78"
              : "text-white/22"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function ProgressConnector({ filled }: { readonly filled: boolean }) {
  return (
    <div
      className="mb-[18px] mt-4 h-[1.5px] w-7 flex-shrink-0 rounded-full transition-all duration-700"
      style={{
        background: filled
          ? "linear-gradient(90deg, rgba(232,160,138,0.5), rgba(232,160,138,0.12))"
          : "rgba(255,255,255,0.08)",
      }}
    />
  );
}

// ── Icon helpers ─────────────────────────────────────────────────────────────

function CopyIcon({ className }: { readonly className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ className }: { readonly className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
