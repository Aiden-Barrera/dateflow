import { describe, expect, it, vi } from "vitest";
import {
  DATEFLOW_SESSION_LINK_KEY,
  clearStoredSessionLink,
  loadStoredSessionLink,
  persistSessionLink,
} from "../session-link-storage";

describe("session-link-storage", () => {
  it("writes the latest session link payload into localStorage", () => {
    const storage = {
      setItem: vi.fn(),
      getItem: vi.fn(),
      removeItem: vi.fn(),
    };

    persistSessionLink(storage, {
      sessionId: "session-1",
      role: "b",
    });

    expect(storage.setItem).toHaveBeenCalledWith(
      DATEFLOW_SESSION_LINK_KEY,
      JSON.stringify({
        sessionId: "session-1",
        role: "b",
      }),
    );
  });

  it("reads a valid stored payload back out of localStorage", () => {
    const storage = {
      setItem: vi.fn(),
      getItem: vi.fn(() =>
        JSON.stringify({
          sessionId: "session-1",
          role: "a",
        }),
      ),
      removeItem: vi.fn(),
    };

    expect(loadStoredSessionLink(storage)).toEqual({
      sessionId: "session-1",
      role: "a",
    });
  });

  it("drops malformed stored data instead of throwing", () => {
    const storage = {
      setItem: vi.fn(),
      getItem: vi.fn(() => "{bad json"),
      removeItem: vi.fn(),
    };

    expect(loadStoredSessionLink(storage)).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(DATEFLOW_SESSION_LINK_KEY);
  });

  it("clears the stored session link explicitly after a successful account save", () => {
    const storage = {
      setItem: vi.fn(),
      getItem: vi.fn(),
      removeItem: vi.fn(),
    };

    clearStoredSessionLink(storage);

    expect(storage.removeItem).toHaveBeenCalledWith(DATEFLOW_SESSION_LINK_KEY);
  });
});
