import dedent from "dedent";
import { Either } from "effect";
import { describe, expect, it } from "vitest";
import { findAllBlockers, findBlocker } from "./blocker";
import { parseTimeLog } from "./timeLog";

const acceptABC = (token: string): string | null => (/^ABC-\d+$/.test(token) ? token : null);

const parse = (text: string) => Either.getOrThrow(parseTimeLog(text));

describe("findBlocker", () => {
  it("returns null for an empty log", () => {
    expect(findBlocker(parse(""), "", acceptABC)).toBeNull();
  });

  it("returns null when no entry has a blocker", () => {
    const text = dedent`
      2026-01-01 10:00
      ABC-1 work
      2026-01-01 10:30
      nothing
      2026-01-01 11:00
    `;
    expect(findBlocker(parse(text), text, acceptABC)).toBeNull();
  });

  it("finds a blocker at the start of the description", () => {
    const text = dedent`
      2026-01-01 10:00
      ! pending
      2026-01-01 11:00
    `;
    expect(findBlocker(parse(text), text, acceptABC)).toEqual({
      line: 2,
      from: 17,
      to: 18,
    });
  });

  it("finds a blocker after the target id", () => {
    const text = dedent`
      2026-01-01 10:00
      ABC-1 ! pending
      2026-01-01 11:00
    `;
    expect(findBlocker(parse(text), text, acceptABC)).toEqual({
      line: 2,
      from: 23,
      to: 24,
    });
  });

  it("treats a lone `!` as a blocker", () => {
    const text = dedent`
      2026-01-01 10:00
      !
      2026-01-01 11:00
    `;
    expect(findBlocker(parse(text), text, acceptABC)).toEqual({
      line: 2,
      from: 17,
      to: 18,
    });
  });

  it("treats target id followed by lone `!` as a blocker", () => {
    const text = dedent`
      2026-01-01 10:00
      ABC-1 !
      2026-01-01 11:00
    `;
    expect(findBlocker(parse(text), text, acceptABC)).toEqual({
      line: 2,
      from: 23,
      to: 24,
    });
  });

  it("does not flag `!` attached to another token at the start", () => {
    const text = dedent`
      2026-01-01 10:00
      !pending
      2026-01-01 11:00
    `;
    expect(findBlocker(parse(text), text, acceptABC)).toBeNull();
  });

  it("does not flag `!` attached to another token after the target id", () => {
    const text = dedent`
      2026-01-01 10:00
      ABC-1 !pending
      2026-01-01 11:00
    `;
    expect(findBlocker(parse(text), text, acceptABC)).toBeNull();
  });

  it("does not flag `!` in the second position when the first token is not a target id", () => {
    const text = dedent`
      2026-01-01 10:00
      xyz ! stuff
      2026-01-01 11:00
    `;
    expect(findBlocker(parse(text), text, acceptABC)).toBeNull();
  });

  it("does not flag `!` past the second position", () => {
    const text = dedent`
      2026-01-01 10:00
      ABC-1 stuff !
      2026-01-01 11:00
    `;
    expect(findBlocker(parse(text), text, acceptABC)).toBeNull();
  });

  it("reports the first blocker when several entries have blockers", () => {
    const text = dedent`
      2026-01-01 10:00
      ABC-1 work
      2026-01-01 10:30
      ! pending
      2026-01-01 11:00
      ABC-2 ! later
      2026-01-01 11:30
    `;
    const blocker = findBlocker(parse(text), text, acceptABC);
    expect(blocker?.line).toBe(4);
  });

  it("finds a blocker on the active entry when closed entries are clean", () => {
    const text = dedent`
      2026-01-01 10:00
      ABC-1 work
      2026-01-01 10:30
      ABC-2 ! still thinking
    `;
    const blocker = findBlocker(parse(text), text, acceptABC);
    expect(blocker?.line).toBe(4);
  });

  it("ignores an empty active entry description", () => {
    const text = dedent`
      2026-01-01 10:00
      ABC-1 work
      2026-01-01 10:30
    `;
    expect(findBlocker(parse(text), text, acceptABC)).toBeNull();
  });

  it("treats `!` after a non-target-id first token as harmless when no closed blockers exist", () => {
    const text = dedent`
      2026-01-01 10:00
      nothing
      2026-01-01 11:00
      xyz ! comment
    `;
    expect(findBlocker(parse(text), text, acceptABC)).toBeNull();
  });

  it("locates `!` past leading whitespace in the description line", () => {
    const text = "2026-01-01 10:00\n   ! pending\n2026-01-01 11:00";
    expect(findBlocker(parse(text), text, acceptABC)).toEqual({
      line: 2,
      from: 20,
      to: 21,
    });
  });
});

describe("findAllBlockers", () => {
  it("returns every blocker line in order", () => {
    const text = dedent`
      2026-01-01 10:00
      ABC-1 work
      2026-01-01 10:30
      ! pending
      2026-01-01 11:00
      ABC-2 ! later
      2026-01-01 11:30
    `;
    const blockers = findAllBlockers(parse(text), text, acceptABC);
    expect(blockers.map((b) => b.line)).toEqual([4, 6]);
  });

  it("includes the active entry blocker", () => {
    const text = dedent`
      2026-01-01 10:00
      ! one
      2026-01-01 11:00
      ABC-1 ! two
    `;
    const blockers = findAllBlockers(parse(text), text, acceptABC);
    expect(blockers.map((b) => b.line)).toEqual([2, 4]);
  });

  it("returns an empty array for a clean log", () => {
    const text = dedent`
      2026-01-01 10:00
      ABC-1
    `;
    expect(findAllBlockers(parse(text), text, acceptABC)).toEqual([]);
  });
});
