import { describe, expect, it } from "vitest";
import {
  getResultDirectionsHref,
  getResultRevealMode,
} from "../result-screen-state";

const venue = {
  address: "12 Main St, Austin, TX",
};

describe("result-screen-state", () => {
  it("uses Apple Maps for iPhone visitors", () => {
    expect(
      getResultDirectionsHref(
        venue,
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      ),
    ).toBe("https://maps.apple.com/?daddr=12%20Main%20St%2C%20Austin%2C%20TX");
  });

  it("falls back to a simple reveal when reduced motion is preferred", () => {
    expect(getResultRevealMode(true)).toBe("fade");
    expect(getResultRevealMode(false)).toBe("confetti");
  });
});
