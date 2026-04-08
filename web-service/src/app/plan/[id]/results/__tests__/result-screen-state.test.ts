import { describe, expect, it } from "vitest";
import {
  getResultDirectionsHref,
  getResultRevealMode,
} from "../result-screen-state";

const venue = {
  address: "12 Main St, Austin, TX",
  lat: 30.26,
  lng: -97.74,
};

describe("result-screen-state", () => {
  it("uses Apple Maps for iPhone visitors", () => {
    expect(
      getResultDirectionsHref(
        venue,
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      ),
    ).toBe("https://maps.apple.com/?daddr=30.26,-97.74");
  });

  it("falls back to a simple reveal when reduced motion is preferred", () => {
    expect(getResultRevealMode(true)).toBe("fade");
    expect(getResultRevealMode(false)).toBe("confetti");
  });
});
