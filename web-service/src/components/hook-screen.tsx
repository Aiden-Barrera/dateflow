"use client";

import { Button } from "./button";
import { Logo } from "./logo";

type HookScreenProps = {
  readonly creatorName: string;
  readonly onContinue: () => void;
};

/**
 * Screen 1 — The hook.
 *
 * "{Name} wants to plan your first date."
 * One sentence, one button, zero form fields.
 *
 * The decorative gradient blobs (coral + teal) fill the visual space
 * that FigmaMake couldn't generate. They sit behind the text at low
 * opacity, making the screen feel warm and designed rather than empty.
 */
export function HookScreen({ creatorName, onContinue }: HookScreenProps) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-bg px-6 pb-10 pt-8">
      <div
        className="pointer-events-none absolute -right-20 top-16 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--color-primary)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-24 bottom-40 h-80 w-80 rounded-full opacity-15 blur-3xl"
        style={{ background: "var(--color-secondary)" }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col">
        <header className="flex items-center justify-between">
          <Logo />
          <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-caption font-medium text-text-secondary shadow-sm backdrop-blur">
            3-step invite
          </span>
        </header>

        <div className="flex flex-1 flex-col justify-center lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          <section className="max-w-2xl">
            <p className="text-caption font-semibold uppercase tracking-[0.28em] text-secondary">
              Person B entry
            </p>
            <h1 className="mt-4 text-[clamp(3.25rem,10vw,6rem)] font-semibold leading-[0.92] tracking-[-0.06em] text-text">
              <span className="text-primary">{creatorName}</span> wants to plan your first date.
            </h1>
            <p className="mt-5 max-w-xl text-body text-text-secondary">
              This stays lightweight on purpose. Three quick choices, no account wall, and then Dateflow builds the shortlist for both of you.
            </p>

            <div className="mt-8 w-full max-w-sm">
              <Button onClick={onContinue}>Start in 60 seconds</Button>
            </div>

            <p className="mt-4 flex items-center gap-1.5 text-caption text-text-secondary">
              <LockIcon />
              No sign-up required
            </p>
          </section>

          <aside className="mt-10 rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_24px_80px_rgba(45,42,38,0.12)] backdrop-blur-sm lg:mt-0">
            <div className="space-y-5">
              <TrustItem
                eyebrow="Step 1"
                title="Share your area"
                body="Use location once or type a city. We only need enough to find a fair midpoint."
              />
              <TrustItem
                eyebrow="Step 2"
                title="Pick the vibe"
                body="Food, drinks, an activity, or an event. Choose what feels easy."
              />
              <TrustItem
                eyebrow="Step 3"
                title="Let the shortlist build"
                body="Once both sides are in, the swipe deck is prepared automatically."
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function TrustItem({
  eyebrow,
  title,
  body,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-muted bg-bg/75 p-4">
      <p className="text-caption font-semibold uppercase tracking-[0.2em] text-secondary">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-h2 font-semibold text-text">{title}</h2>
      <p className="mt-2 text-body text-text-secondary">{body}</p>
    </div>
  );
}

/** Minimal lock icon — trust signal below the CTA */
function LockIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}
