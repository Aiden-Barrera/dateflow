import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { triggerHaptic } from "../haptics";

describe("triggerHaptic", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Reset navigator.vibrate between tests
    Object.defineProperty(navigator, "vibrate", {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  it("calls navigator.vibrate with the given duration when supported", () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, "vibrate", {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });

    triggerHaptic(10);

    expect(vibrateMock).toHaveBeenCalledWith(10);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("logs a console.warn and does not throw when navigator.vibrate is not available", () => {
    Object.defineProperty(navigator, "vibrate", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    expect(() => triggerHaptic(10)).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      "[haptics] navigator.vibrate not supported (iOS or non-vibrating browser)",
    );
  });

  it("is a no-op when prefersReducedMotion is true", () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, "vibrate", {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });

    triggerHaptic(10, { prefersReducedMotion: true });

    expect(vibrateMock).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
