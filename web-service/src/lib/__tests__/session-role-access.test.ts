import { afterEach, describe, expect, it } from "vitest";
import {
  buildSessionRoleCookieValue,
  getBoundSessionRole,
} from "../session-role-access";

const originalNodeEnv = process.env.NODE_ENV;
const originalCookieSecret = process.env.SESSION_ROLE_COOKIE_SECRET;

describe("session-role-access", () => {
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.SESSION_ROLE_COOKIE_SECRET = originalCookieSecret;
  });

  it("adds Secure to the role cookie in production", () => {
    process.env.NODE_ENV = "production";
    process.env.SESSION_ROLE_COOKIE_SECRET = "test-secret";

    expect(
      buildSessionRoleCookieValue("session-1", "a"),
    ).toContain("; Secure");
  });

  it("omits Secure from the role cookie outside production", () => {
    process.env.NODE_ENV = "test";
    process.env.SESSION_ROLE_COOKIE_SECRET = "test-secret";

    expect(
      buildSessionRoleCookieValue("session-1", "a"),
    ).not.toContain("; Secure");
  });

  it("returns the bound role when the cookie signature is valid", () => {
    process.env.SESSION_ROLE_COOKIE_SECRET = "test-secret";

    const cookie = buildSessionRoleCookieValue("session-1", "a");
    const value = cookie.split(";")[0]?.split("=")[1];

    expect(getBoundSessionRole("session-1", value)).toBe("a");
  });

  it("rejects tampered cookie values", () => {
    process.env.SESSION_ROLE_COOKIE_SECRET = "test-secret";

    const cookie = buildSessionRoleCookieValue("session-1", "a");
    const signedValue = cookie.split(";")[0]?.split("=")[1];
    const tamperedValue = signedValue?.replace(/^a\./, "b.");

    expect(getBoundSessionRole("session-1", tamperedValue)).toBeNull();
  });
});
