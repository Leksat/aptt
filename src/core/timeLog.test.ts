import dedent from "dedent";
import { Either } from "effect";
import { describe, expect, it } from "vitest";
import { appendNewStart, formatTimeLog, parseTimeLog } from "./timeLog";

describe("parseTimeLog", () => {
  it("accepts an empty log", () => {
    expect(parseTimeLog("")).toMatchInlineSnapshot(`
      {
        "_id": "Either",
        "_tag": "Right",
        "right": {
          "active": null,
          "closed": [],
        },
      }
    `);
  });

  it("treats a lone trailing start as active with an empty description", () => {
    expect(parseTimeLog("2026-01-01 10:00")).toMatchInlineSnapshot(`
      {
        "_id": "Either",
        "_tag": "Right",
        "right": {
          "active": {
            "description": "",
            "start": 2026-01-01T10:00:00.000Z,
          },
          "closed": [],
        },
      }
    `);
  });

  it("treats a start + description as the active entry (even lines)", () => {
    const log = dedent`
      2026-01-01 10:00
      ABC-123 hi
    `;
    expect(parseTimeLog(log)).toMatchInlineSnapshot(`
      {
        "_id": "Either",
        "_tag": "Right",
        "right": {
          "active": {
            "description": "ABC-123 hi",
            "start": 2026-01-01T10:00:00.000Z,
          },
          "closed": [],
        },
      }
    `);
  });

  it("closes the previous entry and opens an empty active when a trailing start is added", () => {
    const log = dedent`
      2026-01-01 10:00
      ABC-123 hi
      2026-01-01 11:30
    `;
    expect(parseTimeLog(log)).toMatchInlineSnapshot(`
      {
        "_id": "Either",
        "_tag": "Right",
        "right": {
          "active": {
            "description": "",
            "start": 2026-01-01T11:30:00.000Z,
          },
          "closed": [
            {
              "description": "ABC-123 hi",
              "end": 2026-01-01T11:30:00.000Z,
              "start": 2026-01-01T10:00:00.000Z,
            },
          ],
        },
      }
    `);
  });

  it("chains multiple entries, with the last being active on even lines", () => {
    const log = dedent`
      2026-01-01 10:00
      first
      2026-01-01 11:00
      second
    `;
    expect(parseTimeLog(log)).toMatchInlineSnapshot(`
      {
        "_id": "Either",
        "_tag": "Right",
        "right": {
          "active": {
            "description": "second",
            "start": 2026-01-01T11:00:00.000Z,
          },
          "closed": [
            {
              "description": "first",
              "end": 2026-01-01T11:00:00.000Z,
              "start": 2026-01-01T10:00:00.000Z,
            },
          ],
        },
      }
    `);
  });

  it("parses two closed entries followed by an active entry", () => {
    const log = dedent`
      2026-01-01 10:00
      first
      2026-01-01 11:00
      second
      2026-01-01 12:00
      third
    `;
    expect(parseTimeLog(log)).toMatchInlineSnapshot(`
      {
        "_id": "Either",
        "_tag": "Right",
        "right": {
          "active": {
            "description": "third",
            "start": 2026-01-01T12:00:00.000Z,
          },
          "closed": [
            {
              "description": "first",
              "end": 2026-01-01T11:00:00.000Z,
              "start": 2026-01-01T10:00:00.000Z,
            },
            {
              "description": "second",
              "end": 2026-01-01T12:00:00.000Z,
              "start": 2026-01-01T11:00:00.000Z,
            },
          ],
        },
      }
    `);
  });

  it("accepts an empty description", () => {
    expect(parseTimeLog("2026-01-01 10:00\n")).toMatchInlineSnapshot(`
      {
        "_id": "Either",
        "_tag": "Right",
        "right": {
          "active": {
            "description": "",
            "start": 2026-01-01T10:00:00.000Z,
          },
          "closed": [],
        },
      }
    `);
  });

  it("trims leading and trailing whitespace on starts and descriptions", () => {
    const log = ["  2026-01-01 10:00  ", "\tABC-123 hello  ", "   2026-01-01 11:00\t"].join("\n");
    expect(parseTimeLog(log)).toMatchInlineSnapshot(`
      {
        "_id": "Either",
        "_tag": "Right",
        "right": {
          "active": {
            "description": "",
            "start": 2026-01-01T11:00:00.000Z,
          },
          "closed": [
            {
              "description": "ABC-123 hello",
              "end": 2026-01-01T11:00:00.000Z,
              "start": 2026-01-01T10:00:00.000Z,
            },
          ],
        },
      }
    `);
  });

  it("rejects a start earlier than the previous start", () => {
    const log = dedent`
      2026-01-01 11:00
      foo
      2026-01-01 10:00
    `;
    expect(parseTimeLog(log)).toMatchInlineSnapshot(`
      {
        "_id": "Either",
        "_tag": "Left",
        "left": {
          "line": 3,
          "message": "Negative duration is not allowed",
        },
      }
    `);
  });

  it("rejects a start equal to the previous start (zero duration)", () => {
    const log = dedent`
      2026-01-01 10:00
      foo
      2026-01-01 10:00
    `;
    expect(parseTimeLog(log)).toMatchInlineSnapshot(`
      {
        "_id": "Either",
        "_tag": "Left",
        "left": {
          "line": 3,
          "message": "Zero duration is not allowed",
        },
      }
    `);
  });

  it("treats an even-position line that looks like a timestamp as a description", () => {
    const log = dedent`
      2026-01-01 10:00
      2026-01-01 11:00
    `;
    expect(parseTimeLog(log)).toMatchInlineSnapshot(`
      {
        "_id": "Either",
        "_tag": "Right",
        "right": {
          "active": {
            "description": "2026-01-01 11:00",
            "start": 2026-01-01T10:00:00.000Z,
          },
          "closed": [],
        },
      }
    `);
  });

  it("rejects a malformed start on line 1", () => {
    expect(parseTimeLog("nope")).toMatchInlineSnapshot(`
      {
        "_id": "Either",
        "_tag": "Left",
        "left": {
          "line": 1,
          "message": "Expected a time entry start in format YYYY-MM-DD HH:MM, got: nope",
        },
      }
    `);
  });

  it("rejects a malformed start on a later odd line and reports its line number", () => {
    const log = dedent`
      2026-01-01 10:00
      first
      bad
    `;
    expect(parseTimeLog(log)).toMatchInlineSnapshot(`
      {
        "_id": "Either",
        "_tag": "Left",
        "left": {
          "line": 3,
          "message": "Expected a time entry start in format YYYY-MM-DD HH:MM, got: bad",
        },
      }
    `);
  });

  it("rejects an invalid calendar date", () => {
    expect(parseTimeLog("2026-02-30 10:00")).toMatchInlineSnapshot(`
      {
        "_id": "Either",
        "_tag": "Left",
        "left": {
          "line": 1,
          "message": "2026-02-30 is not a real date",
        },
      }
    `);
  });

  it("rejects single-digit hour (missing leading zero)", () => {
    expect(parseTimeLog("2026-01-01 9:00")).toMatchInlineSnapshot(`
      {
        "_id": "Either",
        "_tag": "Left",
        "left": {
          "line": 1,
          "message": "Expected a time entry start in format YYYY-MM-DD HH:MM, got: 2026-01-01 9:00",
        },
      }
    `);
  });

  it("rejects single-digit minute (missing leading zero)", () => {
    expect(parseTimeLog("2026-01-01 09:0")).toMatchInlineSnapshot(`
      {
        "_id": "Either",
        "_tag": "Left",
        "left": {
          "line": 1,
          "message": "Expected a time entry start in format YYYY-MM-DD HH:MM, got: 2026-01-01 09:0",
        },
      }
    `);
  });

  it("rejects an out-of-range hour", () => {
    expect(parseTimeLog("2026-01-01 24:00")).toMatchInlineSnapshot(`
      {
        "_id": "Either",
        "_tag": "Left",
        "left": {
          "line": 1,
          "message": "Hour must be 00-23, got 24",
        },
      }
    `);
  });

  it("rejects an out-of-range minute", () => {
    expect(parseTimeLog("2026-01-01 10:60")).toMatchInlineSnapshot(`
      {
        "_id": "Either",
        "_tag": "Left",
        "left": {
          "line": 1,
          "message": "Minute must be 00-59, got 60",
        },
      }
    `);
  });
});

