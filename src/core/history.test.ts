import dedent from "dedent";
import { Either } from "effect";
import { describe, expect, it } from "vitest";
import { carveHistory, historyFilename } from "./history";
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
