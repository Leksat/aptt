import { Either } from "effect";
import { describe, expect, it } from "vitest";
import {
  type Config,
  defaultConfig,
  parseConfig,
  settingsFor,
  withActivePluginId,
  withSetting,
  withThemeMode,
} from "./config";

describe("defaultConfig", () => {
  it("uses the default plugin, empty settings map, and system theme", () => {
    expect(defaultConfig).toEqual({
      activePluginId: "jiratempo",
      pluginSettings: {},
      themeMode: "system",
    });
  });
});

describe("withThemeMode", () => {
  it("replaces the theme without touching anything else", () => {
    expect(withThemeMode(defaultConfig, "dark")).toEqual({ ...defaultConfig, themeMode: "dark" });
  });
});

const cfgWith = (pluginSettings: Config["pluginSettings"]): Config => ({
  ...defaultConfig,
  pluginSettings,
});

describe("settingsFor", () => {
  it("returns the stored map for a plugin", () => {
    expect(settingsFor(cfgWith({ jiratempo: { siteName: "X" } }), "jiratempo")).toEqual({
      siteName: "X",
    });
  });

  it("returns empty for an unknown plugin id", () => {
    expect(settingsFor(defaultConfig, "other")).toEqual({});
  });
});

describe("withActivePluginId", () => {
  it("replaces the active id without touching settings", () => {
    const cfg = cfgWith({ jiratempo: { siteName: "X" } });
    expect(withActivePluginId(cfg, "other")).toEqual({ ...cfg, activePluginId: "other" });
  });
});

describe("withSetting", () => {
  it("creates the plugin entry when missing", () => {
    expect(withSetting(defaultConfig, "jiratempo", "siteName", "X").pluginSettings).toEqual({
      jiratempo: { siteName: "X" },
    });
  });

  it("merges into an existing plugin entry", () => {
    const cfg = cfgWith({ jiratempo: { siteName: "X" } });
    expect(withSetting(cfg, "jiratempo", "email", "e@x").pluginSettings).toEqual({
      jiratempo: { siteName: "X", email: "e@x" },
    });
  });

  it("does not affect other plugins' settings", () => {
    const cfg = cfgWith({ jiratempo: { siteName: "X" } });
    expect(withSetting(cfg, "other", "k", "v").pluginSettings).toEqual({
      jiratempo: { siteName: "X" },
      other: { k: "v" },
    });
  });
});

describe("parseConfig", () => {
  it("decodes a valid object and defaults themeMode to 'system'", () => {
    const result = parseConfig({
      activePluginId: "jiratempo",
      pluginSettings: { jiratempo: { siteName: "X" } },
    });
    expect(Either.isRight(result) && result.right.themeMode).toBe("system");
  });

  it("decodes a stored themeMode", () => {
    const result = parseConfig({
      activePluginId: "jiratempo",
      pluginSettings: {},
      themeMode: "dark",
    });
    expect(Either.isRight(result) && result.right.themeMode).toBe("dark");
  });

  it("rejects when activePluginId is missing", () => {
    expect(Either.isLeft(parseConfig({ pluginSettings: {} }))).toBe(true);
  });

  it("rejects an unknown themeMode", () => {
    const result = parseConfig({
      activePluginId: "jiratempo",
      pluginSettings: {},
      themeMode: "neon",
    });
    expect(Either.isLeft(result)).toBe(true);
  });

  it("rejects non-string setting values", () => {
    const result = parseConfig({
      activePluginId: "jiratempo",
      pluginSettings: { jiratempo: { siteName: 42 } },
    });
    expect(Either.isLeft(result)).toBe(true);
  });
});
