import { describe, expect, it } from "vitest";
import { findLinks } from "./notes";
import { findTicketRefs, firstTicketRef } from "./ticketRef";

const findTicketId = (text: string): string | null =>
  text.match(/\b[A-Z][A-Z0-9]+-\d+\b/)?.[0] ?? null;

describe("firstTicketRef", () => {
  it("marks the first token when it is a ticket id", () => {
    expect(firstTicketRef("ABC-123 fix login", findTicketId)).toEqual({
      from: 0,
      to: 7,
      ticketId: "ABC-123",
    });
  });

  it("respects leading whitespace", () => {
    expect(firstTicketRef("  DEF-4 note", findTicketId)).toEqual({
      from: 2,
      to: 7,
      ticketId: "DEF-4",
    });
  });

  it("trims surrounding punctuation of the first token", () => {
    expect(firstTicketRef("(ABC-1), later", findTicketId)).toEqual({
      from: 1,
      to: 6,
      ticketId: "ABC-1",
    });
  });

  it("returns null when the first token is not a ticket id", () => {
    expect(firstTicketRef("fix ABC-1 later", findTicketId)).toBeNull();
    expect(firstTicketRef("   ", findTicketId)).toBeNull();
  });
});

describe("findTicketRefs", () => {
  it("finds every ticket id in the text", () => {
    const text = "see ABC-1 and DEF-22 too";
    expect(findTicketRefs(text, findTicketId, [])).toEqual([
      { from: 4, to: 9, ticketId: "ABC-1" },
      { from: 14, to: 20, ticketId: "DEF-22" },
    ]);
  });

  it("locates the ticket id precisely inside a punctuated token", () => {
    const text = "dup of DEF-456.";
    expect(findTicketRefs(text, findTicketId, [])).toEqual([
      { from: 7, to: 14, ticketId: "DEF-456" },
    ]);
  });

  it("excludes ticket ids inside urls", () => {
    const text = "https://acme.atlassian.net/browse/ABC-123 and DEF-4";
    const refs = findTicketRefs(text, findTicketId, findLinks(text));
    expect(refs).toEqual([{ from: 46, to: 51, ticketId: "DEF-4" }]);
  });
});