describe("appendNewStart", () => {
  it("opens an active entry on an empty log", () => {
    const log = Either.getOrThrow(parseTimeLog(""));
    const next = appendNewStart(log, new Date(2026, 0, 1, 10, 0, 30));
    expect(formatTimeLog(next)).toMatchInlineSnapshot(`
      "2026-01-01 10:00
      "
    `);
  });

  it("closes the previous active entry and opens a new empty one", () => {
    const log = Either.getOrThrow(
      parseTimeLog(dedent`
        2026-01-01 10:00
        ABC-123 hi
      `),
    );
    const next = appendNewStart(log, new Date(2026, 0, 1, 11, 30, 0));
    expect(formatTimeLog(next)).toMatchInlineSnapshot(`
      "2026-01-01 10:00
      ABC-123 hi
      2026-01-01 11:30
      "
    `);
  });

  it("floors now to the minute", () => {
    const log = Either.getOrThrow(parseTimeLog(""));
    const next = appendNewStart(log, new Date(2026, 0, 1, 10, 0, 59, 999));
    expect(formatTimeLog(next)).toMatchInlineSnapshot(`
      "2026-01-01 10:00
      "
    `);
  });

  it("is a no-op when now floored equals the active entry's start", () => {
    const log = Either.getOrThrow(parseTimeLog("2026-01-01 10:00"));
    const next = appendNewStart(log, new Date(2026, 0, 1, 10, 0, 45));
    expect(next).toBe(log);
  });

  it("preserves an empty active description when closing", () => {
    const log = Either.getOrThrow(parseTimeLog("2026-01-01 10:00"));
    const next = appendNewStart(log, new Date(2026, 0, 1, 10, 30, 0));
    expect(formatTimeLog(next)).toMatchInlineSnapshot(`
      "2026-01-01 10:00

      2026-01-01 10:30
      "
    `);
  });
});

describe("formatTimeLog", () => {
  it("formats an empty log as an empty string", () => {
    expect(formatTimeLog({ closed: [], active: null })).toMatchInlineSnapshot(`""`);
  });

  it("formats an active entry with an empty description as a trailing newline", () => {
    expect(
      formatTimeLog(Either.getOrThrow(parseTimeLog("2026-01-01 10:00"))),
    ).toMatchInlineSnapshot(`
      "2026-01-01 10:00
      "
    `);
  });

  it("formats an active entry with a description without a trailing newline", () => {
    const log = Either.getOrThrow(
      parseTimeLog(dedent`
        2026-01-01 10:00
        foo
      `),
    );
    expect(formatTimeLog(log)).toMatchInlineSnapshot(`
      "2026-01-01 10:00
      foo"
    `);
  });

  it("formats two closed entries followed by an active entry", () => {
    const log = Either.getOrThrow(
      parseTimeLog(dedent`
        2026-01-01 10:00
        first
        2026-01-01 11:00
        second
        2026-01-01 12:00
        third
      `),
    );
    expect(formatTimeLog(log)).toMatchInlineSnapshot(`
      "2026-01-01 10:00
      first
      2026-01-01 11:00
      second
      2026-01-01 12:00
      third"
    `);
  });
});
