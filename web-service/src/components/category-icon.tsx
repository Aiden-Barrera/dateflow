"use client";

import type { Category } from "../lib/types/preference";

type CategoryIconProps = {
  readonly category: Category;
  readonly className?: string;
};

export function CategoryIcon({
  category,
  className = "h-4 w-4",
}: CategoryIconProps) {
  if (category === "RESTAURANT") {
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
        <path d="M6 3v9" />
        <path d="M10 3v9" />
        <path d="M6 7h4" />
        <path d="M18 3v18" />
        <path d="M14 3c0 2.5 1.8 4 4 4" />
      </svg>
    );
  }

  if (category === "BAR") {
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
        <path d="M8 3h8l-1 6a4 4 0 01-8 0L8 3Z" />
        <path d="M12 9v9" />
        <path d="M8 21h8" />
      </svg>
    );
  }

  if (category === "ACTIVITY") {
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
        <circle cx="12" cy="12" r="8" />
        <path d="m12 8 2.5 4L12 16l-2.5-4L12 8Z" />
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
      <path d="M4 7h16" />
      <path d="M6 3v8" />
      <path d="M18 3v8" />
      <path d="M5 11h14v10H5z" />
    </svg>
  );
}
