import dedent from "dedent";
import { Either } from "effect";
import { describe, expect, it } from "vitest";
import { findBlocker } from "./blocker";
import { parseTimeLog } from "./timeLog";

const acceptABC = (token: string): string | null => (/^ABC-\d+$/.test(token) ? token : null);

const parse = (text: string) => Either.getOrThrow(parseTimeLog(text));

describe("findBlocker", () => {
  it("returns null for an empty log", () => {
    expect(findBlocker(parse(""), acceptABC)).toBeNull();
  });

  it("returns null when no entry has a blocker", () => {
    const log = parse(dedent`
      2026-01-01 10:00
      ABC-1 work
      2026-01-01 10:30
      nothing
      2026-01-01 11:00
    `);
    expect(findBlocker(log, acceptABC)).toBeNull();
  });

  it("finds a blocker at the start of the description", () => {
    const log = parse(dedent`
      2026-01-01 10:00
      ! pending
      2026-01-01 11:00
    `);
    expect(findBlocker(log, acceptABC)).toEqual({ line: 2 });
  });

  it("finds a blocker after the target id", () => {
    const log = parse(dedent`
      2026-01-01 10:00
      ABC-1 ! pending
      2026-01-01 11:00
    `);
    expect(findBlocker(log, acceptABC)).toEqual({ line: 2 });
  });

  it("treats a lone `!` as a blocker", () => {
    const log = parse(dedent`
      2026-01-01 10:00
      !
      2026-01-01 11:00
    `);
    expect(findBlocker(log, acceptABC)).toEqual({ line: 2 });
  });

  it("treats target id followed by lone `!` as a blocker", () => {
    const log = parse(dedent`
      2026-01-01 10:00
      ABC-1 !
      2026-01-01 11:00
    `);
    expect(findBlocker(log, acceptABC)).toEqual({ line: 2 });
  });

  it("does not flag `!` attached to another token at the start", () => {
    const log = parse(dedent`
      2026-01-01 10:00
      !pending
      2026-01-01 11:00
    `);
    expect(findBlocker(log, acceptABC)).toBeNull();
  });

  it("does not flag `!` attached to another token after the target id", () => {
    const log = parse(dedent`
      2026-01-01 10:00
      ABC-1 !pending
      2026-01-01 11:00
    `);
    expect(findBlocker(log, acceptABC)).toBeNull();
  });

  it("does not flag `!` in the second position when the first token is not a target id", () => {
    const log = parse(dedent`
      2026-01-01 10:00
      xyz ! stuff
      2026-01-01 11:00
    `);
    expect(findBlocker(log, acceptABC)).toBeNull();
  });

  it("does not flag `!` past the second position", () => {
    const log = parse(dedent`
      2026-01-01 10:00
      ABC-1 stuff !
      2026-01-01 11:00
    `);
    expect(findBlocker(log, acceptABC)).toBeNull();
  });

  it("reports the first blocker's line when several entries have blockers", () => {
    const log = parse(dedent`
      2026-01-01 10:00
      ABC-1 work
      2026-01-01 10:30
      ! pending
      2026-01-01 11:00
      ABC-2 ! later
      2026-01-01 11:30
    `);
    expect(findBlocker(log, acceptABC)).toEqual({ line: 4 });
  });

  it("finds a blocker on the active entry when closed entries are clean", () => {
    const log = parse(dedent`
      2026-01-01 10:00
      ABC-1 work
      2026-01-01 10:30
      ABC-2 ! still thinking
    `);
    expect(findBlocker(log, acceptABC)).toEqual({ line: 4 });
  });

  it("ignores an empty active entry description", () => {
    const log = parse(dedent`
      2026-01-01 10:00
      ABC-1 work
      2026-01-01 10:30
    `);
    expect(findBlocker(log, acceptABC)).toBeNull();
  });

  it("treats `!` after a non-target-id first token as harmless when no closed blockers exist", () => {
    const log = parse(dedent`
      2026-01-01 10:00
      nothing
      2026-01-01 11:00
      xyz ! comment
    `);
    expect(findBlocker(log, acceptABC)).toBeNull();
  });
});
