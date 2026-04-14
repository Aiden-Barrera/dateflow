import { describe, expect, it } from "vitest";
import {
  getHistoryFilterLabel,
  getHistoryRoleLabel,
} from "../history-page-state";

describe("history-page-state", () => {
  it("formats the role badge copy for starters and joiners", () => {
    expect(getHistoryRoleLabel("a")).toBe("You started this");
    expect(getHistoryRoleLabel("b")).toBe("You joined this");
  });

  it("formats the filter labels for the segmented control", () => {
    expect(getHistoryFilterLabel(false)).toBe("Matches");
    expect(getHistoryFilterLabel(true)).toBe("All activity");
  });
});
