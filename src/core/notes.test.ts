import { describe, expect, it } from "vitest";
import { commentStart } from "./notes";

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
