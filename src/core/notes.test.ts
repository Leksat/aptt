import { describe, expect, it } from "vitest";
import { commentStart, findLinks } from "./notes";

describe("commentStart", () => {
  it("returns null when the line has no `#`", () => {
    expect(commentStart("ABC-1 working")).toBeNull();
  });

  it("returns 0 when the line begins with `#`", () => {
    expect(commentStart("# just a comment")).toBe(0);
  });

  it("returns the index of the first `#` in the line", () => {
    expect(commentStart("ABC-1 foo # bar")).toBe(10);
  });

  it("treats `#` attached to a token as a comment start", () => {
    expect(commentStart("ABC-1 foo#bar")).toBe(9);
  });

  it("uses the first `#` when there are several", () => {
    expect(commentStart("ABC-1 ## hi ## bye")).toBe(6);
  });

  it("returns null for an empty line", () => {
    expect(commentStart("")).toBeNull();
  });
});

describe("findLinks", () => {
  it("finds an http and an https url", () => {
    expect(findLinks("go http://a.test and https://b.test")).toEqual([
      { from: 3, to: 16, url: "http://a.test" },
      { from: 21, to: 35, url: "https://b.test" },
    ]);
  });

  it("ignores bare domains and other schemes", () => {
    expect(findLinks("www.a.test mailto:x@a.test file:///tmp/x ftp://a.test")).toEqual([]);
  });

  it("extends a url up to the next whitespace", () => {
    expect(findLinks("https://jira.test/browse/ABC-1?a=b#c end")).toEqual([
      { from: 0, to: 36, url: "https://jira.test/browse/ABC-1?a=b#c" },
    ]);
  });

  it("strips trailing sentence punctuation", () => {
    expect(findLinks("see https://a.test/x.")).toEqual([
      { from: 4, to: 20, url: "https://a.test/x" },
    ]);
    expect(findLinks("a https://a.test/x, b")).toEqual([
      { from: 2, to: 18, url: "https://a.test/x" },
    ]);
  });

  it("drops an unbalanced closing paren but keeps a balanced one", () => {
    expect(findLinks("(https://a.test/x)")).toEqual([{ from: 1, to: 17, url: "https://a.test/x" }]);
    expect(findLinks("https://en.test/wiki/Foo_(bar)")).toEqual([
      { from: 0, to: 30, url: "https://en.test/wiki/Foo_(bar)" },
    ]);
  });

  it("strips a trailing paren then trailing punctuation beyond it", () => {
    expect(findLinks("(see https://a.test/x).")).toEqual([
      { from: 5, to: 21, url: "https://a.test/x" },
    ]);
  });

  it("finds a url inside a comment", () => {
    expect(findLinks("note # https://a.test/x")).toEqual([
      { from: 7, to: 23, url: "https://a.test/x" },
    ]);
  });

  it("does not let a url cross a line boundary", () => {
    expect(findLinks("https://a.test/x\nhttps://b.test/y")).toEqual([
      { from: 0, to: 16, url: "https://a.test/x" },
      { from: 17, to: 33, url: "https://b.test/y" },
    ]);
  });
});
