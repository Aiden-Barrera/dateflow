"use client";

import { Button } from "./button";
import {
  getAuthSheetTitle,
  type AuthDraft,
  type AuthMode,
} from "./auth-sheet-state";

type AuthSheetProps = {
  readonly open: boolean;
  readonly mode: AuthMode;
  readonly draft: AuthDraft;
  readonly errorMessage: string | null;
  readonly submitting: boolean;
  readonly onClose: () => void;
  readonly onDraftChange: (next: AuthDraft) => void;
  readonly onModeChange: (mode: AuthMode) => void;
  readonly onSubmit: () => void;
  readonly onGoogle: () => void;
};

export function AuthSheet({
  open,
  mode,
  draft,
  errorMessage,
  submitting,
  onClose,
  onDraftChange,
  onModeChange,
  onSubmit,
  onGoogle,
}: AuthSheetProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(45,42,38,0.48)] p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-sheet-title"
    >
      <div
        className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/95 p-6 shadow-[0_24px_80px_rgba(45,42,38,0.22)] backdrop-blur"
        style={{
          animation: "authSheetEnter var(--motion-base) var(--ease-enter) both",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-caption font-semibold uppercase tracking-[0.2em] text-secondary">
              Account
            </p>
            <h2 id="auth-sheet-title" className="mt-2 text-h1 font-semibold text-text">
              {getAuthSheetTitle(mode)}
            </h2>
            <p className="mt-2 text-body text-text-secondary">
              We&apos;ll save this date so you can find it again later.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full border border-muted bg-bg px-3 py-2 text-caption font-medium text-text-secondary transition-colors duration-200 hover:border-text-secondary hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Close
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-bg p-1.5">
          <button
            type="button"
            onClick={() => onModeChange("register")}
            className={`cursor-pointer rounded-[1rem] px-4 py-3 text-body font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              mode === "register"
                ? "bg-white text-text shadow-sm"
                : "text-text-secondary hover:text-text"
            }`}
          >
            Create account
          </button>
          <button
            type="button"
            onClick={() => onModeChange("login")}
            className={`cursor-pointer rounded-[1rem] px-4 py-3 text-body font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              mode === "login"
                ? "bg-white text-text shadow-sm"
                : "text-text-secondary hover:text-text"
            }`}
          >
            Log in
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-2 block text-caption font-semibold uppercase tracking-[0.14em] text-text-secondary">
              Email
            </span>
            <input
              type="email"
              autoComplete="email"
              value={draft.email}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  email: event.target.value,
                })
              }
              className="w-full rounded-2xl border border-muted bg-white px-4 py-3 text-body text-text outline-none transition-colors duration-200 placeholder:text-text-secondary/70 focus:border-primary"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-caption font-semibold uppercase tracking-[0.14em] text-text-secondary">
              Password
            </span>
            <input
              type="password"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              value={draft.password}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  password: event.target.value,
                })
              }
              className="w-full rounded-2xl border border-muted bg-white px-4 py-3 text-body text-text outline-none transition-colors duration-200 placeholder:text-text-secondary/70 focus:border-primary"
              placeholder={mode === "register" ? "At least 8 characters" : "Your password"}
            />
          </label>

          {errorMessage ? (
            <p className="rounded-2xl border border-error/20 bg-error/8 px-4 py-3 text-body text-error">
              {errorMessage}
            </p>
          ) : null}

          <Button onClick={onSubmit} loading={submitting}>
            {mode === "register" ? "Create account" : "Log in"}
          </Button>

          <Button variant="secondary" onClick={onGoogle} disabled={submitting}>
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
