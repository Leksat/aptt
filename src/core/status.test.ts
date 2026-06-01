import dedent from "dedent";
import { describe, expect, it } from "vitest";
import type { ParseTargetId } from "./billable";
import { statusOf } from "./status";
import type { SubmitState } from "./submit";

const acceptABC: ParseTargetId = (token) => (/^ABC-\d+$/.test(token) ? token : null);
const NOW = new Date("2026-01-01T12:00");

describe("statusOf", () => {
  it("returns submitting when submit is in flight", () => {
    const state: SubmitState = { tag: "submitting", current: 2, total: 5 };
    expect(statusOf("ignored", acceptABC, state, NOW)).toEqual({
      tag: "submitting",
      current: 2,
      total: 5,
    });
  });

  it("returns success when last submit succeeded", () => {
    const state: SubmitState = { tag: "success", total: 3 };
    expect(statusOf("ignored", acceptABC, state, NOW)).toEqual({ tag: "success", total: 3 });
  });

  it("returns parseError when the log fails to parse", () => {
    expect(statusOf("not a time entry", acceptABC, { tag: "idle" }, NOW)).toEqual({
      tag: "parseError",
      line: 1,
      message: "Expected a time entry start in format YYYY-MM-DD HH:MM, got: not a time entry",
    });
  });

  it("returns billable minutes total when log parses", () => {
    const log = dedent`
      2026-01-01 10:00
      ABC-1 first
      2026-01-01 11:00
    `;
    expect(statusOf(log, acceptABC, { tag: "idle" }, NOW)).toEqual({
      tag: "billable",
      minutes: 60,
    });
  });

  it("counts the active entry's running time when it is billable", () => {
    const log = dedent`
      2026-01-01 11:00
      ABC-1 in progress
    `;
    expect(statusOf(log, acceptABC, { tag: "idle" }, NOW)).toEqual({
      tag: "billable",
      minutes: 60,
    });
  });

  it("returns zero billable when nothing matches the target id", () => {
    const log = dedent`
      2026-01-01 10:00
      nothing
      2026-01-01 11:00
    `;
    expect(statusOf(log, acceptABC, { tag: "idle" }, NOW)).toEqual({
      tag: "billable",
      minutes: 0,
    });
  });
});
