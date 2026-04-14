import { describe, expect, it, vi } from "vitest";
import {
  clearStoredAccountSummary,
  clearStoredAuthToken,
  getStoredAccountSummary,
  getStoredAuthToken,
  setStoredAccountSummary,
  setStoredAuthToken,
} from "../auth-token-storage";

describe("auth-token-storage", () => {
  it("stores the auth token for later history requests", () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    setStoredAuthToken(storage, "token-123");

    expect(storage.setItem).toHaveBeenCalledWith("dateflow:auth-token", "token-123");
  });

  it("reads the auth token back from storage", () => {
    const storage = {
      getItem: vi.fn(() => "token-123"),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    expect(getStoredAuthToken(storage)).toBe("token-123");
  });

  it("clears the stored auth token", () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    clearStoredAuthToken(storage);

    expect(storage.removeItem).toHaveBeenCalledWith("dateflow:auth-token");
  });

  it("stores and reads the signed-in account summary", () => {
    const storage = {
      getItem: vi.fn(() =>
        JSON.stringify({
          email: "alex@example.com",
        }),
      ),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    setStoredAccountSummary(storage, {
      email: "alex@example.com",
    });

    expect(storage.setItem).toHaveBeenCalledWith(
      "dateflow:account-summary",
      JSON.stringify({ email: "alex@example.com" }),
    );
    expect(getStoredAccountSummary(storage)).toEqual({
      email: "alex@example.com",
    });
  });

  it("clears the stored account summary", () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    clearStoredAccountSummary(storage);

    expect(storage.removeItem).toHaveBeenCalledWith("dateflow:account-summary");
  });
});
