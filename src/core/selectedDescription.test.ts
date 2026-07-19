import dedent from "dedent";
import { describe, expect, it } from "vitest";
import {
  selectedDescriptionFromNotes,
  selectedDescriptionFromTimeLog,
} from "./selectedDescription";

const acceptABC = (token: string): string | null => (/^ABC-\d+$/.test(token) ? token : null);
const acceptNone = (): string | null => null;

describe("selectedDescriptionFromTimeLog", () => {
  it("returns the trimmed description when caret sits on a description line", () => {
    const text = dedent`
      2026-01-01 10:00
      ABC-1 working
      2026-01-01 11:00
      ABC-2 reviewing
    `;
    const caret = text.indexOf("ABC-1") + 2;
    expect(selectedDescriptionFromTimeLog(text, caret)).toBe("ABC-1 working");
  });

  it("returns null when caret sits on a start line", () => {
    const text = dedent`
      2026-01-01 10:00
      ABC-1 working
    `;
    expect(selectedDescriptionFromTimeLog(text, 5)).toBeNull();
  });

  it("returns null when caret sits on an empty description line", () => {
    const text = dedent`
      2026-01-01 10:00

      2026-01-01 11:00
      ABC-2 hi
    `;
    const caret = text.indexOf("2026-01-01 11:00") - 1;
    expect(selectedDescriptionFromTimeLog(text, caret)).toBeNull();
  });

  it("returns null when description is whitespace-only", () => {
    const text = dedent`
      2026-01-01 10:00
      ${"   "}
      2026-01-01 11:00
      ABC-2 hi
    `;
    const caret = text.indexOf("2026-01-01 11:00") - 2;
    expect(selectedDescriptionFromTimeLog(text, caret)).toBeNull();
  });

  it("trims leading/trailing whitespace from the description", () => {
    const text = dedent`
      2026-01-01 10:00
        ABC-1 working${"  "}
    `;
    expect(selectedDescriptionFromTimeLog(text, text.length)).toBe("ABC-1 working");
  });

  it("treats caret at end of description line as on that line", () => {
    const text = dedent`
      2026-01-01 10:00
      ABC-1 working
      2026-01-01 11:00
      ABC-2 hi
    `;
    const caret = text.indexOf("ABC-1 working") + "ABC-1 working".length;
    expect(selectedDescriptionFromTimeLog(text, caret)).toBe("ABC-1 working");
  });

  it("treats caret at start of next line as on that line", () => {
    const text = dedent`
      2026-01-01 10:00
      ABC-1 working
      2026-01-01 11:00
      ABC-2 hi
    `;
    const caret = text.indexOf("2026-01-01 11:00");
    expect(selectedDescriptionFromTimeLog(text, caret)).toBeNull();
  });

  it("handles caret at the very start of the log", () => {
    const text = dedent`
      2026-01-01 10:00
      ABC-1 working
    `;
    expect(selectedDescriptionFromTimeLog(text, 0)).toBeNull();
  });

  it("returns the active entry's description when caret is on its line", () => {
    const text = dedent`
      2026-01-01 10:00
      ABC-9 active here
    `;
    expect(selectedDescriptionFromTimeLog(text, text.length)).toBe("ABC-9 active here");
  });
});

describe("selectedDescriptionFromNotes", () => {
  it("returns the line when caret sits on a ticket-ID-starting line", () => {
    const text = dedent`
      ABC-1 foo
      ABC-2 bar
    `;
    expect(selectedDescriptionFromNotes(text, 3, acceptABC)).toBe("ABC-1 foo");
  });

  it("returns null when first token is not a ticket ID", () => {
    expect(selectedDescriptionFromNotes("todo: ABC-1 foo", 0, acceptABC)).toBeNull();
  });

  it("strips everything from the first `#` regardless of surrounding whitespace", () => {
    expect(selectedDescriptionFromNotes("ABC-1 foo # bar # baz", 0, acceptABC)).toBe("ABC-1 foo");
  });

  it("strips `#` even without surrounding whitespace", () => {
    expect(selectedDescriptionFromNotes("ABC-1 foo#bar", 0, acceptABC)).toBe("ABC-1 foo");
  });

  it("allows a bare ticket ID after stripping the comment", () => {
    expect(selectedDescriptionFromNotes("ABC-1 # only a comment", 0, acceptABC)).toBe("ABC-1");
  });

  it("ignores leading whitespace when checking the first token", () => {
    expect(selectedDescriptionFromNotes("   ABC-1 foo", 0, acceptABC)).toBe("ABC-1 foo");
  });

  it("returns null on an empty line", () => {
    const text = dedent`
      ABC-1 foo

      ABC-2 bar
    `;
    const caret = text.indexOf("ABC-2") - 1;
    expect(selectedDescriptionFromNotes(text, caret, acceptABC)).toBeNull();
  });

  it("returns null when findTicketId rejects everything", () => {
    expect(selectedDescriptionFromNotes("ABC-1 foo", 0, acceptNone)).toBeNull();
  });

  it("uses the line containing the caret, not the first line", () => {
    const text = dedent`
      notes about today
      ABC-2 the real one
    `;
    const caret = text.indexOf("ABC-2") + 2;
    expect(selectedDescriptionFromNotes(text, caret, acceptABC)).toBe("ABC-2 the real one");
  });

  it("treats caret at start of next line as on that line", () => {
    const text = dedent`
      ABC-1 first
      ABC-2 second
    `;
    const caret = text.indexOf("ABC-2");
    expect(selectedDescriptionFromNotes(text, caret, acceptABC)).toBe("ABC-2 second");
  });

  it("returns null when the line is only a `#` comment", () => {
    expect(selectedDescriptionFromNotes("# just a comment", 0, acceptABC)).toBeNull();
  });
});
