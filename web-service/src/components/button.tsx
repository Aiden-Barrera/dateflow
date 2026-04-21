"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = {
  readonly variant?: ButtonVariant;
  readonly loading?: boolean;
  readonly icon?: ReactNode;
  readonly children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

const baseStyles =
  "flex w-full items-center justify-center gap-2 rounded-2xl text-body font-semibold transition-all duration-200 h-14 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/80";

const variantStyles: Record<ButtonVariant, string> = {
  // The hero CTA — white pill with raspberry ink and a hot-pink halo.
  // Works on both the brown (Person A) and raspberry (Person B) canvases.
  primary:
    "bg-white text-[#4a1224] shadow-[0_18px_40px_rgba(255,61,127,0.35),_inset_0_1px_0_rgba(255,255,255,0.9)] motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_22px_48px_rgba(255,61,127,0.5),_inset_0_1px_0_rgba(255,255,255,0.9)]",
  // Secondary action on a dark canvas — translucent glass pill.
  secondary:
    "bg-white/[0.08] text-white border border-white/20 backdrop-blur-sm hover:bg-white/[0.14] hover:border-white/40 motion-safe:hover:-translate-y-0.5",
  // Quiet tertiary — for dismiss / skip style actions.
  ghost:
    "bg-transparent text-white/80 border border-white/10 hover:bg-white/[0.06] hover:text-white",
};

const disabledStyles =
  "bg-white/15 text-white/45 cursor-not-allowed shadow-none border-transparent";

const loadingStyles =
  "bg-white/70 text-[#4a1224]/70 cursor-wait shadow-none";

/**
 * Shared button — hero CTA uses white pill + raspberry ink + hot-pink glow,
 * works across the brown (Person A) and raspberry (Person B) canvases.
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
