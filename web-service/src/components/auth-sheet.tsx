"use client";

import { Button } from "./button";
import {
  getAuthSheetSubmitLabel,
  getAuthSheetSubtitle,
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
  readonly onApple: () => void;
};

const SERIF = "Georgia, 'Times New Roman', serif";

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
  onApple,
}: AuthSheetProps) {
  if (!open) {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes authOverlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes authCardIn {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes authCardInMobile {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .auth-overlay { animation: authOverlayIn 0.22s ease both; }
        .auth-card    { animation: authCardIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @media (max-width: 639px) {
          .auth-card { animation: authCardInMobile 0.3s cubic-bezier(0.16, 1, 0.3, 1) both; }
        }
      `}</style>

      {/* Overlay */}
      <div
        className="auth-overlay fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[rgba(10,8,6,0.72)] backdrop-blur-[8px] sm:items-center sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-sheet-title"
      >
        {/* Card */}
        <div className="auth-card relative flex w-full flex-col overflow-hidden rounded-t-[2.2rem] shadow-[0_40px_120px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04)] sm:max-w-[54rem] sm:flex-row sm:rounded-[2rem] sm:max-h-[min(48rem,calc(100dvh-3rem))]">

          {/* ── LEFT PANEL — mood & brand ── */}
          <div className="relative hidden flex-col overflow-hidden bg-[#1A1410] px-9 py-9 sm:flex sm:w-[44%] sm:shrink-0">

            {/* Ambient glow layers */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background: [
                  "radial-gradient(ellipse 90% 60% at 10% 0%,   rgba(224,116,104,0.28) 0%, transparent 55%)",
                  "radial-gradient(ellipse 70% 80% at 90% 100%,  rgba(91,154,139,0.2)  0%, transparent 50%)",
                  "radial-gradient(ellipse 55% 45% at 60% 45%,   rgba(255,255,255,0.025) 0%, transparent 70%)",
                ].join(","),
              }}
            />

            {/* Decorative concentric rings — bottom-right */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-10 -right-10 h-72 w-72 opacity-[0.06]"
            >
              <svg viewBox="0 0 200 200" fill="none">
                <circle cx="160" cy="160" r="130" stroke="white" strokeWidth="0.6" />
                <circle cx="160" cy="160" r="90"  stroke="white" strokeWidth="0.6" />
                <circle cx="160" cy="160" r="50"  stroke="white" strokeWidth="0.6" />
              </svg>
            </div>

            {/* Top brand mark */}
            <div className="relative flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
                <HeartDotIcon />
              </span>
              <span
                className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/35"
                style={{ letterSpacing: "0.28em" }}
              >
                Dateflow
              </span>
            </div>

            {/* Main serif headline */}
            <div className="relative mt-auto pt-20">
              <p className="mb-3.5 text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-white/25">
                {mode === "register" ? "New here" : "Back again"}
              </p>
              <h2
                aria-hidden="true"
                className="text-[3.4rem] font-normal leading-[1.0] text-white/90"
                style={{ fontFamily: SERIF, letterSpacing: "-0.02em" }}
              >
                {mode === "register" ? (
                  <>Save<br />this<br />date.</>
                ) : (
                  <>Good<br />to see<br />you.</>
                )}
              </h2>
              <p className="mt-5 text-[0.82rem] leading-relaxed text-white/38">
                Every match, direction, and plan —<br />
                kept in one place for both of you.
              </p>
            </div>

            {/* Feature pills */}
            <div className="relative mt-9 flex flex-wrap gap-2">
              {["Save every match", "Calendar sync", "Directions linked"].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-white/[0.1] bg-white/[0.055] px-3 py-1.5 text-[0.66rem] font-medium text-white/30"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* ── RIGHT PANEL — form ── */}
          <div className="flex-1 overflow-y-auto bg-[#F7F4F0] px-6 py-7 max-sm:max-h-[calc(100dvh-2rem)] sm:px-8 sm:py-8">

            {/* Accessible title (sr-only on desktop — left panel provides visual) */}
            <h2 id="auth-sheet-title" className="sr-only">
              {getAuthSheetTitle(mode)}
            </h2>

            {/* Mobile-only heading */}
            <div className="sm:hidden mb-6">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[#A09080]">
                Account
              </p>
              <p
                className="mt-2 text-[2rem] font-normal leading-[1.05] text-[#1A1410]"
                style={{ fontFamily: SERIF, letterSpacing: "-0.025em" }}
              >
                {getAuthSheetTitle(mode)}
              </p>
              <p className="mt-2.5 text-[0.85rem] leading-relaxed text-[#8A827A]">
                {getAuthSheetSubtitle(mode)}
              </p>
            </div>

            {/* Mode toggle + close button */}
            <div className="flex items-center gap-3">
              <div className="flex flex-1 gap-1 rounded-[0.9rem] bg-[#EAE6E1] p-[4px]">
                {(["register", "login"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onModeChange(m)}
                    className={`flex-1 cursor-pointer rounded-[0.65rem] px-3 py-2.5 text-[0.83rem] font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E07468] ${
                      mode === m
                        ? "bg-white text-[#1A1410] shadow-[0_1px_6px_rgba(0,0,0,0.1)]"
                        : "text-[#8A827A] hover:text-[#1A1410]"
                    }`}
                  >
                    {m === "register" ? "Create account" : "Log in"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close account modal"
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[#DDD8D1] bg-white text-[#8A827A] shadow-sm transition-all duration-200 hover:border-[#C8C0B5] hover:text-[#1A1410] motion-safe:hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E07468]"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Desktop subtitle */}
            <p className="mt-4 hidden text-[0.83rem] leading-relaxed text-[#8A827A] sm:block">
              {getAuthSheetSubtitle(mode)}
            </p>

            {/* OAuth buttons */}
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <OAuthButton
                onClick={onApple}
                disabled={submitting}
                variant="dark"
                icon={<AppleIcon />}
                label="Apple"
              />
              <OAuthButton
                onClick={onGoogle}
                disabled={submitting}
                variant="light"
                icon={<GoogleIcon />}
                label="Google"
              />
            </div>

            {/* Divider */}
            <div className="mt-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#DDD8D1]" />
              <span className="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[#B0A89F]">
                or email
              </span>
              <div className="h-px flex-1 bg-[#DDD8D1]" />
            </div>

            {/* Form fields */}
            <div className="mt-5 space-y-3.5">
              <label className="block">
                <span className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.17em] text-[#8A827A]">
                  Email
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  value={draft.email}
                  onChange={(event) =>
                    onDraftChange({ ...draft, email: event.target.value })
                  }
                  placeholder="you@example.com"
                  className="w-full rounded-[0.85rem] border border-[#DDD8D1] bg-white px-4 py-3 text-[0.9rem] text-[#1A1410] outline-none placeholder:text-[#C0B8AF] transition-[border-color,box-shadow] duration-200 focus:border-[#E07468] focus:shadow-[0_0_0_3px_rgba(224,116,104,0.15)]"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.17em] text-[#8A827A]">
                  Password
                </span>
                <input
                  type="password"
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  value={draft.password}
                  onChange={(event) =>
                    onDraftChange({ ...draft, password: event.target.value })
                  }
                  placeholder={
                    mode === "register" ? "At least 8 characters" : "Your password"
                  }
                  className="w-full rounded-[0.85rem] border border-[#DDD8D1] bg-white px-4 py-3 text-[0.9rem] text-[#1A1410] outline-none placeholder:text-[#C0B8AF] transition-[border-color,box-shadow] duration-200 focus:border-[#E07468] focus:shadow-[0_0_0_3px_rgba(224,116,104,0.15)]"
                />
              </label>

              <p className="text-[0.79rem] text-[#A09890]">
                {mode === "register"
                  ? "Use email if you prefer a password instead."
                  : "Use the same email you used when you saved your date."}
              </p>

              {errorMessage ? (
                <p className="rounded-[0.85rem] border border-[#F0CECA] bg-[#FDF3F2] px-4 py-3 text-[0.87rem] text-[#C0504A]">
                  {errorMessage}
                </p>
              ) : null}

              <Button
                onClick={onSubmit}
                loading={submitting}
                className="rounded-[0.85rem]"
              >
                {getAuthSheetSubmitLabel(mode)}
              </Button>
            </div>

            {/* Fine print */}
            <p className="mt-5 text-[0.7rem] leading-relaxed text-[#B0A89F]">
              By continuing, you agree to save this date to your account. We only
              use your details to sign you in and keep your plans accessible.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Sub-components ── */

type OAuthButtonProps = {
  readonly onClick: () => void;
  readonly disabled: boolean;
  readonly variant: "dark" | "light";
  readonly icon: React.ReactNode;
  readonly label: string;
};

function OAuthButton({ onClick, disabled, variant, icon, label }: OAuthButtonProps) {
  const base =
    "flex h-[3.1rem] w-full cursor-pointer items-center justify-center gap-2.5 rounded-[0.85rem] px-4 text-[0.87rem] font-semibold transition-[transform,box-shadow,opacity] duration-200 motion-safe:hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E07468] disabled:cursor-not-allowed disabled:opacity-50";

  const dark =
    "bg-[#0D0B09] text-white shadow-[0_2px_8px_rgba(0,0,0,0.22)] hover:shadow-[0_6px_22px_rgba(0,0,0,0.32)]";

  const light =
    "border border-[#DDD8D1] bg-white text-[#1A1410] shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:border-[#C8C0B5] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variant === "dark" ? dark : light}`}
    >
      {icon}
      {label}
    </button>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  );
}

function HeartDotIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3" fill="none">
      <path
        d="M8 13.5S2 9.5 2 5.5a3 3 0 0 1 6-1.02A3 3 0 0 1 14 5.5c0 4-6 8-6 8z"
        fill="rgba(224,116,104,0.7)"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="currentColor"
    >
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
      <path
        d="M21.8 12.23c0-.68-.06-1.33-.17-1.95H12v3.7h5.5a4.7 4.7 0 0 1-2.04 3.09v2.57h3.3c1.93-1.78 3.04-4.41 3.04-7.41Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.76 0 5.08-.91 6.77-2.47l-3.3-2.57c-.91.61-2.08.97-3.47.97-2.67 0-4.93-1.8-5.73-4.22H2.86v2.64A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.27 13.71A5.98 5.98 0 0 1 5.95 12c0-.59.11-1.17.32-1.71V7.65H2.86A10 10 0 0 0 2 12c0 1.6.38 3.12 1.06 4.35l3.21-2.64Z"
        fill="#FBBC04"
      />
      <path
        d="M12 6.07c1.5 0 2.85.52 3.91 1.53l2.93-2.93C17.07 2.99 14.76 2 12 2 8.09 2 4.71 4.24 3.06 7.65l3.21 2.64C7.07 7.87 9.33 6.07 12 6.07Z"
        fill="#EA4335"
      />
    </svg>
  );
}
