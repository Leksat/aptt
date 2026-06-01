import dedent from "dedent";
import { Either } from "effect";
import { describe, expect, it } from "vitest";
import { closedBillableMinutes, formatDurationShort, totalBillableMinutes } from "./billable";
import { parseTimeLog } from "./timeLog";

const acceptABC = (token: string): string | null => (/^ABC-\d+$/.test(token) ? token : null);
const acceptNone = (): string | null => null;

describe("totalBillableMinutes", () => {
  it("returns 0 for an empty log", () => {
    const log = Either.getOrThrow(parseTimeLog(""));
    expect(totalBillableMinutes(log, acceptABC, new Date("2026-01-01T12:00"))).toBe(0);
  });

  it("sums closed billable entries and ignores non-billable", () => {
    const log = Either.getOrThrow(
      parseTimeLog(dedent`
        2026-01-01 10:00
        ABC-1 first
        2026-01-01 10:30
        nothing
        2026-01-01 11:00
        ABC-2 second
        2026-01-01 11:45
      `),
    );
    expect(totalBillableMinutes(log, acceptABC, new Date("2026-01-01T12:00"))).toBe(75);
  });

  it("adds the active entry's running time when billable", () => {
    const log = Either.getOrThrow(
      parseTimeLog(dedent`
        2026-01-01 10:00
        ABC-1 hi
      `),
    );
    expect(totalBillableMinutes(log, acceptABC, new Date("2026-01-01T10:30:45"))).toBe(30);
  });

  it("ignores the active entry when not billable", () => {
    const log = Either.getOrThrow(
      parseTimeLog(dedent`
        2026-01-01 10:00
        nothing
      `),
    );
    expect(totalBillableMinutes(log, acceptABC, new Date("2026-01-01T10:30"))).toBe(0);
  });

  it("treats every entry as non-billable when parseTargetId rejects all", () => {
    const log = Either.getOrThrow(
      parseTimeLog(dedent`
        2026-01-01 10:00
        ABC-1 hi
        2026-01-01 11:00
        ABC-2 ho
      `),
    );
    expect(totalBillableMinutes(log, acceptNone, new Date("2026-01-01T12:00"))).toBe(0);
  });

  it("treats an entry as non-billable when the target ID is not the first token", () => {
    const log = Either.getOrThrow(
      parseTimeLog(dedent`
        2026-01-01 10:00
        foo ABC-123 bar
        2026-01-01 11:00
      `),
    );
    expect(totalBillableMinutes(log, acceptABC, new Date("2026-01-01T12:00"))).toBe(0);
  });

  it("clamps active entry to its start when now is before it", () => {
    const log = Either.getOrThrow(
      parseTimeLog(dedent`
        2026-01-01 10:00
        ABC-1 hi
      `),
    );
    expect(totalBillableMinutes(log, acceptABC, new Date("2026-01-01T09:00"))).toBe(0);
  });
});

describe("closedBillableMinutes", () => {
  it("sums only closed billable entries and ignores the active one", () => {
    const log = Either.getOrThrow(
      parseTimeLog(dedent`
        2026-01-01 10:00
        ABC-1 first
        2026-01-01 10:30
        nothing
        2026-01-01 11:00
        ABC-2 second
        2026-01-01 11:45
        ABC-3 still running
      `),
    );
    expect(closedBillableMinutes(log, acceptABC)).toBe(75);
  });

  it("returns 0 for an empty log", () => {
    const log = Either.getOrThrow(parseTimeLog(""));
    expect(closedBillableMinutes(log, acceptABC)).toBe(0);
  });

  it("returns 0 when the only billable entry is the active one", () => {
    const log = Either.getOrThrow(
      parseTimeLog(dedent`
        2026-01-01 10:00
        ABC-1 hi
      `),
    );
    expect(closedBillableMinutes(log, acceptABC)).toBe(0);
  });
});

describe("formatDurationShort", () => {
  it("formats sub-hour as minutes only", () => {
    expect(formatDurationShort(0)).toBe("0m");
    expect(formatDurationShort(30)).toBe("30m");
    expect(formatDurationShort(59)).toBe("59m");
  });

  it("formats one hour or more with both units always present", () => {
    expect(formatDurationShort(60)).toBe("1h0m");
    expect(formatDurationShort(90)).toBe("1h30m");
    expect(formatDurationShort(125)).toBe("2h5m");
  });
});
