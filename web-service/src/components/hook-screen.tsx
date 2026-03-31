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
    <div className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-bg px-6">
      {/* --- Decorative gradient blobs --- */}
      {/* Coral blob — upper right, represents Person A */}
      <div
        className="pointer-events-none absolute -right-20 top-16 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--color-primary)" }}
        aria-hidden="true"
      />
      {/* Teal blob — lower left, represents Person B */}
      <div
        className="pointer-events-none absolute -left-24 bottom-40 h-80 w-80 rounded-full opacity-15 blur-3xl"
        style={{ background: "var(--color-secondary)" }}
        aria-hidden="true"
      />

      {/* --- Logo --- */}
      <div className="pt-14 pb-4">
        <Logo />
      </div>

      {/* --- Main content (vertically centered) --- */}
      <div className="flex flex-1 flex-col items-center justify-center pb-24">
        <h1 className="text-center text-display font-bold leading-[1.2] tracking-tight">
          <span className="text-primary">{creatorName}</span>
          {" wants to plan your first date."}
        </h1>

        <p className="mt-4 text-center text-body text-text-secondary">
          It takes 60 seconds. No account needed.
        </p>

        <div className="mt-8 w-full max-w-sm">
          <Button onClick={onContinue}>Add my preferences</Button>
        </div>

        {/* Trust signal */}
        <p className="mt-4 flex items-center gap-1.5 text-caption text-text-secondary">
          <LockIcon />
          No sign-up required
        </p>
      </div>
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
