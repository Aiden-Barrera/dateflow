import { afterEach, describe, expect, it } from "vitest";
import { buildSessionRoleCookieValue } from "../session-role-access";

const originalNodeEnv = process.env.NODE_ENV;

describe("session-role-access", () => {
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("adds Secure to the role cookie in production", () => {
    process.env.NODE_ENV = "production";

    expect(
      buildSessionRoleCookieValue("session-1", "a"),
    ).toContain("; Secure");
  });

  it("omits Secure from the role cookie outside production", () => {
    process.env.NODE_ENV = "test";

    expect(
      buildSessionRoleCookieValue("session-1", "a"),
    ).not.toContain("; Secure");
  });
});
