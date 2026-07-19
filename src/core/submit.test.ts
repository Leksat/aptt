import { FetchHttpClient } from "@effect/platform";
import dedent from "dedent";
import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";
import type { FindTicketId } from "./billable";
import { SubmitError } from "./errors";
import type { BillableEntry } from "./services/Backend";
import { type SubmitFn, type SubmitResult, submitTimeLog } from "./submit";
import { formatTimeLog, parseTimeLog } from "./timeLog";

const run = (effect: ReturnType<typeof submitTimeLog>): Promise<SubmitResult> =>
  Effect.runPromise(effect.pipe(Effect.provide(FetchHttpClient.layer)));

const acceptABC: FindTicketId = (token) => (/^ABC-\d+$/.test(token) ? token : null);

const recordingSubmit = (
  decide: (attempt: number, entry: BillableEntry) => "ok" | string,
): { submit: SubmitFn; calls: BillableEntry[] } => {
  const calls: BillableEntry[] = [];
  const submit: SubmitFn = (entry) =>
    Effect.suspend(() => {
      calls.push(entry);
      const verdict = decide(calls.length, entry);
      if (verdict === "ok") return Effect.void;
      return Effect.fail(new SubmitError({ cause: verdict }));
    });
  return { submit, calls };
};

describe("submitTimeLog", () => {
  it("submits every billable closed entry and reports M/M progress", async () => {
    const log = Either.getOrThrow(
      parseTimeLog(dedent`
        2026-01-01 10:00
        ABC-1 first
        2026-01-01 10:30
        ABC-2 second
        2026-01-01 11:00
        ABC-3 third
        2026-01-01 11:30
      `),
    );
    const { submit, calls } = recordingSubmit(() => "ok");
    const progress: { current: number; total: number }[] = [];
    const result = await run(
      submitTimeLog(log, acceptABC, submit, (current, total) => {
        progress.push({ current, total });
      }),
    );
    expect(calls.map((c) => c.ticketId)).toEqual(["ABC-1", "ABC-2", "ABC-3"]);
    expect(progress).toEqual([
      { current: 1, total: 3 },
      { current: 2, total: 3 },
      { current: 3, total: 3 },
    ]);
    expect(result.tag).toBe("ok");
    expect(result.submitted).toBe(3);
    expect(formatTimeLog(result.log)).toMatchInlineSnapshot(`
      "2026-01-01 11:30
      "
    `);
  });

  it("strips non-billable closed entries silently and leaves only the active entry", async () => {
    const log = Either.getOrThrow(
      parseTimeLog(dedent`
        2026-01-01 10:00
        ABC-1 first
        2026-01-01 10:30
        nothing
        2026-01-01 11:00
        ABC-2 second
        2026-01-01 11:30
      `),
    );
    const { submit, calls } = recordingSubmit(() => "ok");
    const progress: { current: number; total: number }[] = [];
    const result = await run(
      submitTimeLog(log, acceptABC, submit, (current, total) => {
        progress.push({ current, total });
      }),
    );
    expect(calls.map((c) => c.ticketId)).toEqual(["ABC-1", "ABC-2"]);
    expect(progress).toEqual([
      { current: 1, total: 2 },
      { current: 2, total: 2 },
    ]);
    expect(formatTimeLog(result.log)).toMatchInlineSnapshot(`
      "2026-01-01 11:30
      "
    `);
  });

  it("strips the ticket id from the description before sending", async () => {
    const log = Either.getOrThrow(
      parseTimeLog(dedent`
        2026-01-01 10:00
        ABC-7 wrote the spec
        2026-01-01 11:00
      `),
    );
    const { submit, calls } = recordingSubmit(() => "ok");
    await run(submitTimeLog(log, acceptABC, submit, () => {}));
    expect(calls).toMatchInlineSnapshot(`
      [
        {
          "description": "wrote the spec",
          "end": 2026-01-01T11:00:00.000Z,
          "start": 2026-01-01T10:00:00.000Z,
          "ticketId": "ABC-7",
        },
      ]
    `);
  });

  it("on the first error keeps the failed entry plus every entry not yet attempted, plus active", async () => {
    const log = Either.getOrThrow(
      parseTimeLog(dedent`
        2026-01-01 10:00
        ABC-1 a
        2026-01-01 10:30
        nothing
        2026-01-01 11:00
        ABC-2 b
        2026-01-01 11:30
        ABC-3 c
        2026-01-01 12:00
        ABC-4 d
        2026-01-01 12:30
        still going
      `),
    );
    const { submit, calls } = recordingSubmit((attempt) => (attempt === 2 ? "boom" : "ok"));
    const result = await run(submitTimeLog(log, acceptABC, submit, () => {}));
    expect(calls.map((c) => c.ticketId)).toEqual(["ABC-1", "ABC-2"]);
    expect(result.tag).toBe("error");
    expect(result.submitted).toBe(1);
    if (result.tag === "error") {
      expect(String(result.error.cause)).toBe("boom");
    }
    expect(formatTimeLog(result.log)).toMatchInlineSnapshot(`
      "2026-01-01 11:00
      ABC-2 b
      2026-01-01 11:30
      ABC-3 c
      2026-01-01 12:00
      ABC-4 d
      2026-01-01 12:30
      still going"
    `);
  });

  it("returns ok with submitted=0 and just the active entry when the log has no billable closed entries", async () => {
    const log = Either.getOrThrow(
      parseTimeLog(dedent`
        2026-01-01 10:00
        nothing
        2026-01-01 11:00
        still nothing
        2026-01-01 11:30
      `),
    );
    const { submit, calls } = recordingSubmit(() => "ok");
    const progress: { current: number; total: number }[] = [];
    const result = await run(
      submitTimeLog(log, acceptABC, submit, (current, total) => {
        progress.push({ current, total });
      }),
    );
    expect(calls).toEqual([]);
    expect(progress).toEqual([]);
    expect(result.tag).toBe("ok");
    expect(result.submitted).toBe(0);
    expect(formatTimeLog(result.log)).toMatchInlineSnapshot(`
      "2026-01-01 11:30
      "
    `);
  });
});
