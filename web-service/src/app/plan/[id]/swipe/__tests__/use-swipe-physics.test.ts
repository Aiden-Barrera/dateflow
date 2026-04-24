import { describe, it, expect } from "vitest";
import {
  isSwipeCommitted,
  getSwipeDirection,
  computeSpringTarget,
  type SwipeDragState,
} from "../use-swipe-physics";

const makeDrag = (overrides: Partial<SwipeDragState> = {}): SwipeDragState => ({
  offsetX: 0,
  offsetY: 0,
  velocityX: 0,
  startRegionY: 0.5,
  intent: "dragging",
  ...overrides,
});

describe("isSwipeCommitted", () => {
  it("commits when offset exceeds threshold", () => {
    expect(isSwipeCommitted(makeDrag({ offsetX: 130 }))).toBe(true);
    expect(isSwipeCommitted(makeDrag({ offsetX: -130 }))).toBe(true);
  });

  it("does not commit below threshold with low velocity", () => {
    expect(isSwipeCommitted(makeDrag({ offsetX: 50, velocityX: 0.1 }))).toBe(false);
  });

  it("commits with high velocity + minimum offset", () => {
    expect(isSwipeCommitted(makeDrag({ offsetX: 70, velocityX: 0.6 }))).toBe(true);
    expect(isSwipeCommitted(makeDrag({ offsetX: -70, velocityX: -0.6 }))).toBe(true);
  });

  it("does not commit with high velocity but insufficient offset", () => {
    expect(isSwipeCommitted(makeDrag({ offsetX: 30, velocityX: 0.8 }))).toBe(false);
  });

  it("returns false when intent is not dragging", () => {
    expect(isSwipeCommitted(makeDrag({ offsetX: 200, intent: "idle" }))).toBe(false);
    expect(isSwipeCommitted(makeDrag({ offsetX: 200, intent: "scrolling" }))).toBe(false);
  });
});

describe("getSwipeDirection", () => {
  it("returns right for positive offsetX", () => {
    expect(getSwipeDirection(makeDrag({ offsetX: 80 }))).toBe("right");
  });

  it("returns left for negative offsetX", () => {
    expect(getSwipeDirection(makeDrag({ offsetX: -80 }))).toBe("left");
  });

  it("returns null when not committed", () => {
    expect(getSwipeDirection(makeDrag({ offsetX: 10 }))).toBe(null);
  });
});

describe("computeSpringTarget", () => {
  it("returns zero target when no drag", () => {
    const target = computeSpringTarget(null, null, false);
    expect(target.x).toBe(0);
    expect(target.y).toBe(0);
    expect(target.rotation).toBe(0);
    expect(target.opacity).toBe(1);
  });

  it("returns fly-off target on right swipe animation", () => {
    const target = computeSpringTarget(null, { direction: "right", offsetX: 60, offsetY: 0, velocityX: 0.4 }, false);
    expect(target.x).toBeGreaterThan(400);
    expect(target.rotation).toBeGreaterThan(0);
    expect(target.opacity).toBeLessThan(1);
  });

  it("returns fly-off target on left swipe animation", () => {
    const target = computeSpringTarget(null, { direction: "left", offsetX: -60, offsetY: 0, velocityX: -0.4 }, false);
    expect(target.x).toBeLessThan(-400);
    expect(target.rotation).toBeLessThan(0);
    expect(target.opacity).toBeLessThan(1);
  });

  it("tracks drag offset while dragging", () => {
    const drag = makeDrag({ offsetX: 80, offsetY: 10, velocityX: 0.2 });
    const target = computeSpringTarget(drag, null, false);
    expect(target.x).toBe(80);
    expect(target.opacity).toBe(1);
  });

  it("applies reduced rotation when prefersReducedMotion", () => {
    const drag = makeDrag({ offsetX: 80 });
    const normal = computeSpringTarget(drag, null, false);
    const reduced = computeSpringTarget(drag, null, true);
    expect(Math.abs(reduced.rotation)).toBeLessThanOrEqual(Math.abs(normal.rotation));
  });
});
