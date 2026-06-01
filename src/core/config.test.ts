import { Either } from "effect";
import { describe, expect, it } from "vitest";
import { defaultConfig, parseConfig, settingsFor, withActivePluginId, withSetting } from "./config";

describe("defaultConfig", () => {
  it("uses the default plugin and an empty settings map", () => {
    expect(defaultConfig).toEqual({ activePluginId: "void", pluginSettings: {} });
  });
});

describe("settingsFor", () => {
  it("returns the stored map for a plugin", () => {
    const cfg = { activePluginId: "echo", pluginSettings: { echo: { prefix: "X" } } };
    expect(settingsFor(cfg, "echo")).toEqual({ prefix: "X" });
  });

  it("returns empty for an unknown plugin id", () => {
    expect(settingsFor(defaultConfig, "echo")).toEqual({});
  });
});

describe("withActivePluginId", () => {
  it("replaces the active id without touching settings", () => {
    const cfg = { activePluginId: "void", pluginSettings: { echo: { prefix: "X" } } };
    expect(withActivePluginId(cfg, "echo")).toEqual({
      activePluginId: "echo",
      pluginSettings: { echo: { prefix: "X" } },
    });
  });
});

describe("withSetting", () => {
  it("creates the plugin entry when missing", () => {
    expect(withSetting(defaultConfig, "echo", "prefix", "X").pluginSettings).toEqual({
      echo: { prefix: "X" },
    });
  });

  it("merges into an existing plugin entry", () => {
    const cfg = { activePluginId: "echo", pluginSettings: { echo: { prefix: "X" } } };
    expect(withSetting(cfg, "echo", "apiToken", "T").pluginSettings).toEqual({
      echo: { prefix: "X", apiToken: "T" },
    });
  });

  it("does not affect other plugins' settings", () => {
    const cfg = { activePluginId: "void", pluginSettings: { void: { x: "1" } } };
    expect(withSetting(cfg, "echo", "prefix", "X").pluginSettings).toEqual({
      void: { x: "1" },
      echo: { prefix: "X" },
    });
  });
});

describe("parseConfig", () => {
  it("decodes a valid object", () => {
    const result = parseConfig({
      activePluginId: "echo",
      pluginSettings: { echo: { prefix: "X" } },
    });
    expect(Either.isRight(result)).toBe(true);
  });

  it("rejects when activePluginId is missing", () => {
    expect(Either.isLeft(parseConfig({ pluginSettings: {} }))).toBe(true);
  });

  it("rejects non-string setting values", () => {
    const result = parseConfig({
      activePluginId: "echo",
      pluginSettings: { echo: { prefix: 42 } },
    });
    expect(Either.isLeft(result)).toBe(true);
  });
});
