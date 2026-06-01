import { describe, expect, it } from "vitest";
import { defaultPlugin, pluginById } from "./registry";

describe("pluginById", () => {
  it("returns the matching plugin when the id is known", () => {
    expect(pluginById("echo").id).toBe("echo");
    expect(pluginById("void").id).toBe("void");
  });

  it("falls back to the default plugin when the id is unknown", () => {
    expect(pluginById("nope").id).toBe(defaultPlugin.id);
  });
});
