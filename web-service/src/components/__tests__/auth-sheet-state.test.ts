import { describe, expect, it } from "vitest";
import {
  buildAuthRequest,
  getAuthSheetTitle,
  validateAuthSubmission,
} from "../auth-sheet-state";

describe("auth-sheet-state", () => {
  it("builds a register request with the stored session link", () => {
    expect(
      buildAuthRequest(
        {
          mode: "register",
          email: "alex@example.com",
          password: "supersecret",
        },
        {
          sessionId: "session-1",
          role: "b",
        },
      ),
    ).toEqual({
      endpoint: "/api/auth/register",
      body: {
        email: "alex@example.com",
        password: "supersecret",
        linkSessionId: "session-1",
        linkRole: "b",
      },
    });
  });

  it("builds a login request without the session link payload", () => {
    expect(
      buildAuthRequest(
        {
          mode: "login",
          email: "alex@example.com",
          password: "supersecret",
        },
        {
          sessionId: "session-1",
          role: "a",
        },
      ),
    ).toEqual({
      endpoint: "/api/auth/login",
      body: {
        email: "alex@example.com",
        password: "supersecret",
      },
    });
  });

  it("returns a field error for a bad email before submit", () => {
    expect(
      validateAuthSubmission({
        mode: "register",
        email: "alex",
        password: "supersecret",
      }),
    ).toEqual({
      valid: false,
      error: "Enter a valid email address",
    });
  });

  it("requires eight characters for account creation", () => {
    expect(
      validateAuthSubmission({
        mode: "register",
        email: "alex@example.com",
        password: "short",
      }),
    ).toEqual({
      valid: false,
      error: "Use at least 8 characters",
    });
  });

  it("uses the correct sheet title for each auth mode", () => {
    expect(getAuthSheetTitle("register")).toBe("Save this date");
    expect(getAuthSheetTitle("login")).toBe("Welcome back");
  });
});
