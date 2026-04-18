import type { StoredSessionLink } from "../lib/session-link-storage";

export type AuthMode = "register" | "login";

export type AuthDraft = {
  readonly mode: AuthMode;
  readonly email: string;
  readonly password: string;
};

type ValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getAuthSheetTitle(mode: AuthMode): string {
  return mode === "register" ? "Save this date" : "Welcome back";
}

export function getAuthSheetSubtitle(mode: AuthMode): string {
  return mode === "register"
    ? "Create an account to keep your match, directions, and future plans in one place."
    : "Pick up where you left off and get back to your saved dates in a few seconds.";
}

export function getAuthSheetSubmitLabel(mode: AuthMode): string {
  return mode === "register" ? "Create account with email" : "Log in with email";
}

export function validateAuthSubmission(draft: AuthDraft): ValidationResult {
  if (!EMAIL_PATTERN.test(draft.email.trim())) {
    return {
      valid: false,
      error: "Enter a valid email address",
    };
  }

  if (draft.mode === "register" && draft.password.length < 8) {
    return {
      valid: false,
      error: "Use at least 8 characters",
    };
  }

  if (draft.password.trim().length === 0) {
    return {
      valid: false,
      error: "Enter your password",
    };
  }

  return { valid: true };
}

export function buildAuthRequest(
  draft: AuthDraft,
  sessionLink: StoredSessionLink | null,
): {
  readonly endpoint: "/api/auth/register" | "/api/auth/login";
  readonly body: Record<string, string>;
} {
  if (draft.mode === "register") {
    return {
      endpoint: "/api/auth/register",
      body: {
        email: draft.email.trim(),
        password: draft.password,
        ...(sessionLink
          ? {
              linkSessionId: sessionLink.sessionId,
              linkRole: sessionLink.role,
            }
          : {}),
      },
    };
  }

  return {
    endpoint: "/api/auth/login",
    body: {
      email: draft.email.trim(),
      password: draft.password,
    },
  };
}
