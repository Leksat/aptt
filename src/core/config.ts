import { Schema } from "effect";
import { defaultPlugin } from "./services/submitters/registry";

export const ThemeModeSchema = Schema.Literal("system", "light", "dark");
export type ThemeMode = typeof ThemeModeSchema.Type;

export const ConfigSchema = Schema.Struct({
  activePluginId: Schema.String,
  pluginSettings: Schema.Record({
    key: Schema.String,
    value: Schema.Record({ key: Schema.String, value: Schema.String }),
  }),
  themeMode: Schema.optionalWith(ThemeModeSchema, { default: () => "system" as const }),
});

export type Config = typeof ConfigSchema.Type;

export const defaultConfig: Config = {
  activePluginId: defaultPlugin.id,
  pluginSettings: {},
  themeMode: "system",
};

export const parseConfig = Schema.decodeUnknownEither(ConfigSchema);
export const encodeConfig = Schema.encodeSync(ConfigSchema);

export const settingsFor = (config: Config, pluginId: string): Readonly<Record<string, string>> =>
  config.pluginSettings[pluginId] ?? {};

export const withActivePluginId = (config: Config, pluginId: string): Config => ({
  ...config,
  activePluginId: pluginId,
});

export const withThemeMode = (config: Config, themeMode: ThemeMode): Config => ({
  ...config,
  themeMode,
});

export const withSetting = (
  config: Config,
  pluginId: string,
  key: string,
  value: string,
): Config => ({
  ...config,
  pluginSettings: {
    ...config.pluginSettings,
    [pluginId]: {
      ...(config.pluginSettings[pluginId] ?? {}),
      [key]: value,
    },
  },
});
