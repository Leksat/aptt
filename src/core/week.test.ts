import { describe, expect, it } from "vitest";
import { currentWeekRange } from "./week";

describe("currentWeekRange", () => {
  it("returns Monday..Sunday for a midweek day", () => {
    const { from, to } = currentWeekRange(new Date("2026-07-03T14:00:00"));
    expect(from).toEqual(new Date("2026-06-29T00:00:00"));
    expect(to).toEqual(new Date("2026-07-05T00:00:00"));
  });

  it("treats Monday as the first day of the week", () => {
    const { from, to } = currentWeekRange(new Date("2026-06-29T09:00:00"));
    expect(from).toEqual(new Date("2026-06-29T00:00:00"));
    expect(to).toEqual(new Date("2026-07-05T00:00:00"));
  });

  it("treats Sunday as the last day of the same week", () => {
    const { from, to } = currentWeekRange(new Date("2026-07-05T23:00:00"));
    expect(from).toEqual(new Date("2026-06-29T00:00:00"));
    expect(to).toEqual(new Date("2026-07-05T00:00:00"));
  });
});
