"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary";

type ButtonProps = {
  readonly variant?: ButtonVariant;
  readonly loading?: boolean;
  readonly icon?: ReactNode;
  readonly children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

const baseStyles =
  "flex w-full items-center justify-center gap-2 rounded-2xl text-body font-semibold transition-all duration-200 h-14 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:-translate-y-0.5";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-sm hover:bg-primary-hover hover:shadow-[0_14px_26px_rgba(224,116,104,0.24)] motion-safe:hover:-translate-y-0.5",
  secondary:
    "bg-surface text-text border-[1.5px] border-muted hover:border-text-secondary hover:shadow-[0_12px_20px_rgba(45,42,38,0.08)] motion-safe:hover:-translate-y-0.5",
};

const disabledStyles =
  "bg-muted text-text-secondary cursor-not-allowed shadow-none hover:bg-muted";

const loadingStyles =
  "bg-primary/70 text-white/90 cursor-wait shadow-none hover:bg-primary/70";

/**
 * Shared button component with primary/secondary variants and
 * loading/disabled states.
 *
 * Sizing: full-width, 56px tall (h-14), 16px border-radius (rounded-2xl).
 * All interactive elements in the app use this for consistent touch targets.
 */
export function Button({
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const stateStyles = loading
    ? loadingStyles
    : isDisabled
      ? disabledStyles
      : variantStyles[variant];

  return (
    <button
      disabled={isDisabled}
      className={`${baseStyles} ${stateStyles} ${className}`}
      {...rest}
    >
      {loading ? (
        <>
          <LoadingSpinner />
          {children}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}

/**
 * A simple spinning circle for button loading states.
 * Uses CSS animation — no JS, no external library.
 */
function LoadingSpinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
