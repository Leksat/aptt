import dedent from "dedent";
import { Either } from "effect";
import { describe, expect, it } from "vitest";
import {
  activeBillableTicketId,
  closedBillableMinutes,
  formatDurationShort,
  lineDurations,
  parseBillable,
  totalBillableMinutes,
} from "./billable";
import { parseTimeLog } from "./timeLog";

const acceptABC = (token: string): string | null => (/^ABC-\d+$/.test(token) ? token : null);
const acceptNone = (): string | null => null;

describe("parseBillable", () => {
  it("returns null for an empty description", () => {
    expect(parseBillable("", acceptABC)).toBeNull();
  });

  it("returns null for whitespace-only descriptions", () => {
    expect(parseBillable("   \t  ", acceptABC)).toBeNull();
  });

  it("returns null when the first token is not a ticket ID", () => {
    expect(parseBillable("nothing here", acceptABC)).toBeNull();
  });

  it("returns null when the ticket ID appears past the first token", () => {
    expect(parseBillable("foo ABC-123 bar", acceptABC)).toBeNull();
  });

  it("returns null when the backend rejects everything", () => {
    expect(parseBillable("ABC-1 hello", acceptNone)).toBeNull();
  });

  it("returns the ticket ID with an empty tail when the description is just the ticket ID", () => {
    expect(parseBillable("ABC-123", acceptABC)).toEqual({ ticketId: "ABC-123", tail: "" });
  });

  it("returns the ticket ID and the trimmed tail when both are present", () => {
    expect(parseBillable("ABC-123 fix the thing", acceptABC)).toEqual({
      ticketId: "ABC-123",
      tail: "fix the thing",
    });
  });

  it("trims leading and trailing whitespace from the input and the tail", () => {
    expect(parseBillable("   ABC-7   the tail   ", acceptABC)).toEqual({
      ticketId: "ABC-7",
      tail: "the tail",
    });
  });

  it("treats tabs as token separators", () => {
    expect(parseBillable("ABC-9\twith tab", acceptABC)).toEqual({
      ticketId: "ABC-9",
      tail: "with tab",
    });
  });
});

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

  it("treats every entry as non-billable when findTicketId rejects all", () => {
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

  it("treats an entry as non-billable when the ticket ID is not the first token", () => {
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

describe("activeBillableTicketId", () => {
  it("returns null for an empty log", () => {
    const log = Either.getOrThrow(parseTimeLog(""));
    expect(activeBillableTicketId(log, acceptABC)).toBeNull();
  });

  it("returns the ticket ID when the active entry's first token is accepted", () => {
    const log = Either.getOrThrow(
      parseTimeLog(dedent`
        2026-01-01 10:00
        ABC-123 working on it
      `),
    );
    expect(activeBillableTicketId(log, acceptABC)).toBe("ABC-123");
  });

  it("returns null when the active entry has an empty description", () => {
    const log = Either.getOrThrow(
      parseTimeLog(dedent`
        2026-01-01 10:00
      `),
    );
    expect(activeBillableTicketId(log, acceptABC)).toBeNull();
  });

  it("returns null when the first token is not a ticket ID", () => {
    const log = Either.getOrThrow(
      parseTimeLog(dedent`
        2026-01-01 10:00
        nothing
      `),
    );
    expect(activeBillableTicketId(log, acceptABC)).toBeNull();
  });

  it("ignores closed entries", () => {
    const log = Either.getOrThrow(
      parseTimeLog(dedent`
        2026-01-01 10:00
        ABC-1 done
        2026-01-01 11:00
        nothing
      `),
    );
    expect(activeBillableTicketId(log, acceptABC)).toBeNull();
  });

  it("returns null when the ticket ID is not the first token", () => {
    const log = Either.getOrThrow(
      parseTimeLog(dedent`
        2026-01-01 10:00
        foo ABC-123 bar
      `),
    );
    expect(activeBillableTicketId(log, acceptABC)).toBeNull();
  });
});

describe("formatDurationShort", () => {
  it("formats sub-hour as minutes only", () => {
    expect(formatDurationShort(0)).toBe("0m");
    expect(formatDurationShort(30)).toBe("30m");
    expect(formatDurationShort(59)).toBe("59m");
  });

  it("formats one hour or more, dropping the minutes when they are zero", () => {
    expect(formatDurationShort(60)).toBe("1h");
    expect(formatDurationShort(90)).toBe("1h30m");
    expect(formatDurationShort(125)).toBe("2h5m");
  });

  it("formats negative minutes with a leading dash and the same units", () => {
    expect(formatDurationShort(-30)).toBe("-30m");
    expect(formatDurationShort(-60)).toBe("-1h");
    expect(formatDurationShort(-90)).toBe("-1h30m");
  });
});

describe("lineDurations", () => {
  it("returns an empty array for an empty log", () => {
    const log = Either.getOrThrow(parseTimeLog(""));
    expect(lineDurations(log, new Date("2026-01-01T12:00"))).toEqual([]);
  });

  it("emits one entry per closed time entry plus the active one", () => {
    const log = Either.getOrThrow(
      parseTimeLog(dedent`
        2026-01-01 10:00
        ABC-1 first
        2026-01-01 10:30
        nothing
        2026-01-01 11:00
        ABC-2 still going
      `),
    );
    expect(lineDurations(log, new Date("2026-01-01T11:45"))).toEqual([
      { line: 1, minutes: 30 },
      { line: 3, minutes: 30 },
      { line: 5, minutes: 45 },
    ]);
  });

  it("floors the active entry's now to the minute", () => {
    const log = Either.getOrThrow(
      parseTimeLog(dedent`
        2026-01-01 10:00
        ABC-1 hi
      `),
    );
    expect(lineDurations(log, new Date("2026-01-01T10:30:45"))).toEqual([{ line: 1, minutes: 30 }]);
  });

  it("emits a negative duration when the active entry's start is in the future", () => {
    const log = Either.getOrThrow(
      parseTimeLog(dedent`
        2026-01-01 14:00
        ABC-1 future
      `),
    );
    expect(lineDurations(log, new Date("2026-01-01T12:00"))).toEqual([{ line: 1, minutes: -120 }]);
  });
});
