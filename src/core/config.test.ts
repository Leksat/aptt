import { Either } from "effect";
import { describe, expect, it } from "vitest";
import { defaultConfig, parseConfig, settingsFor, withActivePluginId, withSetting } from "./config";

describe("defaultConfig", () => {
  it("uses the default plugin and an empty settings map", () => {
    expect(defaultConfig).toEqual({ activePluginId: "jiratempo", pluginSettings: {} });
  });
});

describe("settingsFor", () => {
  it("returns the stored map for a plugin", () => {
    const cfg = { activePluginId: "jiratempo", pluginSettings: { jiratempo: { siteName: "X" } } };
    expect(settingsFor(cfg, "jiratempo")).toEqual({ siteName: "X" });
  });

  it("returns empty for an unknown plugin id", () => {
    expect(settingsFor(defaultConfig, "other")).toEqual({});
  });
});

describe("withActivePluginId", () => {
  it("replaces the active id without touching settings", () => {
    const cfg = { activePluginId: "jiratempo", pluginSettings: { jiratempo: { siteName: "X" } } };
    expect(withActivePluginId(cfg, "other")).toEqual({
      activePluginId: "other",
      pluginSettings: { jiratempo: { siteName: "X" } },
    });
  });
});

describe("withSetting", () => {
  it("creates the plugin entry when missing", () => {
    expect(withSetting(defaultConfig, "jiratempo", "siteName", "X").pluginSettings).toEqual({
      jiratempo: { siteName: "X" },
    });
  });

  it("merges into an existing plugin entry", () => {
    const cfg = { activePluginId: "jiratempo", pluginSettings: { jiratempo: { siteName: "X" } } };
    expect(withSetting(cfg, "jiratempo", "email", "e@x").pluginSettings).toEqual({
      jiratempo: { siteName: "X", email: "e@x" },
    });
  });

  it("does not affect other plugins' settings", () => {
    const cfg = { activePluginId: "jiratempo", pluginSettings: { jiratempo: { siteName: "X" } } };
    expect(withSetting(cfg, "other", "k", "v").pluginSettings).toEqual({
      jiratempo: { siteName: "X" },
      other: { k: "v" },
    });
  });
});

describe("parseConfig", () => {
  it("decodes a valid object", () => {
    const result = parseConfig({
      activePluginId: "jiratempo",
      pluginSettings: { jiratempo: { siteName: "X" } },
    });
    expect(Either.isRight(result)).toBe(true);
  });

  it("rejects when activePluginId is missing", () => {
    expect(Either.isLeft(parseConfig({ pluginSettings: {} }))).toBe(true);
  });

  it("rejects non-string setting values", () => {
    const result = parseConfig({
      activePluginId: "jiratempo",
      pluginSettings: { jiratempo: { siteName: 42 } },
    });
    expect(Either.isLeft(result)).toBe(true);
  });
});
