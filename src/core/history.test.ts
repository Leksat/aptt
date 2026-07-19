import dedent from "dedent";
import { Either } from "effect";
import { describe, expect, it } from "vitest";
import { carveHistory, historyFilename, historyTitle, parseHistoryFilename } from "./history";
import type { SubmitFailure, SubmitOk } from "./submit";
import { parseTimeLog } from "./timeLog";

const parse = (text: string) => Either.getOrThrow(parseTimeLog(text));

describe("carveHistory", () => {
  it("returns null when no entries left the live log", () => {
    const log = parse(dedent`
      2026-01-01 10:00
      ABC-1
      2026-01-01 11:00
    `);
    const result: SubmitFailure = {
      tag: "error",
      log,
      submitted: 0,
      // biome-ignore lint/suspicious/noExplicitAny: test-only
      error: {} as any,
    };
    expect(carveHistory(log, result)).toBeNull();
  });

  it("writes history when only non-billable entries were removed (zero submitted)", () => {
    const log = parse(dedent`
      2026-06-01 10:00
      A-1
      2026-06-01 10:30
      nothing
      2026-06-01 11:00
    `);
    const result: SubmitOk = {
      tag: "ok",
      log: { closed: [], active: log.active },
      submitted: 0,
    };
    expect(carveHistory(log, result)).toMatchInlineSnapshot(`
      "2026-06-01 10:00
      A-1
      2026-06-01 10:30
      nothing
      2026-06-01 11:00
      "
    `);
  });

  it("on full success carves every closed entry and ends with the active start", () => {
    const log = parse(dedent`
      2026-06-01 15:25
      QWE-111
      2026-06-01 15:32
      QWE-111
      2026-06-01 23:28
    `);
    const result: SubmitOk = {
      tag: "ok",
      log: { closed: [], active: log.active },
      submitted: 2,
    };
    expect(carveHistory(log, result)).toMatchInlineSnapshot(`
      "2026-06-01 15:25
      QWE-111
      2026-06-01 15:32
      QWE-111
      2026-06-01 23:28
      "
    `);
  });

  it("on full success keeps non-billable entries inside the carved span", () => {
    const log = parse(dedent`
      2026-06-01 10:00
      A-1 foo
      2026-06-01 10:30
      nothing
      2026-06-01 11:00
      B-2 bar
      2026-06-01 12:00
    `);
    const result: SubmitOk = {
      tag: "ok",
      log: { closed: [], active: log.active },
      submitted: 2,
    };
    expect(carveHistory(log, result)).toMatchInlineSnapshot(`
      "2026-06-01 10:00
      A-1 foo
      2026-06-01 10:30
      nothing
      2026-06-01 11:00
      B-2 bar
      2026-06-01 12:00
      "
    `);
  });

  it("on partial failure carves up to the failed entry's start", () => {
    const log = parse(dedent`
      2026-06-01 10:00
      A-1
      2026-06-01 10:30
      nothing
      2026-06-01 11:00
      B-2
      2026-06-01 12:00
      C-3
      2026-06-01 13:00
    `);
    const result: SubmitFailure = {
      tag: "error",
      log: { closed: log.closed.slice(2), active: log.active },
      submitted: 1,
      // biome-ignore lint/suspicious/noExplicitAny: test-only
      error: {} as any,
    };
    expect(carveHistory(log, result)).toMatchInlineSnapshot(`
      "2026-06-01 10:00
      A-1
      2026-06-01 10:30
      nothing
      2026-06-01 11:00
      "
    `);
  });
});

describe("historyFilename", () => {
  it("formats YYYYMMDD-HHMMSS±HHMM.txt in local time", () => {
    const d = new Date("2026-06-01T19:34:53");
    const filename = historyFilename(d);
    expect(filename).toMatch(/^20260601-193453[+-]\d{4}\.txt$/);
  });
});

describe("parseHistoryFilename", () => {
  it("reads the local wall-clock components from a valid filename", () => {
    const d = parseHistoryFilename("20260601-193453+0300.txt");
    expect(d).toEqual(new Date("2026-06-01T19:34:53"));
  });

  it("returns null for non-matching filenames", () => {
    expect(parseHistoryFilename("notes.txt")).toBeNull();
    expect(parseHistoryFilename(".DS_Store")).toBeNull();
    expect(parseHistoryFilename("20260601-1934+0300.txt")).toBeNull();
  });
});

describe("historyTitle", () => {
  const now = new Date("2026-07-19T12:00:00");

  it("labels the same calendar day Today", () => {
    expect(historyTitle(new Date("2026-07-19T14:32:00"), now)).toBe("Today, 2026-07-19 14:32");
  });

  it("labels the previous day Yesterday", () => {
    expect(historyTitle(new Date("2026-07-18T09:05:00"), now)).toBe("Yesterday, 2026-07-18 09:05");
  });

  it("labels 2 to 7 days back as N days ago", () => {
    expect(historyTitle(new Date("2026-07-16T08:00:00"), now)).toBe("3 days ago, 2026-07-16 08:00");
    expect(historyTitle(new Date("2026-07-12T08:00:00"), now)).toBe("7 days ago, 2026-07-12 08:00");
  });

  it("drops the relative part beyond a week", () => {
    expect(historyTitle(new Date("2026-07-10T08:00:00"), now)).toBe("2026-07-10 08:00");
  });
});
