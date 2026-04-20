import type { BudgetLevel } from "../lib/types/preference";

type BudgetIconProps = {
  readonly budget: BudgetLevel;
  readonly className?: string;
};

export function BudgetIcon({ budget, className = "h-4 w-4" }: BudgetIconProps) {
  if (budget === "BUDGET") {
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
        <path d="M4 9h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9Z" />
        <path d="M16 10h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2" />
        <path d="M8 3c0 1 1 1.5 1 3" />
        <path d="M12 3c0 1 1 1.5 1 3" />
      </svg>
    );
  }

  if (budget === "MODERATE") {
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
        <path d="M6 3v7a2 2 0 0 0 2 2v9" />
        <path d="M10 3v7a2 2 0 0 1-2 2" />
        <path d="M16 3c-1.5 0-3 2-3 5s1.5 5 3 5v8" />
      </svg>
    );
  }

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
      <path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3L12 3Z" />
      <path d="M18 15l.7 1.8L20.5 17.5l-1.8.7L18 20l-.7-1.8L15.5 17.5l1.8-.7L18 15Z" />
    </svg>
  );
}
