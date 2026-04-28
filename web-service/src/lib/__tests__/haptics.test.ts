import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { triggerHaptic, _resetHapticWarning } from "../haptics";

describe("triggerHaptic", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    _resetHapticWarning();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("calls navigator.vibrate with the given duration when supported", () => {
    const vibrateMock = vi.fn();
    vi.stubGlobal("navigator", { vibrate: vibrateMock });

    triggerHaptic(10);

    expect(vibrateMock).toHaveBeenCalledWith(10);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("logs a console.warn and does not throw when navigator.vibrate is not available", () => {
    vi.stubGlobal("navigator", {});

    expect(() => triggerHaptic(10)).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      "[haptics] navigator.vibrate not supported (iOS or non-vibrating browser)",
    );
  });

  it("only warns once across multiple calls (de-dup)", () => {
    vi.stubGlobal("navigator", {});

    triggerHaptic(10);
    triggerHaptic(10);
    triggerHaptic(10);

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when prefersReducedMotion is true", () => {
    const vibrateMock = vi.fn();
    vi.stubGlobal("navigator", { vibrate: vibrateMock });

    triggerHaptic(10, { prefersReducedMotion: true });

    expect(vibrateMock).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("returns early in SSR context where navigator is undefined", () => {
    vi.stubGlobal("navigator", undefined);

    expect(() => triggerHaptic(10)).not.toThrow();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
